// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { registrarVenta } from "../src/domain/venta";
import { diaDelNegocio } from "../src/domain/zona";
import { borrarDueno, borrarProductos, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-014 · US-013, US-007. El historial de ventas y la anulación, contra la base real.
 */
let dueno: DuenoDePrueba;
const MARCA = `t14-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("ventas");
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  const ventas = sql`select id from ${schema.sale} where ${schema.sale.userId} = ${dueno.id}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${ventas})`);
  await db.delete(schema.sale).where(eq(schema.sale.userId, dueno.id));
  await borrarProductos(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

async function sembrar(nombre: string, precio: number, iniciales: number) {
  const [p] = await db
    .insert(schema.product)
    .values({ name: `${nombre} ${MARCA}`, price: precio, stock: iniciales })
    .returning({ id: schema.product.id, nombre: schema.product.name });
  await db.insert(schema.stockMovement).values({
    productId: p!.id,
    quantity: iniciales,
    type: "initial",
    userId: dueno.id,
  });
  return p!;
}

const stockDe = async (id: string) =>
  (await db.select({ s: schema.product.stock }).from(schema.product).where(eq(schema.product.id, id)))[0]!.s;

const movimientosDe = (id: string) =>
  db.select().from(schema.stockMovement).where(eq(schema.stockMovement.productId, id));

// «Hoy» es el del negocio, no el de UTC: `toISOString()` adelantaba el día cinco horas antes de
// que lo hiciera la pantalla, y esta suite se caía sola cada tarde a partir de las siete (`T-019`).
const hoy = () => diaDelNegocio(new Date());

/**
 * El total del día suma **todas** las ventas del negocio, no las de una prueba: la base es una sola.
 * Así que lo que se comprueba es la invariante —el total del día es la suma de las no anuladas que
 * se listan— y no un número absoluto, que dependería de lo que hayan hecho las otras pruebas.
 */
async function totalDelDia(page: Page): Promise<{ mostrado: number; sumaDeLasVentas: number }> {
  return page.evaluate((dia) => {
    const numero = (t: string) => Number(t.replace(/[^\d-]/g, ""));
    const seccion = document.querySelector(`[data-testid="dia-${dia}"]`)!;
    const filas = [...seccion.querySelectorAll("li a")];
    const sumaDeLasVentas = filas
      .filter((f) => !f.textContent!.includes("Anulada"))
      .reduce((t, f) => t + numero(f.querySelector('[data-testid="precio-venta"]')!.textContent ?? "0"), 0);
    return {
      mostrado: numero(document.querySelector(`[data-testid="total-${dia}"]`)!.textContent ?? "0"),
      sumaDeLasVentas,
    };
  }, hoy());
}

async function abrirAnular(page: Page) {
  const seccion = page.getByTestId("abrir-anular");
  await seccion.locator("summary").click();
  await expect(seccion).toHaveAttribute("open", "");
}

/**
 * T-019. Con instantes fijos y no con `now()`: una prueba de fechas que dependa de la hora a la que
 * se corra pasa por la mañana y falla por la noche, que es el defecto mismo que vino a fijar.
 *
 * Bogotá es UTC-5 todo el año, así que la medianoche del negocio son las 05:00Z.
 */
test("el día de una venta lo pone el negocio, no la zona de la base ni la del servidor", async ({
  page,
}) => {
  const p = await sembrar("Panela", 2800, 10);

  // 21:30 del 28 de febrero en Bogotá. En UTC ya es el 1 de marzo, y ahí se colaba el defecto: el
  // encabezado la ponía bajo el día siguiente con «9:30 p. m.» escrito al lado.
  const nocheDel28 = new Date("2026-03-01T02:30:00Z");
  const tarde = nuevoId();
  await registrarVenta(tarde, [{ productoId: p.id, cantidad: 1 }], dueno.id);
  await db.update(schema.sale).set({ createdAt: nocheDel28 }).where(eq(schema.sale.id, tarde));
  expect(diaDelNegocio(nocheDel28)).toBe("2026-02-28");

  // La medianoche exacta del negocio: el primer instante que sí es del día siguiente. Fija el
  // extremo del rango, que es donde vive el error de uno.
  const medianoche = new Date("2026-03-01T05:00:00Z");
  const justoDespues = nuevoId();
  await registrarVenta(justoDespues, [{ productoId: p.id, cantidad: 1 }], dueno.id);
  await db
    .update(schema.sale)
    .set({ createdAt: medianoche })
    .where(eq(schema.sale.id, justoDespues));

  await entrarComo(page, dueno);

  await page.goto("/ventas?desde=2026-02-28&hasta=2026-02-28");
  // Sin el año cuando es el de hoy: el encabezado cabe en una línea a 360 px (`T-024`, hallazgo 4).
  await expect(page.getByTestId("dia-2026-02-28")).toContainText("28 de febrero");
  // La hora del negocio, no la de UTC. Sin esto el encabezado y la fila se contradicen.
  await expect(page.getByTestId(`venta-${tarde}`)).toContainText("9:30");
  await expect(page.getByTestId(`venta-${tarde}`)).not.toContainText("2:30");
  await expect(page.getByTestId(`venta-${justoDespues}`)).toHaveCount(0);

  await page.goto("/ventas?desde=2026-03-01&hasta=2026-03-01");
  await expect(page.getByTestId(`venta-${justoDespues}`)).toBeVisible();
  await expect(page.getByTestId(`venta-${tarde}`)).toHaveCount(0);

  // El detalle fecha la misma venta igual que el listado: es adonde se va a comprobar precisamente
  // eso, y antes cada uno usaba un reloj distinto.
  await page.goto(`/ventas/${tarde}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("28 de febrero de 2026");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("9:30");
});

