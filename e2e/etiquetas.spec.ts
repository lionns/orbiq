// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { codigoDeLaTienda, digitoDeControl, esDeLaTienda } from "../src/domain/ean13";
import {
  borrarDueno,
  borrarProductos,
  crearDueno,
  entrarComo,
  sembrarCodigo,
  type DuenoDePrueba,
} from "./apoyo";

/**
 * T-038 · `D-012`. Un producto que no trae código recibe uno de la tienda, sus unidades pasan a él,
 * y sus etiquetas se eligen desde Productos y salen en hojas carta. Contra la base real (`D-006`).
 */
let dueno: DuenoDePrueba;
const MARCA = `t38-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("etiquetas");
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

/** Un producto con existencias iniciales y, si se da, un código. Sin código: granel, pan, yucas. */
async function sembrar(nombre: string, existencias: number, codigo?: string) {
  const [p] = await db
    .insert(schema.product)
    .values({ name: `${nombre} ${MARCA}`, price: 500, stock: existencias })
    .returning({ id: schema.product.id, nombre: schema.product.name });
  const codigoId = codigo ? await sembrarCodigo(p!.id, codigo) : null;
  await db.insert(schema.stockMovement).values({
    productId: p!.id,
    barcodeId: codigoId,
    quantity: existencias,
    type: "initial",
    userId: dueno.id,
  });
  return p!;
}

/** Un código de fábrica: nunca empieza por 2 (`D-012`). */
function codigoDeFabrica(): string {
  const doce = `770${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`;
  return doce + digitoDeControl(doce);
}

async function libro(productoId: string) {
  return db
    .select({
      tipo: schema.stockMovement.type,
      cantidad: schema.stockMovement.quantity,
      codigo: schema.productBarcode.code,
    })
    .from(schema.stockMovement)
    .leftJoin(schema.productBarcode, eq(schema.productBarcode.id, schema.stockMovement.barcodeId))
    .where(eq(schema.stockMovement.productId, productoId));
}

test("AC-029 · AC-030 · AC-031 · generar el código pasa las unidades a él, y escanearlo vende de él", async ({
  page,
}) => {
  const pan = await sembrar("Pan francés", 12);
  await entrarComo(page, dueno);

  await page.goto(`/catalogo/${pan.id}`);
  await page.getByTestId("generar-codigo").click();

  // «Código listo»: de la tienda, y dice que las doce pasan a él.
  await expect(page).toHaveURL(new RegExp(`/catalogo/${pan.id}/codigo-listo`));
  const codigo = (await page.getByTestId("codigo-generado").textContent())!.trim();
  expect(esDeLaTienda(codigo)).toBe(true);
  await expect(page.getByTestId("pasaron")).toContainText("Las 12 que hay pasan a este código");
  await expect(page.getByTestId("copias")).toHaveValue("12");
  await expect(page.getByTestId("imprimir-codigo")).toContainText("Imprimir 12 etiquetas");

  // El libro: un par que suma cero, y el total igual (`D-002`).
  const movimientos = await libro(pan.id);
  const etiquetado = movimientos.filter((m) => m.tipo === "relabel");
  expect(etiquetado.map((m) => [m.cantidad, m.codigo]).sort()).toEqual(
    [
      [-12, null],
      [12, codigo],
    ].sort(),
  );
  const [producto] = await db.select().from(schema.product).where(eq(schema.product.id, pan.id));
  expect(producto!.stock).toBe(12);

  // La ficha: todo en el código, sin grupo «Sin código» en cero, y una línea «Etiquetado».
  await page.getByRole("link", { name: "Ahora no" }).click();
  await expect(page.getByTestId("fila-codigo")).toHaveCount(1);
  await expect(page.getByTestId("fila-codigo")).toContainText(codigo);
  await expect(page.getByTestId("fila-codigo")).toContainText("12");
  await expect(page.getByTestId("evento-etiquetado")).toContainText(`12 de «sin código» a …${codigo.slice(-4)}`);
  await expect(page.getByTestId("generar-codigo")).toHaveCount(0);
  // El par cuenta como lo que se ve: una línea, no dos.
  await expect(page.getByText("2 movimientos, suman 12")).toBeVisible();

  // En la venta se escanea como cualquier otro, y sale de ese código.
  await page.goto("/vender");
  await page.getByTestId("codigo-tecleado").fill(codigo);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId(`cantidad-${pan.id}`)).toHaveText("1");
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toBeVisible();
  const venta = (await libro(pan.id)).filter((m) => m.tipo === "sale");
  expect(venta.map((m) => [m.cantidad, m.codigo])).toEqual([[-1, codigo]]);
});

test("un producto sin unidades recibe su código sin movimientos de más", async ({ page }) => {
  // «Yuca» y no otro: un producto en cero sale en «por reponer» de Inicio, que enseña los tres
  // primeros por nombre. Con uno que ordena al final no le quita el sitio a los de otras pruebas.
  const yuca = await sembrar("Yuca", 0);
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${yuca.id}`);
  await page.getByTestId("generar-codigo").click();
  await expect(page.getByTestId("codigo-generado")).toBeVisible();
  await expect(page.getByTestId("pasaron")).toHaveCount(0);
  expect((await libro(yuca.id)).filter((m) => m.tipo === "relabel")).toEqual([]);
});

