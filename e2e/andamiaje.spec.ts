// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * D-006: la rebanada es la prueba. Esta es la mínima que puede existir — que la aplicación cargue
 * en un celular. Cada rebanada siguiente añade la suya, y esta se sigue corriendo.
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("andamiaje");
});

test.afterAll(async () => {
  await borrarDueno(dueno);
});

test("la aplicación carga en un celular", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

/**
 * AC-X06: la prueba recorre pantalla, servidor y base con datos reales. Escribe en Neon y espera
 * verlo de vuelta en la pantalla; si el driver, la migración o el esquema estuvieran mal, falla.
 */
test("lo que se escribe en la base aparece en la pantalla", async ({ page }) => {
  const nombre = `Prueba de andamiaje ${Date.now()}`;
  const creados = await db
    .insert(schema.product)
    .values({ name: nombre, price: 1500 })
    .returning({ id: schema.product.id });
  const creado = creados[0];
  expect(creado, "el insert debió devolver la fila creada").toBeDefined();

  try {
    await entrarComo(page, dueno);
    await page.goto(`/catalogo?q=${encodeURIComponent(nombre)}`);
    await expect(page.getByTestId("lista-catalogo")).toContainText(nombre);
  } finally {
    await db.delete(schema.product).where(eq(schema.product.id, creado!.id));
  }
});
