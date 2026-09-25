// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { anularVenta, registrarVenta } from "../src/domain/venta";
import { diaDelNegocio } from "../src/domain/zona";
import { borrarDueno, crearDueno, entrarComo, entrarPorPantalla, type DuenoDePrueba } from "./apoyo";

/**
 * T-029 · los criterios de Cobalto que no son de una pantalla sola: la portada, la navegación, lo
 * que sigue funcionando sin JavaScript y que nada se salga a 360 px (`.diseno/cobalto`).
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("cobalto");
});
const MARCA = `t29-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.afterAll(async () => {
  const suyas = sql`select id from ${schema.sale} where ${schema.sale.userId} = ${dueno.id}`;
  const suyos = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${suyos})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${suyas})`);
  await db.delete(schema.sale).where(eq(schema.sale.userId, dueno.id));
  await db.delete(schema.product).where(sql`${schema.product.name} like ${`%${MARCA}%`}`);
  await borrarDueno(dueno);
});

test("se entra por Inicio, con lo vendido hoy, y Vender queda a un toque desde cada sección", async ({
  page,
}) => {
  await entrarPorPantalla(page, dueno);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("resumen-del-dia")).toContainText("Vendido hoy");

  const secciones = page.getByRole("navigation", { name: "Secciones" });
  for (const ruta of ["/", "/ventas", "/catalogo", "/ajustes"]) {
    await page.goto(ruta);
    await secciones.getByRole("link", { name: /Vender/ }).click();
    await expect(page).toHaveURL(/\/vender$/);
  }

  // En computador, lo mismo desde el menú lateral.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/ventas");
  await secciones.getByRole("link", { name: /Vender/ }).click();
  await expect(page).toHaveURL(/\/vender$/);
});

test.describe("sin JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("los filtros del catálogo se aplican y la dirección se puede compartir", async ({ page }) => {
    await entrarComo(page, dueno);
    await page.goto("/catalogo");
    // Un `<details>`: se abre sin JavaScript. Las opciones son radios de verdad.
    await page.getByTestId("abrir-filtros").click();
    await page.getByText("En negativo", { exact: true }).click();
    await page.getByRole("button", { name: "Ver productos" }).click();
    await expect(page).toHaveURL(/existencias=negativos/);

    // Y la dirección, abierta en otra visita, da lo mismo.
    const url = page.url();
    await page.goto("/catalogo");
    await page.goto(url);
    await expect(page.getByTestId("abrir-filtros")).toContainText("1");
  });

  test("las fechas de Ventas se piden y el rango queda en la dirección", async ({ page }) => {
    await entrarComo(page, dueno);
    await page.goto("/ventas");
    await page.getByRole("link", { name: "Otras fechas" }).click();
    await page.getByLabel("Desde").fill("2026-09-17");
    await page.getByLabel("Hasta").fill("2026-09-24");
    await page.getByRole("button", { name: "Ver esas fechas" }).click();
    await expect(page).toHaveURL(/desde=2026-09-17&hasta=2026-09-24/);
    await expect(page.getByTestId("resumen-rango")).toContainText("17 de septiembre al 24 de septiembre");

    // Los atajos son enlaces: también sin JavaScript.
    await page.getByRole("link", { name: "Esta semana" }).click();
    await expect(page).toHaveURL(/desde=\d{4}-\d{2}-\d{2}&hasta=\d{4}-\d{2}-\d{2}/);
  });
});

test("a 360 px ninguna pantalla se sale de lado, tampoco con los filtros o las fechas abiertos", async ({
  page,
}) => {
  // Una venta anulada de un importe largo: es la fila más ancha de Ventas y de Inicio, y la que
  // ensanchaba la página a 373 px cuando «Anulada» compartía fila con el importe.
  const [p] = await db
    .insert(schema.product)
    .values({ name: `Canasta ${MARCA}`, price: 58_010, stock: 10 })
    .returning({ id: schema.product.id });
  const venta = nuevoId();
  await registrarVenta(venta, [{ productoId: p!.id, cantidad: 3 }], dueno.id);
  await anularVenta(venta, dueno.id);
  const hoy = diaDelNegocio(new Date());

  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);

  const pantallas = [
    `/ventas?desde=${hoy}&hasta=${hoy}`,
    `/ventas/${venta}`,
    "/",
    "/vender",
    "/catalogo",
    "/catalogo/nuevo",
    "/ventas",
    "/ventas?otras=1",
    "/ajustes",
  ];
  const desbordes: { ruta: string; ancho: number; fuera: string[] }[] = [];
  for (const ruta of pantallas) {
    await page.goto(ruta);
    if (ruta === "/catalogo") await page.getByTestId("abrir-filtros").click();
    const medido = await page.evaluate(() => ({
      ancho: document.documentElement.scrollWidth,
      // Además del scroll, lo que se sale de su control aunque el padre lo recorte: una píldora,
      // una fecha o una etiqueta más anchas que la caja que las contiene.
      fuera: [...document.querySelectorAll<HTMLElement>("[data-control], [data-alerta], label, button, a")]
        .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
        .map((el) => (el.textContent ?? "").trim().slice(0, 30)),
    }));
    if (medido.ancho > 360 || medido.fuera.length) desbordes.push({ ruta, ...medido });
  }
  expect(desbordes, JSON.stringify(desbordes, null, 1)).toEqual([]);
});