test("las etiquetas se eligen buscando: lo marcado sobrevive a otra búsqueda y sale en hojas de 30", async ({
  page,
}) => {
  const queso = await sembrar("Queso campesino", 3, codigoDeLaTienda());
  await sembrar("Pan francés", 12, codigoDeLaTienda());
  await sembrar("Arroz", 40, codigoDeFabrica());
  const [codigoQueso] = await db
    .select({ code: schema.productBarcode.code })
    .from(schema.productBarcode)
    .where(eq(schema.productBarcode.productId, queso.id));

  await entrarComo(page, dueno);
  await page.goto("/catalogo");
  await page.getByTestId("ir-a-etiquetas").click();

  // Solo salen los de código de la tienda: el arroz trae el suyo impreso.
  await page.getByTestId("buscar-etiquetas").fill(MARCA);
  await page.getByTestId("buscar-etiquetas").press("Enter");
  const resultados = page.getByTestId("resultados-etiquetas");
  await expect(resultados.getByTestId("marcar-etiqueta")).toHaveCount(2);
  await expect(resultados).not.toContainText("Arroz");

  // Buscar el queso, marcarlo; buscar el pan, marcarlo. El queso sigue marcado.
  await page.getByTestId("buscar-etiquetas").fill(`Queso campesino ${MARCA}`);
  await page.getByTestId("buscar-etiquetas").press("Enter");
  await expect(resultados.getByTestId("marcar-etiqueta")).toHaveCount(1);
  await resultados.getByTestId("marcar-etiqueta").click();
  await expect(resultados.getByTestId("marcar-etiqueta")).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("buscar-etiquetas").fill(`Pan francés ${MARCA}`);
  await page.getByTestId("buscar-etiquetas").press("Enter");
  await expect(resultados.getByTestId("marcar-etiqueta")).toHaveAttribute("aria-pressed", "false");
  await resultados.getByTestId("marcar-etiqueta").click();
  await expect(page.getByTestId("marcados")).toContainText("2 productos marcados");
  await expect(page.getByTestId("marcados")).toContainText("Queso campesino");

  // Cuántas de cada uno: una por unidad que hay, en el orden en que se marcaron.
  await page.getByTestId("siguiente-etiquetas").click();
  const copias = page.getByTestId("copias");
  await expect(copias).toHaveCount(2);
  await expect(copias.nth(0)).toHaveValue("3");
  await expect(copias.nth(1)).toHaveValue("12");
  await expect(page.getByTestId("total-etiquetas")).toContainText("15 etiquetas");
  await copias.nth(1).fill("30");
  await expect(page.getByTestId("total-etiquetas")).toContainText("33 etiquetas");
  await expect(page.getByTestId("total-etiquetas")).toContainText("2 hojas");

  // La hoja: 33 etiquetas en dos hojas carta; la primera es del queso, con su código.
  await page.getByTestId("ver-hoja").click();
  await expect(page.getByTestId("hoja")).toHaveCount(2);
  await expect(page.getByTestId("etiqueta")).toHaveCount(33);
  await expect(page.getByTestId("hoja").nth(0).getByTestId("etiqueta")).toHaveCount(30);
  const primera = page.getByTestId("etiqueta").first();
  await expect(primera).toContainText("Queso campesino");
  await expect(primera.locator("svg")).toHaveAttribute("data-codigo", codigoQueso!.code);
  await expect(page.getByTestId("etiqueta").last()).toContainText("Pan francés");
});
