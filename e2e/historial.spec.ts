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

async function ajustar(page: Page, conteo: string, motivo: string) {
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
  await expect(page).toHaveURL(new RegExp(`/catalogo/${p.id}$`));

  // AC-014: tipo, cantidad, motivo y fecha; y la suma coincide con las existencias.
  const historial = page.getByTestId("historial");
  await expect(historial.locator("li")).toHaveCount(2);
  await expect(historial).toContainText("Existencias iniciales");
  await expect(historial).toContainText("+10");
  await expect(historial).toContainText("Venta");
  await expect(historial).toContainText("-3");
  await expect(historial).toContainText("De una venta");
  await expect(page.getByTestId("historial").locator("li").first()).toContainText("Venta");

  await expect(page.getByText("2 movimientos · suman 7")).toBeVisible();
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
  await expect(page.getByText("2 movimientos · suman 26")).toBeVisible();
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
  const boton = await page.getByTestId("guardar-ajuste").boundingBox();
  expect(boton!.height).toBeGreaterThanOrEqual(48);
});
