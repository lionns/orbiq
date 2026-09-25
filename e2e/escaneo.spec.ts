import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";
import { codigoAleatorio } from "./apoyo/ean13";

/**
 * T-016 · US-003, US-004. El objetivo de escaneo recorrido entero contra la base real (`D-006`).
 *
 * Lo que se fija aquí no es cada entrada por su lado, sino que **las tres terminan en el mismo
 * sitio** (`AC-006`). El camino de cámara vive en `escaneo-camara.spec.ts` porque necesita un
 * navegador arrancado de otra forma.
 */
let dueno: DuenoDePrueba;
const MARCA = `t16-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
// Propios de este trabajador: la suite corre en paralelo y el código es único en la base.
const CONOCIDO = codigoAleatorio();
const DESCONOCIDO = codigoAleatorio();

let panelaId: string;

test.beforeAll(async () => {
  dueno = await crearDueno("escaneo");
  const [creado] = await db
    .insert(schema.product)
    .values({ name: `Panela ${MARCA}`, price: 3500, stock: 10, barcode: CONOCIDO })
    .returning({ id: schema.product.id });
  panelaId = creado!.id;
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  const ventas = sql`select id from ${schema.sale} where ${schema.sale.userId} = ${dueno.id}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${ventas})`);
  await db.delete(schema.sale).where(eq(schema.sale.userId, dueno.id));
  await db.delete(schema.product).where(like(schema.product.name, `%${MARCA}%`));
  await db.delete(schema.product).where(eq(schema.product.barcode, DESCONOCIDO));
  await borrarDueno(dueno);
});

/** Teclea como lo hace una pistola lectora: ráfaga rápida y Enter, sin foco en ningún campo. */
async function dispararLector(page: Page, codigo: string) {
  // Quitar el foco de cualquier campo tocando algo que no hace nada: el título. El centro de la
  // página ya no sirve, porque en Productos cae sobre una fila, que es un enlace (`T-029`).
  await page.getByRole("heading", { level: 1 }).first().click();
  for (const d of codigo) await page.keyboard.press(d, { delay: 5 });
  await page.keyboard.press("Enter");
}

test("AC-006 · tecleado y lector llegan al mismo resultado", async ({ page }) => {
  await entrarComo(page, dueno);

  // Entrada 1: tecleado a mano.
  await page.getByTestId("codigo-tecleado").fill(CONOCIDO);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("1");

  // Entrada 2: la pistola lectora, sobre la misma pantalla y sin tocar nada más.
  await dispararLector(page, CONOCIDO);

  // Mismo producto por dos puertas distintas: una sola línea con dos unidades. La aserción
  // reintenta a propósito — resolver el código es un viaje al servidor, y leer el total una sola
  // vez comprobaría lo rápido que responde la red, no que las dos entradas coinciden.
  await expect(page.getByTestId(`cantidad-${panelaId}`)).toHaveText("2");
  await expect(page.getByTestId("venta-en-curso").locator("li")).toHaveCount(1);
});

test("AC-X02 · escribir en un campo no se confunde con escanear", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.goto("/catalogo/nuevo");

  // Los mismos dígitos, en un campo de texto y a ritmo de lector. Si el objetivo robara las teclas,
  // el nombre quedaría vacío y la pantalla habría navegado sola.
  const nombre = page.getByLabel("Nombre");
  await nombre.click();
  for (const d of CONOCIDO) await nombre.press(d, { delay: 5 });

  await expect(nombre).toHaveValue(CONOCIDO);
  await expect(page).toHaveURL(/\/catalogo\/nuevo$/);
});

test("AC-007 · un código desconocido se da de alta sin perder la venta", async ({ page }) => {
  await entrarComo(page, dueno);

  // Primero algo en el carrito: es lo que no se puede perder.
  await page.getByTestId("codigo-tecleado").fill(CONOCIDO);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId("venta-en-curso")).toContainText("Panela");

  await page.getByTestId("codigo-tecleado").fill(DESCONOCIDO);
  await page.getByTestId("codigo-tecleado").press("Enter");

  const alta = page.getByTestId("alta-rapida");
  await expect(alta).toContainText(DESCONOCIDO);
  await alta.getByTestId("alta-rapida-nombre").fill(`Bolsa ${MARCA}`);
  await alta.getByTestId("alta-rapida-precio").fill("1200");
  await alta.getByTestId("alta-rapida-guardar").click();

  // El producto nuevo entró, y la Panela sigue donde estaba: la venta no se perdió.
  await expect(page.getByTestId("venta-en-curso")).toContainText("Bolsa");
  await expect(page.getByTestId("venta-en-curso")).toContainText("Panela");
  await expect(page.getByTestId("venta-en-curso").locator("li")).toHaveCount(2);

  // Y quedó en la base con su código, no solo en la pantalla.
  const [creado] = await db
    .select({ codigo: schema.product.barcode, precio: schema.product.price })
    .from(schema.product)
    .where(eq(schema.product.barcode, DESCONOCIDO));
  expect(creado?.precio).toBe(1200);
});

test("lo que no tiene forma de código se busca como nombre", async ({ page }) => {
  await entrarComo(page, dueno);

  // Hasta `T-016` esto era un callejón: «no parece un código de barras» y ahí acababa. `T-017`
  // cambió el contrato a propósito — el mismo campo acepta nombre o código, y quien decide qué era
  // es la función de dominio. Un trozo de código que no coincide con nada cae en «sin resultados».
  // Un trozo del código sembrado por esta prueba: no es un código válido —le faltan dígitos— pero
  // sí encuentra el producto. Un literal fijo no serviría: la búsqueda también mira el código, y
  // cualquier prefijo suelto engancharía con lo que haya sembrado en la base.
  await page.getByTestId("codigo-tecleado").fill(CONOCIDO.slice(0, 7));
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId("escaneo-ilegible")).toHaveCount(0);
  await expect(page.getByTestId("encabezado-resultados")).toContainText("1 resultado");
  await expect(page.getByTestId(`casilla-${panelaId}`)).toBeVisible();
});

test("desde el catálogo, el lector abre la ficha del producto", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.goto("/catalogo");

  // Aquí el objetivo no trae campo: el catálogo ya tiene uno que busca por nombre o código, y dos
  // cuadros que aceptan lo mismo son una duda, no una entrada más. Queda la pistola y la cámara.
  await dispararLector(page, CONOCIDO);

  await expect(page).toHaveURL(/\/catalogo\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: /Panela/ })).toBeVisible();
});
