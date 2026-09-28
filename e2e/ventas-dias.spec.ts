// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq, inArray, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { registrarVenta } from "../src/domain/venta";
import { borrarDueno, borrarProductos, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-037. Ventas no trae la historia entera: abre en hoy, y un rango largo se recorre de 7 en 7
 * días. Medido antes: sin fechas, 20.000 ventas en una página de 60 MB.
 */
// En un solo trabajador: los días sembrados son fijos, y dos trabajadores sembrarían dos veces.
test.describe.configure({ mode: "serial" });

let dueno: DuenoDePrueba;
const MARCA = `t37d-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
// Un año que ninguna otra prueba toca: los días sembrados son solo de esta.
const DIAS = Array.from({ length: 9 }, (_, i) => `2034-03-${String(10 + i).padStart(2, "0")}`);
const ventas: string[] = [];

test.beforeAll(async () => {
  dueno = await crearDueno("ventas-dias");
  const [p] = await db
    .insert(schema.product)
    .values({ name: `Días ${MARCA}`, price: 1000, stock: 0 })
    .returning({ id: schema.product.id });
  for (const dia of DIAS) {
    const id = nuevoId();
    await registrarVenta(id, [{ productoId: p!.id, cantidad: 1 }], dueno.id);
    // Al mediodía de Bogotá: el día del negocio es ese, sin importar la zona de la base.
    await db.update(schema.sale).set({ createdAt: new Date(`${dia}T17:00:00Z`) }).where(eq(schema.sale.id, id));
    ventas.push(id);
  }
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(inArray(schema.saleLine.saleId, ventas));
  await db.delete(schema.sale).where(inArray(schema.sale.id, ventas));
  await borrarProductos(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

test("sin fechas, Ventas abre en hoy y no trae días anteriores", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.goto("/ventas");
  await expect(page.getByRole("link", { name: "Hoy", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId(`dia-${DIAS[0]}`)).toHaveCount(0);
});

test("un rango largo enseña 7 días, y «Ver más días» trae los siguientes con la suma de todo el rango", async ({
  page,
}) => {
  await entrarComo(page, dueno);
  await page.goto(`/ventas?desde=${DIAS[0]}&hasta=${DIAS.at(-1)}`);
  await expect(page.locator('[data-testid^="dia-2034-"]')).toHaveCount(7);
  // Los más recientes primero; los dos más antiguos esperan.
  await expect(page.getByTestId(`dia-${DIAS.at(-1)}`)).toBeVisible();
  await expect(page.getByTestId(`dia-${DIAS[0]}`)).toHaveCount(0);
  // La suma es la de todo el rango, no la de los días a la vista.
  await expect(page.getByTestId("resumen-rango")).toContainText("9 ventas");

  await page.getByTestId("ver-mas-dias").click();
  await expect(page.locator('[data-testid^="dia-2034-"]')).toHaveCount(9);
  await expect(page).toHaveURL(/dias=14/);
  await expect(page.getByTestId("ver-mas-dias")).toHaveCount(0);
});
