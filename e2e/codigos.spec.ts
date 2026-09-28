// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { anularVenta, registrarVenta } from "../src/domain/venta";
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
 * T-032 · `D-010`. El proveedor cambió el código de un producto que ya se vende: se añade el código
 * nuevo a ese producto, y cada código lleva su cantidad. Recorrido contra la base real (`D-006`).
 */
let dueno: DuenoDePrueba;
const MARCA = `t32-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("codigos");
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

/** Un producto con un código y unas existencias iniciales de ese código, como lo deja el alta. */
async function sembrar(nombre: string, precio: number, existencias: number) {
  const [p] = await db
    .insert(schema.product)
    .values({ name: `${nombre} ${MARCA}`, price: precio, stock: existencias })
    .returning({ id: schema.product.id, nombre: schema.product.name });
  const codigo = codigoAleatorio();
  const codigoId = await sembrarCodigo(p!.id, codigo);
  await db.insert(schema.stockMovement).values({
    productId: p!.id,
    barcodeId: codigoId,
    quantity: existencias,
    type: "initial",
    userId: dueno.id,
  });
  return { ...p!, codigo, codigoId };
}

/** Lo que el libro dice de cada código de un producto: la única definición de «cuánto hay». */
async function porCodigo(productoId: string) {
  const filas = await db
    .select({
      codigoId: schema.stockMovement.barcodeId,
      cantidad: sql<number>`sum(${schema.stockMovement.quantity})::int`,
    })
    .from(schema.stockMovement)
    .where(eq(schema.stockMovement.productId, productoId))
    .groupBy(schema.stockMovement.barcodeId);
  return new Map(filas.map((f) => [f.codigoId, f.cantidad]));
}

async function stockDe(productoId: string) {
  const [p] = await db
    .select({ stock: schema.product.stock })
    .from(schema.product)
    .where(eq(schema.product.id, productoId));
  return p!.stock;
}

test("AC-025 · AC-026 · el código que cambió se añade al producto desde la venta, sin perderla", async ({
  page,
}) => {
  const arroz = await sembrar("Arroz", 3500, 4);
  const pan = await sembrar("Pan", 500, 20);
  const nuevo = codigoAleatorio();

  await entrarComo(page, dueno);
  // Algo en la venta primero: es lo que no se puede perder.
  await page.getByTestId("codigo-tecleado").fill(pan.codigo);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${pan.id}`)).toHaveText("1");

  // El código nuevo del arroz: no está. Dos salidas, «ya lo vendo» primero.
  await page.getByTestId("codigo-tecleado").fill(nuevo);
  await page.getByTestId("codigo-tecleado").press("Enter");
  const hoja = page.getByTestId("codigo-desconocido");
  await expect(hoja).toContainText(nuevo);
  const caminos = hoja.locator("[data-testid^=camino-]");
  await expect(caminos.first()).toHaveAttribute("data-testid", "camino-existente");
  await page.getByTestId("camino-existente").click();

  // Se busca por nombre y el resultado dice qué códigos tiene ya.
  await page.getByTestId("buscar-producto-para-codigo").fill(`Arroz ${MARCA}`);
  await expect(page.getByTestId(`candidato-${arroz.id}`)).toContainText("1 código · Hay 4");
  await page.getByTestId(`candidato-${arroz.id}`).click();

  const confirmar = page.getByTestId("confirmar-codigo");
  await expect(confirmar).toContainText(arroz.codigo);
  await expect(confirmar).toContainText(nuevo);
  await page.getByTestId("llegaron").fill("24");
  await expect(confirmar).toContainText("quedan 28 en total");
  await page.getByTestId("guardar-codigo").click();

  // De vuelta en la venta: el arroz entró con su código nuevo, y el pan sigue ahí.
  await expect(page.getByTestId("venta-en-curso")).toContainText("Arroz");
  await expect(page.getByTestId("venta-en-curso")).toContainText(`Código …${nuevo.slice(-4)}`);
  await expect(page.getByTestId(`cantidad-${pan.id}`)).toHaveText("1");

  // En la base: el código es del arroz, llegaron 24 con él, y el total se leyó del libro.
  const [codigo] = await db
    .select()
    .from(schema.productBarcode)
    .where(eq(schema.productBarcode.code, nuevo));
  expect(codigo!.productId).toBe(arroz.id);
  const llegadas = await db
    .select()
    .from(schema.stockMovement)
    .where(and(eq(schema.stockMovement.productId, arroz.id), eq(schema.stockMovement.type, "purchase")));
  expect(llegadas.map((m) => [m.quantity, m.barcodeId])).toEqual([[24, codigo!.id]]);
  expect(await stockDe(arroz.id)).toBe(28);

  // Cobrar: lo escaneado sale del código nuevo, no del viejo (`AC-027`).
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toBeVisible();
  const cantidades = await porCodigo(arroz.id);
  expect(cantidades.get(arroz.codigoId)).toBe(4);
  expect(cantidades.get(codigo!.id)).toBe(23);
  expect(await stockDe(arroz.id)).toBe(27);

  // Y la próxima vez se reconoce solo.
  await page.getByTestId("codigo-tecleado").fill(nuevo);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${arroz.id}`)).toHaveText("1");
  await expect(page.getByTestId("codigo-desconocido")).toHaveCount(0);
});

test("AC-004 · un código de otro producto no se puede añadir: se nombra al que lo tiene", async ({
  page,
}) => {
  const leche = await sembrar("Leche", 4200, 5);
  const cafe = await sembrar("Café", 11000, 3);

  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${cafe.id}`);
  await page.getByTestId("abrir-codigo").locator("summary").click();
  await page.getByTestId("codigo-nuevo").fill(leche.codigo);
  await page.getByTestId("guardar-codigo-ficha").click();
  await expect(page.getByText(`Ese código ya es de «${leche.nombre}».`)).toBeVisible();
});