test("las ventas se agrupan por día con su total, y se entra al detalle", async ({ page }) => {
  const p = await sembrar("Arroz", 3500, 20);
  const q = await sembrar("Pan", 500, 20);
  const v1 = nuevoId();
  await registrarVenta(v1, [{ productoId: p.id, cantidad: 2 }], dueno.id);
  await registrarVenta(nuevoId(), [{ productoId: q.id, cantidad: 3 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto(`/ventas?desde=${hoy()}&hasta=${hoy()}`);

  await expect(page.getByTestId(`venta-${v1}`)).toContainText("2 artículos");
  // AC-019: el total del día es exactamente la suma de sus ventas no anuladas.
  const total = await totalDelDia(page);
  expect(total.mostrado).toBe(total.sumaDeLasVentas);

  // AC-020: el detalle dice lo que se cobró.
  await page.getByTestId(`venta-${v1}`).click();
  await expect(page).toHaveURL(new RegExp(`/ventas/${v1}(\\?|$)`));
  await expect(page.getByTestId("lineas")).toContainText("2 × $ 3.500");
  await expect(page.getByTestId("total-venta")).toContainText("7.000");
});

test("subir el precio después no cambia lo que dice la venta", async ({ page }) => {
  const p = await sembrar("Aceite", 9000, 10);
  const v = nuevoId();
  await registrarVenta(v, [{ productoId: p.id, cantidad: 1 }], dueno.id);
  await db.update(schema.product).set({ price: 20000 }).where(eq(schema.product.id, p.id));

  await entrarComo(page, dueno);
  await page.goto(`/ventas/${v}`);
  await expect(page.getByTestId("lineas")).toContainText("9.000");
  await expect(page.getByTestId("lineas")).not.toContainText("20.000");
});

test("anular devuelve las existencias sin borrar los movimientos originales", async ({ page }) => {
  const p = await sembrar("Leche", 4300, 15);
  const v = nuevoId();
  await registrarVenta(v, [{ productoId: p.id, cantidad: 4 }], dueno.id);
  expect(await stockDe(p.id)).toBe(11);

  await entrarComo(page, dueno);
  await page.goto(`/ventas/${v}`);
  await abrirAnular(page);
  await page.getByTestId("anular").click();
  await expect(page.getByTestId("anulada")).toBeVisible();
  // En palabras de tienda, y sin el «p. m..» que dejaba la fecha con el punto de la frase (`T-035`).
  await expect(page.getByTestId("anulada")).toContainText("Los productos volvieron a lo que hay");
  await expect(page.getByTestId("anulada")).not.toContainText("..");

  // AC-011: movimiento compensatorio por exactamente lo vendido, y el original intacto.
  const movs = await movimientosDe(p.id);
  const venta = movs.filter((m) => m.type === "sale");
  const anulacion = movs.filter((m) => m.type === "sale_void");
  expect(venta).toHaveLength(1);
  expect(venta[0]!.quantity).toBe(-4);
  expect(anulacion).toHaveLength(1);
  expect(anulacion[0]!.quantity).toBe(4);
  expect(anulacion[0]!.saleId).toBe(v);

  // El saldo se recalcula desde el libro.
  expect(await stockDe(p.id)).toBe(15);
});

test("una venta anulada se ve como anulada y no suma al total del día", async ({ page }) => {
  const p = await sembrar("Café", 11000, 10);
  const buena = nuevoId();
  const mala = nuevoId();
  await registrarVenta(buena, [{ productoId: p.id, cantidad: 1 }], dueno.id);
  await registrarVenta(mala, [{ productoId: p.id, cantidad: 2 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto(`/ventas/${mala}`);
  await abrirAnular(page);
  await page.getByTestId("anular").click();
  await expect(page.getByTestId("anulada")).toBeVisible();

  // AC-019 / AC-024. Se comprueba la invariante y no una resta: la base es una sola y otras
  // pruebas registran ventas del mismo día en paralelo, así que «bajó exactamente 22.000» estaría
  // condenado a fallar sin que nada estuviera mal.
  await page.goto(`/ventas?desde=${hoy()}&hasta=${hoy()}`);
  await expect(page.getByTestId(`venta-${mala}`)).toContainText("Anulada");
  await expect(page.getByTestId(`venta-${buena}`)).not.toContainText("Anulada");
  const total = await totalDelDia(page);
  expect(total.mostrado).toBe(total.sumaDeLasVentas);
});

test("anular dos veces se rechaza y no devuelve las existencias otra vez", async ({ page }) => {
  const p = await sembrar("Atún", 6900, 8);
  const v = nuevoId();
  await registrarVenta(v, [{ productoId: p.id, cantidad: 3 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto(`/ventas/${v}`);
  await abrirAnular(page);
  await page.getByTestId("anular").click();
  await expect(page.getByTestId("anulada")).toBeVisible();
  expect(await stockDe(p.id)).toBe(8);

  // AC-012. Ya no hay botón en la pantalla, así que se ataca la acción por donde sí se alcanza.
  const { anularVenta } = await import("../src/domain/venta");
  const otra = await anularVenta(v, dueno.id);
  expect(otra.ok).toBe(false);
  expect(await stockDe(p.id)).toBe(8);
  expect((await movimientosDe(p.id)).filter((m) => m.type === "sale_void")).toHaveLength(1);
});

test("desde el historial de un producto se llega a la venta", async ({ page }) => {
  const p = await sembrar("Panela", 4500, 12);
  const v = nuevoId();
  await registrarVenta(v, [{ productoId: p.id, cantidad: 1 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);
  await page.getByTestId("de-una-venta").click();
  await expect(page).toHaveURL(new RegExp(`/ventas/${v}(\\?|$)`));
});

test("el rango de fechas vive en la dirección y sobrevive a una recarga", async ({ page }) => {
  const p = await sembrar("Azúcar", 5200, 10);
  await registrarVenta(nuevoId(), [{ productoId: p.id, cantidad: 1 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto("/ventas?desde=2020-01-01&hasta=2020-01-02");
  await expect(page.getByTestId("ventas-vacio")).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("ventas-vacio")).toBeVisible();

  // Una fecha inventada se ignora en vez de tumbar la pantalla.
  await page.goto("/ventas?desde=ayer&hasta=");
  await expect(page.getByTestId("dias")).toBeVisible();
});

test("anular no vive en el tercio superior, y la pantalla se opera a 360 px", async ({ page }) => {
  const p = await sembrar("Jabón", 3400, 6);
  const v = nuevoId();
  await registrarVenta(v, [{ productoId: p.id, cantidad: 1 }], dueno.id);

  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await page.goto(`/ventas/${v}`);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const seccion = await page.getByTestId("abrir-anular").boundingBox();
  expect(seccion!.y).toBeGreaterThan(740 / 3);
});
