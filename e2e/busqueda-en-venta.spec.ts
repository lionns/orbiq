import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import {
  borrarDueno,
  borrarProductos,
  crearDueno,
  entrarComo,
  sembrarCodigo,
  type DuenoDePrueba,
} from "./apoyo";
import { codigoAleatorio } from "./apoyo/ean13";

/**
 * T-017 · US-016. Buscar por nombre sin salir de la venta.
 *
 * Lo que se fija no es que la búsqueda encuentre —eso es una consulta— sino que **la venta en curso
 * sobreviva** (`AC-023`). Perderla es el fallo que la tarea existe para evitar: hoy el dueño tenía
 * que irse al catálogo y volvía con el carrito vacío.
 */
let dueno: DuenoDePrueba;
const MARCA = `t17-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const CODIGO = codigoAleatorio();
let panelaId: string;

test.beforeAll(async () => {
  dueno = await crearDueno("busqueda");
  const [panela] = await db
    .insert(schema.product)
    .values({ name: `${MARCA} Panela`, price: 3500, stock: 100 })
    .returning({ id: schema.product.id });
  panelaId = panela!.id;
  await sembrarCodigo(panelaId, CODIGO);
  // Sin código: solo se llega a él buscándolo por nombre, que es el caso del brief.
  await db.insert(schema.product).values({ name: `${MARCA} Queso costeño`, price: 9800, stock: 5 });
  await db
    .insert(schema.product)
    .values({ name: `${MARCA} Queso retirado`, price: 1000, stock: 5, isActive: false });
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

test("AC-023 · buscar por nombre no recarga ni pierde la venta en curso", async ({ page }) => {
  await entrarComo(page, dueno);

  // Algo en el carrito primero: es lo que no se puede perder.
  await page.getByTestId("codigo-tecleado").fill(CODIGO);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");

  await page.getByTestId("codigo-tecleado").fill(`${MARCA} Queso`);
  await page.getByTestId("codigo-tecleado").press("Enter");

  await expect(page.getByTestId("encabezado-resultados")).toContainText("1 resultado");
  // El producto retirado existe y también se llama «Queso»: no puede aparecer.
  await expect(page.getByText(`${MARCA} Queso retirado`)).toHaveCount(0);
  // Y la venta sigue ahí, que es el criterio. Mientras se busca, los resultados ocupan su sitio
  // (`T-033`), pero Cobrar sigue diciendo lo que lleva; y al dejar de buscar vuelve entera.
  await expect(page.getByTestId("confirmar")).toContainText("3.500");
  await page.getByTestId("codigo-tecleado").fill("");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");
});

test("tocar un resultado lo añade y vuelve a la venta, con el campo vacío", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.getByTestId("codigo-tecleado").fill(`${MARCA} Queso`);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId("encabezado-resultados")).toBeVisible();

  await page.getByRole("button", { name: new RegExp(`${MARCA} Queso costeño`) }).click();

  await expect(page.getByTestId("venta-en-curso")).toContainText("Queso costeño");
  await expect(page.getByTestId("encabezado-resultados")).toHaveCount(0);
  // Lo buscado ya entró: el texto no se queda arriba sin resultados debajo (`T-033`).
  await expect(page.getByTestId("codigo-tecleado")).toHaveValue("");
});

test("vaciar el campo vuelve a la venta sin tocarla", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.getByTestId("codigo-tecleado").fill(CODIGO);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");

  await page.getByTestId("codigo-tecleado").fill(`${MARCA} Queso`);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId("encabezado-resultados")).toBeVisible();

  await page.getByTestId("codigo-tecleado").fill("");
  await expect(page.getByTestId("encabezado-resultados")).toHaveCount(0);
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");
});

test("un nombre que no existe se dice, y la venta sigue intacta", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.getByTestId("codigo-tecleado").fill(CODIGO);
  await page.getByTestId("codigo-tecleado").press("Enter");

  await page.getByTestId("codigo-tecleado").fill("zzz no existe");
  await page.getByTestId("codigo-tecleado").press("Enter");

  await expect(page.getByTestId("sin-resultados")).toContainText("zzz no existe");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");
});

test("un código válido se sigue resolviendo como código, no como nombre", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.getByTestId("codigo-tecleado").fill(CODIGO);
  await page.getByTestId("codigo-tecleado").press("Enter");

  // Va directo al carrito: no muestra una lista de resultados para elegir.
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");
  await expect(page.getByTestId("encabezado-resultados")).toHaveCount(0);
});

test("NFR-002 · una venta de tres artículos, uno buscado por nombre, cabe en veinte segundos", async ({
  page,
}) => {
  await entrarComo(page, dueno);

  // El cronómetro empieza con la pantalla ya abierta: lo que se mide es registrar la venta, no
  // arrancar la aplicación. Los tres artículos son los del caso de `brief.md` § Success Measures:
  // dos escaneados y uno **sin código**, que antes obligaba a salir de aquí.
  const desde = Date.now();

  await page.getByTestId("codigo-tecleado").fill(CODIGO);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");

  await page.getByTestId("codigo-tecleado").fill(CODIGO);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("2");

  await page.getByTestId("codigo-tecleado").fill(`${MARCA} Queso`);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await page.getByRole("button", { name: new RegExp(`${MARCA} Queso costeño`) }).click();
  await expect(page.getByTestId("venta-en-curso")).toContainText("Queso costeño");

  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toBeVisible();

  const segundos = (Date.now() - desde) / 1000;
  console.log(`venta de tres artículos, uno por nombre: ${segundos.toFixed(1)} s`);
  expect(segundos, "la venta pasó de los veinte segundos de NFR-002").toBeLessThan(20);
});
