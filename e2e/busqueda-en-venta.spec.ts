import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { registrarVenta } from "../src/domain/venta";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";
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
    .values({ name: `${MARCA} Panela`, price: 3500, stock: 100, barcode: CODIGO })
    .returning({ id: schema.product.id });
  panelaId = panela!.id;
  // La panela se toca en la cuadrícula: tiene que haberse vendido, y más que lo que venden las
  // pruebas vecinas a la vez, o queda fuera de los 24 que se enseñan (`venta.spec`).
  await registrarVenta(nuevoId(), [{ productoId: panelaId, cantidad: 60 }], dueno.id);
  // Sin código y sin ventas: no sale en la cuadrícula de frecuentes, que es el caso del brief.
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
  await db.delete(schema.product).where(like(schema.product.name, `%${MARCA}%`));
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
  // Y la venta sigue ahí, que es el criterio.
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");
});

test("tocar un resultado lo añade y devuelve la cuadrícula de frecuentes", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.getByTestId("codigo-tecleado").fill(`${MARCA} Queso`);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId("encabezado-resultados")).toBeVisible();

  await page.getByRole("button", { name: new RegExp(`${MARCA} Queso costeño`) }).click();

  await expect(page.getByTestId("venta-en-curso")).toContainText("Queso costeño");
  await expect(page.getByTestId("encabezado-resultados")).toHaveCount(0);
});

test("vaciar el campo vuelve a los frecuentes sin tocar la venta", async ({ page }) => {
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
  // uno escaneado, uno de la cuadrícula y uno **sin código**, que antes obligaba a salir de aquí.
  const desde = Date.now();

  await page.getByTestId("codigo-tecleado").fill(CODIGO);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");

  await page.getByTestId(`casilla-${panelaId}`).click();
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
