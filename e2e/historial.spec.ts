// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { registrarVenta } from "../src/domain/venta";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-011 · US-008, US-009. El libro, visto desde la pantalla y contrastado contra la base.
 */
let dueno: DuenoDePrueba;
const MARCA = `t11-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("historial");
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  await db.delete(schema.productEvent).where(sql`${schema.productEvent.productId} in (${mios})`);
  const ventas = sql`select id from ${schema.sale} where ${schema.sale.userId} = ${dueno.id}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${ventas})`);
  await db.delete(schema.sale).where(eq(schema.sale.userId, dueno.id));
  await db.delete(schema.product).where(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

async function sembrar(nombre: string, precio: number, iniciales: number) {
  const [p] = await db
    .insert(schema.product)
    .values({ name: `${nombre} ${MARCA}`, price: precio, stock: 0 })
    .returning({ id: schema.product.id, nombre: schema.product.name });
  if (iniciales !== 0) {
    await db.insert(schema.stockMovement).values({
      productId: p!.id,
      quantity: iniciales,
      type: "initial",
      userId: dueno.id,
    });
    await db.update(schema.product).set({ stock: iniciales }).where(eq(schema.product.id, p!.id));
  }
  return p!;
}

const movimientosDe = (id: string) =>
  db.select().from(schema.stockMovement).where(eq(schema.stockMovement.productId, id));

const stockDe = async (id: string) =>
  (await db.select({ s: schema.product.stock }).from(schema.product).where(eq(schema.product.id, id)))[0]!.s;

/**
 * Abre una sección plegable solo si está cerrada. La de corregir el conteo ya viene abierta cuando
 * el saldo no cuadra —es lo que hace falta en ese momento— así que clicarla la cerraría.
 */
async function abrir(page: Page, testid: string) {
  const seccion = page.getByTestId(testid);
  if (!(await seccion.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await seccion.getByRole("group").or(seccion.locator("summary")).first().click();
  }
  await expect(seccion).toHaveAttribute("open", "");
}

async function ajustar(page: Page, conteo: string, motivo: string) {
  await abrir(page, "abrir-ajuste");
  await page.getByTestId("conteo").fill(conteo);
  await page.getByTestId("motivo").fill(motivo);
  await page.getByTestId("guardar-ajuste").click();
}

test("el catálogo lleva al historial, y el historial cuenta lo que pasó", async ({ page }) => {
  const p = await sembrar("Arroz", 3500, 10);
  const ventaId = nuevoId();
  await registrarVenta(ventaId, [{ productoId: p.id, cantidad: 3 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto(`/catalogo?q=${encodeURIComponent(p.nombre)}`);
  await page.getByRole("link", { name: new RegExp(p.nombre.slice(0, 12)) }).click();
  await expect(page).toHaveURL(new RegExp(`/catalogo/${p.id}(\\?|$)`));

  // AC-014: tipo, cantidad, motivo y fecha; y la suma coincide con las existencias.
  const historial = page.getByTestId("historial");
  await expect(historial.locator("li")).toHaveCount(2);
  await expect(historial).toContainText("Existencias iniciales");
  await expect(historial).toContainText("+10");
  await expect(historial).toContainText("Venta");
  await expect(historial).toContainText("-3");
  await expect(historial).toContainText("Ver la venta");
  await expect(page.getByTestId("historial").locator("li").first()).toContainText("Venta");

  await expect(page.getByText("2 movimientos, suman 7")).toBeVisible();
  await expect(page.getByTestId("no-cuadra")).toHaveCount(0);
});

test("un ajuste sin motivo se rechaza y no escribe nada", async ({ page }) => {
  const p = await sembrar("Pan", 500, 4);
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);

  // El campo es `required`, así que se salta la validación del navegador para llegar al servidor:
  // AC-013 es una regla del sistema, no del formulario.
  await page.getByTestId("motivo").evaluate((el) => el.removeAttribute("required"));
  await ajustar(page, "9", "   ");

  await expect(page.getByTestId("ajuste-error")).toContainText("por qué");
  expect(await movimientosDe(p.id)).toHaveLength(1);
  expect(await stockDe(p.id)).toBe(4);
});

test("el ajuste escribe la diferencia, no el conteo, y el saldo sale del libro", async ({ page }) => {
  const p = await sembrar("Huevos", 700, 30);
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);

  // Se cuentan 26 donde el sistema decía 30: la diferencia es -4.
  await ajustar(page, "26", "se rompieron cuatro");
  await expect(page.getByTestId("ajuste-hecho")).toContainText("Ahora hay 26");

  const movs = await movimientosDe(p.id);
  const ajuste = movs.find((m) => m.type === "adjustment");
  expect(ajuste, "debe haber un movimiento de ajuste").toBeDefined();
  expect(ajuste!.quantity).toBe(-4);
  expect(ajuste!.reason).toBe("se rompieron cuatro");
  expect(await stockDe(p.id)).toBe(26);

  await page.reload();
  await expect(page.getByTestId("historial")).toContainText("se rompieron cuatro");
  await expect(page.getByText("2 movimientos, suman 26")).toBeVisible();
});

test("si el conteo guardado y el libro no coinciden, la pantalla lo dice", async ({ page }) => {
  // NFR-005. Se fuerza la divergencia a mano: es la única forma de comprobar que se detecta.
  const p = await sembrar("Aceite", 9000, 12);
  await db.update(schema.product).set({ stock: 99 }).where(eq(schema.product.id, p.id));

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);

  const aviso = page.getByTestId("no-cuadra");
  await expect(aviso).toContainText("99");
  await expect(aviso).toContainText("12");
  await expect(aviso).toContainText("Manda el libro");
});

test("corregir el conteo deja el saldo cuadrando otra vez", async ({ page }) => {
  const p = await sembrar("Panela", 4500, 8);
  await db.update(schema.product).set({ stock: 50 }).where(eq(schema.product.id, p.id));

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);
  await expect(page.getByTestId("no-cuadra")).toBeVisible();

  await ajustar(page, "8", "recuento del estante");
  // Esperar el acuse antes de recargar: sin esto la recarga puede adelantar a la acción.
  await expect(page.getByTestId("ajuste-hecho")).toContainText("El libro ya decía 8");
  await page.reload();
  // El ajuste se calcula contra la copia, y luego el saldo se relee del libro: las dos cosas vuelven
  // a coincidir sin tocar los movimientos viejos (`D-002`).
  await expect(page.getByTestId("no-cuadra")).toHaveCount(0);
  expect(await stockDe(p.id)).toBe(8);
});

test("la pantalla del historial se opera a 360 px", async ({ page }) => {
  const p = await sembrar("Café", 11000, 5);
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await abrir(page, "abrir-ajuste");
  const boton = await page.getByTestId("guardar-ajuste").boundingBox();
  expect(boton!.height).toBeGreaterThanOrEqual(48);
});

/**
 * T-012 · US-014, US-015. Editar y retirar, y que las dos cosas queden donde el dueño ya mira.
 */
const eventosDe = (id: string) =>
  db.select().from(schema.productEvent).where(eq(schema.productEvent.productId, id));

async function editarPrecio(page: Page, nuevo: string) {
  await abrir(page, "abrir-edicion");
  await page.getByLabel("Precio").fill(nuevo);
  await page.getByTestId("guardar-edicion").click();
  await expect(page.getByTestId("edicion-hecha")).toBeVisible();
}

test("cambiar el precio queda registrado y no toca lo que ya se cobró", async ({ page }) => {
  const p = await sembrar("Atún", 6000, 10);
  const ventaId = nuevoId();
  await registrarVenta(ventaId, [{ productoId: p.id, cantidad: 2 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);
  await editarPrecio(page, "8500");

  // AC-021: precio anterior, nuevo, quién y cuándo.
  const eventos = await eventosDe(p.id);
  expect(eventos).toHaveLength(1);
  expect(eventos[0]!.type).toBe("price_change");
  expect(eventos[0]!.previousPrice).toBe(6000);
  expect(eventos[0]!.newPrice).toBe(8500);

  // AC-009: la venta de antes sigue diciendo lo que se cobró.
  const [linea] = await db
    .select()
    .from(schema.saleLine)
    .where(eq(schema.saleLine.saleId, ventaId));
  expect(linea!.unitPrice).toBe(6000);

  // Y aparece en la misma línea de tiempo que los movimientos.
  await page.reload();
  const evento = page.getByTestId("evento-precio");
  await expect(evento).toContainText("6.000");
  await expect(evento).toContainText("8.500");
});

test("guardar sin cambiar el precio no ensucia el historial", async ({ page }) => {
  const p = await sembrar("Panela", 4500, 6);
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);

  await abrir(page, "abrir-edicion");
  await page.getByLabel("Nombre").fill(`${p.nombre} corregido`);
  await page.getByTestId("guardar-edicion").click();
  await expect(page.getByTestId("edicion-hecha")).toBeVisible();

  expect(await eventosDe(p.id)).toHaveLength(0);
  await expect(page.getByTestId("evento-precio")).toHaveCount(0);
});

test("retirar un producto lo saca de la venta y del catálogo, sin perder su historia", async ({
  page,
}) => {
  const p = await sembrar("Jabón", 3400, 7);
  const ventaId = nuevoId();
  await registrarVenta(ventaId, [{ productoId: p.id, cantidad: 1 }], dueno.id);

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);
  await abrir(page, "abrir-estado");
  await page.getByTestId("cambiar-estado").click();
  await expect(page.getByTestId("evento-activacion")).toContainText("Dejó de venderse");

  // AC-022: fuera de la cuadrícula y del catálogo activo…
  await page.goto("/vender");
  await expect(page.getByTestId(`casilla-${p.id}`)).toHaveCount(0);
  await page.goto(`/catalogo?q=${encodeURIComponent(p.nombre)}`);
  await expect(page.getByTestId("catalogo-vacio")).toBeVisible();

  // …pero se puede pedir a propósito, y su historia sigue entera.
  await page.goto(`/catalogo?q=${encodeURIComponent(p.nombre)}&desactivados=1`);
  await expect(page.getByTestId("lista-catalogo")).toContainText("Ya no se vende");
  await page.goto(`/catalogo/${p.id}`);
  await expect(page.getByTestId("historial")).toContainText("Venta");
  await expect(page.getByTestId("historial")).toContainText("Existencias iniciales");
});

test("devolver a la venta lo reactiva, y las dos cosas quedan en el historial", async ({ page }) => {
  const p = await sembrar("Café", 11000, 3);
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);

  await abrir(page, "abrir-estado");
  await page.getByTestId("cambiar-estado").click();
  await abrir(page, "abrir-estado");
  await expect(page.getByTestId("cambiar-estado")).toHaveText("Devolver a la venta");
  await page.getByTestId("cambiar-estado").click();
  await abrir(page, "abrir-estado");
  await expect(page.getByTestId("cambiar-estado")).toHaveText("Dejar de vender");

  await expect(page.getByTestId("evento-activacion")).toHaveCount(2);
  await page.goto("/vender");
  await expect(page.getByTestId(`casilla-${p.id}`)).toHaveCount(1);
});

test("al editar, un código de barras de otro producto se rechaza nombrándolo", async ({ page }) => {
  const codigo = `79${Date.now()}${Math.floor(Math.random() * 100)}`.slice(0, 13);
  const dueno1 = await sembrar("Leche", 4300, 5);
  await db.update(schema.product).set({ barcode: codigo }).where(eq(schema.product.id, dueno1.id));
  const otro = await sembrar("Impostora", 4300, 5);

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${otro.id}`);
  await abrir(page, "abrir-edicion");
  await page.getByLabel("Código de barras").fill(codigo);
  await page.getByTestId("guardar-edicion").click();

  await expect(page.getByText(`Ese código ya es de «${dueno1.nombre}».`)).toBeVisible();
});