test("AC-027 · lo vendido sin escanear sale del código más antiguo, y la anulación lo devuelve a cada uno", async () => {
  // Se llama al dominio: la regla vive ahí, y por la pantalla se probó arriba con el escaneo.
  const aceite = await sembrar("Aceite", 9000, 4);
  const [nuevo] = await db
    .insert(schema.productBarcode)
    .values({ productId: aceite.id, code: codigoAleatorio() })
    .returning({ id: schema.productBarcode.id });
  await db.insert(schema.stockMovement).values({
    productId: aceite.id,
    barcodeId: nuevo!.id,
    quantity: 24,
    type: "purchase",
    userId: dueno.id,
  });

  // Seis sin escanear: las cuatro del viejo y dos del nuevo. Y una escaneada del nuevo.
  const ventaId = nuevoId();
  await registrarVenta(
    ventaId,
    [
      { productoId: aceite.id, cantidad: 6 },
      { productoId: aceite.id, cantidad: 1, codigoId: nuevo!.id },
    ],
    dueno.id,
  );
  let cantidades = await porCodigo(aceite.id);
  expect(cantidades.get(aceite.codigoId)).toBe(0);
  // 24 − 1 escaneada − 2 que no cupieron en el viejo. La escaneada va primero, sobre el mismo saldo.
  expect(cantidades.get(nuevo!.id)).toBe(21);
  expect(await stockDe(aceite.id)).toBe(21);

  // Anular devuelve a cada código exactamente lo que salió de él.
  await anularVenta(ventaId, dueno.id);
  cantidades = await porCodigo(aceite.id);
  expect(cantidades.get(aceite.codigoId)).toBe(4);
  expect(cantidades.get(nuevo!.id)).toBe(24);
  expect(await stockDe(aceite.id)).toBe(28);
  const devueltas = await db
    .select()
    .from(schema.stockMovement)
    .where(and(eq(schema.stockMovement.saleId, ventaId), eq(schema.stockMovement.type, "sale_void")));
  expect(devueltas.reduce((s, m) => s + m.quantity, 0)).toBe(7);
});

test("la ficha dice cuánto hay de cada código, y el conteo se corrige por código", async ({ page }) => {
  const azucar = await sembrar("Azúcar", 5200, 6);
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${azucar.id}`);

  // Añadir otro código desde la ficha, con lo que llegó.
  const nuevo = codigoAleatorio();
  await page.getByTestId("abrir-codigo").locator("summary").click();
  await page.getByTestId("codigo-nuevo").fill(nuevo);
  await page.getByTestId("llegaron-ficha").fill("10");
  await page.getByTestId("guardar-codigo-ficha").click();
  await expect(page.getByTestId("codigo-hecho")).toContainText("10 unidades");

  await page.reload();
  const filas = page.getByTestId("por-codigo").getByTestId("fila-codigo");
  await expect(filas).toHaveCount(2);
  await expect(filas.nth(0)).toContainText(azucar.codigo);
  await expect(filas.nth(0)).toContainText("6");
  await expect(filas.nth(0)).toContainText("se vende primero");
  await expect(filas.nth(1)).toContainText(nuevo);
  await expect(filas.nth(1)).toContainText("10");
  await expect(page.getByTestId("historial")).toContainText("Llegaron");

  // Corregir el conteo del código viejo: se contaron 5, falta una.
  await page.getByTestId("abrir-ajuste").locator("summary").click();
  const hoja = page.getByRole("dialog", { name: "Corregir el conteo" });
  const [viejo] = await db
    .select({ id: schema.productBarcode.id })
    .from(schema.productBarcode)
    .where(eq(schema.productBarcode.code, azucar.codigo));
  await hoja.getByTestId(`grupo-${viejo!.id}`).click();
  await hoja.getByTestId("conteo").fill("5");
  await hoja.getByRole("button", { name: "Se dañó" }).click();
  await hoja.getByTestId("guardar-ajuste").click();
  await expect(hoja.getByTestId("ajuste-hecho")).toBeVisible();

  const cantidades = await porCodigo(azucar.id);
  expect(cantidades.get(viejo!.id)).toBe(5);
  expect(await stockDe(azucar.id)).toBe(15);
});

test("desde Productos, un código desconocido se añade a un producto y abre su ficha", async ({
  page,
}) => {
  const galletas = await sembrar("Galletas", 2500, 3);
  const nuevo = codigoAleatorio();
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/codigo?codigo=${nuevo}`);

  await page.getByTestId("buscar-producto-para-codigo").fill(`Galletas ${MARCA}`);
  await page.getByTestId(`candidato-${galletas.id}`).click();
  await page.getByTestId("guardar-codigo").click();

  await expect(page).toHaveURL(new RegExp(`/catalogo/${galletas.id}`));
  await expect(page.getByTestId("por-codigo")).toContainText(nuevo);
  const codigos = await db
    .select({ code: schema.productBarcode.code })
    .from(schema.productBarcode)
    .where(inArray(schema.productBarcode.productId, [galletas.id]));
  expect(codigos.map((c) => c.code).sort()).toEqual([galletas.codigo, nuevo].sort());
});
