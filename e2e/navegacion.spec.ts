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
 * «Volver» vuelve a donde se estaba, no a una pantalla fija. Reportado por el estudio: de la ficha
 * de un producto a una venta de su historial, y «volver» dejaba en el historial de ventas.
 *
 * Cada caso entra a una pantalla por un camino distinto y toca el «volver» de la aplicación —no el
 * del navegador, que ya funciona—.
 */
let dueno: DuenoDePrueba;
const MARCA = `nav-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let productoId: string;
let ventaId: string;

test.beforeAll(async () => {
  dueno = await crearDueno("navegacion");
  const [p] = await db
    .insert(schema.product)
    // Empieza por un dígito a propósito: Inicio enseña solo los tres primeros por reponer, por
    // nombre, y cualquier otra prueba que deje un producto en cero —«Galletas» en `aspecto.spec`—
    // lo sacaba de la lista si se llamaba con letra (`T-038`).
    .values({ name: `0 Jabón ${MARCA}`, price: 3400, stock: 0 })
    .returning({ id: schema.product.id });
  productoId = p!.id;
  ventaId = nuevoId();
  // Vendido de más a propósito: queda en negativo y sale en «por reponer» de Inicio.
  await registrarVenta(ventaId, [{ productoId, cantidad: 2 }], dueno.id);
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

/** El «volver» de la aplicación: el primer enlace de la página con la flecha hacia atrás. */
async function volver(page: Page) {
  await page.locator("main a:has(svg.lucide-arrow-left)").first().click();
  await page.waitForLoadState("networkidle");
}

const hoy = () => diaDelNegocio(new Date());

test("de la ficha a una venta de su historial, «volver» regresa a la ficha", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${productoId}`);
  await page.getByTestId("historial").getByTestId("de-una-venta").first().click();
  await expect(page).toHaveURL(new RegExp(`/ventas/${ventaId}`));
  // El enlace dice adónde lleva.
  await expect(page.locator("main a:has(svg.lucide-arrow-left)").first()).toHaveText("Producto");
  await volver(page);
  await expect(page).toHaveURL(new RegExp(`/catalogo/${productoId}`));
});

test("un origen ajeno en la dirección no convierte «volver» en un enlace a otro sitio", async ({
  page,
}) => {
  await entrarComo(page, dueno);
  await page.goto(`/ventas/${ventaId}?desde=${encodeURIComponent("https://otro.sitio")}`);
  const enlace = page.locator("main a:has(svg.lucide-arrow-left)").first();
  await expect(enlace).toHaveAttribute("href", "/ventas");
  await expect(enlace).toHaveText("Ventas");
});

test("de Inicio a una de las últimas ventas, «volver» regresa a Inicio", async ({ page }) => {
  // Las últimas ventas y «por reponer» se ven enteras en Inicio solo en computador.
  await page.setViewportSize({ width: 1280, height: 900 });
  await entrarComo(page, dueno);
  await page.goto("/");
  await page.locator(`a[href^="/ventas/${ventaId}"]:visible`).first().click();
  await expect(page).toHaveURL(new RegExp(`/ventas/${ventaId}`));
  await volver(page);
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("de Ventas con un rango de fechas a una venta, «volver» conserva el rango", async ({ page }) => {
  await entrarComo(page, dueno);
  const rango = `/ventas?desde=${hoy()}&hasta=${hoy()}`;
  await page.goto(rango);
  await page.getByTestId(`venta-${ventaId}`).click();
  await expect(page).toHaveURL(new RegExp(`/ventas/${ventaId}`));
  await volver(page);
  await expect(page).toHaveURL(new RegExp(`desde=${hoy()}&hasta=${hoy()}`));
});

test("de Inicio a un producto por reponer, «volver» regresa a Inicio", async ({ page }) => {
  // Las últimas ventas y «por reponer» se ven enteras en Inicio solo en computador.
  await page.setViewportSize({ width: 1280, height: 900 });
  await entrarComo(page, dueno);
  await page.goto("/");
  await page.locator(`a[href^="/catalogo/${productoId}"]:visible`).first().click();
  await expect(page).toHaveURL(new RegExp(`/catalogo/${productoId}`));
  await volver(page);
  await expect(page).toHaveURL(/localhost:\d+\/$/);
});

test("de Productos con filtros a la ficha, «volver» conserva los filtros", async ({ page }) => {
  await entrarComo(page, dueno);
  const filtros = `/catalogo?q=${encodeURIComponent(`Jabón ${MARCA}`)}&existencias=negativos`;
  await page.goto(filtros);
  await page.getByTestId("lista-catalogo").getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/catalogo/${productoId}`));
  await volver(page);
  await expect(page).toHaveURL(/existencias=negativos/);
});

test("de la ficha a una venta y de vuelta, dos veces, no se acumula el camino", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${productoId}`);
  for (let i = 0; i < 2; i++) {
    await page.getByTestId("historial").getByTestId("de-una-venta").first().click();
    // En la venta antes de volver: si no, el toque puede caer aún en la ficha, y su «volver» es otro.
    await expect(page).toHaveURL(new RegExp(`/ventas/${ventaId}`));
    await volver(page);
    await expect(page).toHaveURL(new RegExp(`/catalogo/${productoId}(\\?|$)`));
  }
  // Y desde la ficha, «volver» sigue llevando a Productos.
  await volver(page);
  await expect(page).toHaveURL(/\/catalogo(\?|$)/);
});
