// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { registrarVenta } from "../src/domain/venta";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-004 · US-005. La venta recorrida entera contra la base real (`D-006`).
 */
let dueno: DuenoDePrueba;
const MARCA = `t4-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("venta");
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  const ventas = sql`select id from ${schema.sale} where ${schema.sale.userId} = ${dueno.id}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${ventas})`);
  await db.delete(schema.sale).where(eq(schema.sale.userId, dueno.id));
  await db.delete(schema.product).where(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

/** Productos sembrados por la base: la pantalla del catálogo ya tiene sus propias pruebas. */
async function sembrar(items: { nombre: string; precio: number; existencias: number }[]) {
  const creados = [];
  for (const item of items) {
    const [p] = await db
      .insert(schema.product)
      .values({ name: `${item.nombre} ${MARCA}`, price: item.precio, stock: 0 })
      .returning({ id: schema.product.id, nombre: schema.product.name });
    if (item.existencias !== 0) {
      await db.insert(schema.stockMovement).values({
        productId: p!.id,
        quantity: item.existencias,
        type: "initial",
        userId: dueno.id,
      });
      await db
        .update(schema.product)
        .set({ stock: item.existencias })
        .where(eq(schema.product.id, p!.id));
    }
    creados.push({ ...p!, precio: item.precio });
  }
  return creados;
}

const existenciasDe = async (id: string) => {
  const [p] = await db
    .select({ stock: schema.product.stock })
    .from(schema.product)
    .where(eq(schema.product.id, id));
  return p!.stock;
};

const movimientosDe = (ids: string[]) =>
  db.select().from(schema.stockMovement).where(inArray(schema.stockMovement.productId, ids));

async function tocar(page: Page, id: string, veces = 1) {
  for (let i = 0; i < veces; i++) await page.getByTestId(`casilla-${id}`).click();
}

test("una venta de tres artículos baja las existencias y escribe un movimiento por cada uno", async ({
  page,
}) => {
  const [arroz, pan, leche] = await sembrar([
    { nombre: "Arroz", precio: 3500, existencias: 10 },
    { nombre: "Pan", precio: 500, existencias: 20 },
    { nombre: "Leche", precio: 4200, existencias: 5 },
  ]);

  await entrarComo(page, dueno);
  await tocar(page, arroz!.id, 2);
  await tocar(page, pan!.id);
  await tocar(page, leche!.id);

  // El total se ve mientras se arma, no al final (AC-X01).
  await expect(page.getByTestId("total")).toContainText("11.700");
  await page.getByTestId("confirmar").click();

  // Sin diálogo que cerrar: la pantalla queda lista para la siguiente.
  await expect(page.getByTestId("venta-anterior")).toContainText("11.700");
  await expect(page.getByTestId("total")).toContainText("0");

  expect(await existenciasDe(arroz!.id)).toBe(8);
  expect(await existenciasDe(pan!.id)).toBe(19);
  expect(await existenciasDe(leche!.id)).toBe(4);

  const ids = [arroz!.id, pan!.id, leche!.id];
  const deVenta = (await movimientosDe(ids)).filter((m) => m.type === "sale");
  expect(deVenta).toHaveLength(3);
  expect(deVenta.every((m) => m.saleId !== null)).toBe(true);
  expect(deVenta.map((m) => m.quantity).sort((a, b) => a - b)).toEqual([-2, -1, -1]);
});

test("la misma venta enviada dos veces se registra una sola vez", async () => {
  // AC-010. Se llama al dominio directamente: es donde vive la garantía, y una prueba por la
  // pantalla no podría provocar el segundo envío con el mismo identificador.
  const [galleta] = await sembrar([{ nombre: "Galletas", precio: 1200, existencias: 7 }]);
  const ventaId = nuevoId();
  const lineas = [{ productoId: galleta!.id, cantidad: 3 }];

  const primera = await registrarVenta(ventaId, lineas, dueno.id);
  const segunda = await registrarVenta(ventaId, lineas, dueno.id);

  expect(primera.yaEstaba).toBe(false);
  expect(segunda.yaEstaba).toBe(true);
  expect(segunda.total).toBe(primera.total);

  // Lo que importa no es el valor devuelto sino que no se descontó dos veces.
  expect(await existenciasDe(galleta!.id)).toBe(4);
  const ventas = await db.select().from(schema.sale).where(eq(schema.sale.id, ventaId));
  expect(ventas).toHaveLength(1);
  const lineasEnBase = await db
    .select()
    .from(schema.saleLine)
    .where(eq(schema.saleLine.saleId, ventaId));
  expect(lineasEnBase).toHaveLength(1);
});

test("subir el precio después no reescribe lo que ya se cobró", async () => {
  // AC-009: la línea copia el precio vigente al vender.
  const [aceite] = await sembrar([{ nombre: "Aceite", precio: 9000, existencias: 4 }]);
  const ventaId = nuevoId();
  const venta = await registrarVenta(ventaId, [{ productoId: aceite!.id, cantidad: 1 }], dueno.id);
  expect(venta.total).toBe(9000);

  await db
    .update(schema.product)
    .set({ price: 15000 })
    .where(eq(schema.product.id, aceite!.id));

  const [linea] = await db
    .select()
    .from(schema.saleLine)
    .where(eq(schema.saleLine.saleId, ventaId));
  expect(linea!.unitPrice).toBe(9000);
  const [guardada] = await db.select().from(schema.sale).where(eq(schema.sale.id, ventaId));
  expect(guardada!.total).toBe(9000);
});

test("si la red falla, lo dice sin rodeos, no descuenta, y reintentar cobra una sola vez", async ({
  page,
}) => {
  const [atun] = await sembrar([{ nombre: "Atún", precio: 6000, existencias: 6 }]);
  await entrarComo(page, dueno);
  await tocar(page, atun!.id, 2);

  // La acción de servidor viaja por POST a la misma ruta. Cortarla es el fallo de red real.
  await page.route("**/", (ruta) =>
    ruta.request().method() === "POST" ? ruta.abort("failed") : ruta.continue(),
  );
  await page.getByTestId("confirmar").click();

  // AC-015: decir que NO se guardó. Un «algo salió mal» deja al dueño sin saber si cobrar de nuevo.
  await expect(page.getByTestId("fallo-de-red")).toContainText("No se guardó");
  await expect(page.getByTestId("confirmar")).toHaveText("Reintentar");
  expect(await existenciasDe(atun!.id)).toBe(6);
  // Y la venta sigue armada: no hay que volver a tocarla.
  await expect(page.getByTestId("total")).toContainText("12.000");

  await page.unroute("**/");
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toContainText("12.000");
  expect(await existenciasDe(atun!.id)).toBe(4);

  const ventas = await db
    .select()
    .from(schema.saleLine)
    .where(eq(schema.saleLine.productId, atun!.id));
  expect(ventas).toHaveLength(1);
});

test("vender más de lo que hay se permite y el saldo queda negativo", async ({ page }) => {
  // Decidido con el estudio: la aplicación registra lo que pasó, no decide lo que se puede vender.
  const [huevos] = await sembrar([{ nombre: "Huevos", precio: 800, existencias: 1 }]);
  await entrarComo(page, dueno);
  await tocar(page, huevos!.id, 3);
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toBeVisible();

  expect(await existenciasDe(huevos!.id)).toBe(-2);
});

test("en la cuadrícula, el cero y el negativo se ven en rojo", async ({ page }) => {
  // Ninguna prueba miraba esto y las dos pantallas no coincidían: el catálogo alerta solo en
  // negativo y la venta también en cero. Ahora la diferencia está fijada, no heredada.
  /**
   * Las cantidades son grandes a propósito. Desde `T-014` la cuadrícula ordena de verdad por lo más
   * vendido y muestra 24 casillas; un producto sin ventas se queda fuera cuando la base tiene datos.
   * Se llega al cero y al negativo **vendiendo**, que además es como se llega en la vida real.
   */
  const [agotado, negativo, normal] = await sembrar([
    { nombre: "Agotado", precio: 1000, existencias: 30 },
    { nombre: "Debe", precio: 1000, existencias: 30 },
    { nombre: "Normal", precio: 1000, existencias: 100 },
  ]);
  await registrarVenta(nuevoId(), [{ productoId: agotado!.id, cantidad: 30 }], dueno.id);
  await registrarVenta(nuevoId(), [{ productoId: negativo!.id, cantidad: 34 }], dueno.id);
  await registrarVenta(nuevoId(), [{ productoId: normal!.id, cantidad: 30 }], dueno.id);

  await entrarComo(page, dueno);
  // Si alguna casilla no estuviera, el fallo sería el mismo que el de la alerta: se comprueba antes.
  for (const p of [agotado, negativo, normal]) {
    await expect(page.getByTestId(`casilla-${p!.id}`)).toHaveCount(1);
  }
  await expect(page.getByTestId(`casilla-${agotado!.id}`).locator("[data-alerta]")).toHaveCount(1);
  await expect(page.getByTestId(`casilla-${negativo!.id}`).locator("[data-alerta]")).toHaveCount(1);
  await expect(page.getByTestId(`casilla-${normal!.id}`).locator("[data-alerta]")).toHaveCount(0);
});

test("tocar dos veces suma, y se puede corregir la cantidad sin rehacer la venta", async ({
  page,
}) => {
  const [cafe] = await sembrar([{ nombre: "Café", precio: 11000, existencias: 9 }]);
  await entrarComo(page, dueno);
  await tocar(page, cafe!.id, 3);
  await expect(page.getByTestId(`cantidad-${cafe!.id}`)).toHaveText("3");

  await page.getByRole("button", { name: /^Quitar uno de Café/ }).click();
  await expect(page.getByTestId(`cantidad-${cafe!.id}`)).toHaveText("2");
  await expect(page.getByTestId("total")).toContainText("22.000");

  // Bajar de uno saca la línea; una línea en cero no es una venta.
  await page.getByRole("button", { name: /^Quitar uno de Café/ }).click();
  await page.getByRole("button", { name: /^Quitar uno de Café/ }).click();
  await expect(page.getByTestId("venta-en-curso")).toBeEmpty();
  await expect(page.getByTestId("confirmar")).toBeDisabled();
});

test("a 360 px el total se ve siempre y nada del flujo de venta vive arriba", async ({ page }) => {
  const [galleta] = await sembrar([{ nombre: "Galleta ancha", precio: 2500, existencias: 12 }]);
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await tocar(page, galleta!.id);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  // AC-X01: el total está a la vista sin desplazarse.
  const total = await page.getByTestId("total").boundingBox();
  expect(total!.y).toBeLessThan(740);

  // NFR-003: confirmar y las cantidades viven fuera del tercio superior, donde llega el pulgar.
  const confirmar = await page.getByTestId("confirmar").boundingBox();
  expect(confirmar!.y).toBeGreaterThan(740 / 3);
  expect(confirmar!.height).toBeGreaterThanOrEqual(48);
  const menos = await page.getByRole("button", { name: /^Quitar uno de/ }).boundingBox();
  expect(menos!.y).toBeGreaterThan(740 / 3);
  expect(menos!.height).toBeGreaterThanOrEqual(48);
});

test("la cuadrícula ordena por lo más vendido, no por cualquier cosa", async ({ page }) => {
  /**
   * Esto no funcionó nunca hasta `T-014`. Drizzle no cualifica los nombres de columna dentro de una
   * plantilla `sql` en un `select`, así que la subconsulta comparaba `sale_line.product_id` con
   * `sale_line.id` —nunca acertaba— y la cuadrícula ordenaba todo por cero y luego por nombre.
   * Con datos sembrados en orden alfabético el resultado parecía razonable, que es lo que hizo que
   * pasara desapercibido.
   */
  const [zeta, alfa] = await sembrar([
    { nombre: "Zzz poco vendido", precio: 1000, existencias: 50 },
    { nombre: "Aaa muy vendido", precio: 1000, existencias: 50 },
  ]);
  // El de nombre alfabéticamente posterior se vende más: si el orden fuera por nombre, perdería.
  await registrarVenta(nuevoId(), [{ productoId: zeta!.id, cantidad: 9 }], dueno.id);
  await registrarVenta(nuevoId(), [{ productoId: alfa!.id, cantidad: 1 }], dueno.id);

  await entrarComo(page, dueno);
  const casillas = await page.getByTestId(/^casilla-/).all();
  const nombres = await Promise.all(casillas.map((c) => c.innerText()));
  const posicion = (parte: string) => nombres.findIndex((n) => n.includes(parte));

  expect(posicion("Zzz poco vendido")).toBeGreaterThanOrEqual(0);
  expect(posicion("Zzz poco vendido")).toBeLessThan(posicion("Aaa muy vendido"));
});