/**
 * T-013. El reporte del estudio fue «no es entendible que al hacer click se edita un producto».
 * Lo que se fija aquí no es cómo se ve, sino qué se ofrece primero: la ficha informa, y lo que
 * cambia el producto está detrás de una intención con su nombre a la vista.
 */
test("la ficha se abre informando, no pidiendo", async ({ page }) => {
  const p = await sembrar("Azúcar", 5200, 9);
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);

  // Nada desplegado y ningún campo a la vista al aterrizar.
  await expect(page.locator("details[open]")).toHaveCount(0);
  for (const campo of await page.locator("input").all()) {
    await expect(campo).not.toBeVisible();
  }

  // Y el historial, que es a lo que se entra, está por encima del pliegue.
  const historial = await page.getByTestId("historial").boundingBox();
  expect(historial!.y).toBeLessThan(740);

  // Las tres acciones existen y dicen lo que hacen sin abrirlas.
  await expect(page.getByTestId("abrir-ajuste")).toContainText("Corregir el conteo");
  await expect(page.getByTestId("abrir-edicion")).toContainText("Editar los datos");
  await expect(page.getByTestId("abrir-estado")).toContainText("Dejar de vender");
});

test("cuando el conteo no cuadra, corregirlo ya viene abierto", async ({ page }) => {
  // Es la excepción a la regla anterior, y es deliberada: si la pantalla avisa de un problema,
  // esconder su remedio detrás de un toque más es hacerse el interesante.
  const p = await sembrar("Gaseosa", 3000, 4);
  await db.update(schema.product).set({ stock: 40 }).where(eq(schema.product.id, p.id));

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p.id}`);
  await expect(page.getByTestId("no-cuadra")).toBeVisible();
  await expect(page.getByTestId("abrir-ajuste")).toHaveAttribute("open", "");
  await expect(page.getByTestId("abrir-edicion")).not.toHaveAttribute("open", "");
});

test("la tarjeta del catálogo indica que lleva a alguna parte", async ({ page }) => {
  const p = await sembrar("Papel", 8900, 3);
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await page.goto(`/catalogo?q=${encodeURIComponent(p.nombre)}`);

  // Un enlace de verdad, con su marca visual —el chevron, ahora un icono y no un «›» de texto— y
  // un blanco que se acierta con el pulgar.
  const fila = page.getByTestId("lista-catalogo").getByRole("link").first();
  await expect(fila.locator("svg")).toHaveCount(1);
  const caja = await fila.boundingBox();
  expect(caja!.height).toBeGreaterThanOrEqual(48);
});
