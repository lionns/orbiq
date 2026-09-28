// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { like } from "drizzle-orm";
import { db, schema } from "../src/db";
import { borrarDueno, borrarProductos, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-021. El suelo tipográfico, comprobado y no prometido.
 *
 * `design-handoff.md` § Typography dice que no hay texto por debajo de 14 px. Escrito en un
 * documento eso dura hasta el primer `text-xs` que alguien añada con prisa; aquí falla la suite.
 */
let dueno: DuenoDePrueba;
const MARCA = `t21-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let medible: string;

test.beforeAll(async () => {
  dueno = await crearDueno("tipografia");
  // Propio: la jerarquía se mide en una fila de resultados, y no puede depender de lo que hayan
  // sembrado las pruebas vecinas (la suite pasa contra una base vacía).
  const [p] = await db
    .insert(schema.product)
    .values({ name: `Tipografía ${MARCA}`, price: 12500, stock: 7 })
    .returning({ id: schema.product.id });
  medible = p!.id;
});
test.afterAll(async () => {
  await borrarProductos(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

const SUELO = 14;

/** Todo elemento con texto propio y su tamaño calculado. Solo lo que se ve. */
async function textosPequenos(page: Page): Promise<{ que: string; px: number }[]> {
  return page.evaluate((suelo) => {
    const hallazgos: { que: string; px: number }[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      // Solo nodos con texto propio: si se mira el contenedor, se cuenta el mismo texto dos veces.
      const propio = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (!propio) continue;
      if (el.offsetParent === null) continue; // no está a la vista
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.opacity === "0") continue;
      // La clase que oculta para la vista pero deja el texto al lector de pantalla no cuenta:
      // nadie lo lee con los ojos, y encogerlo es justo su manera de funcionar.
      if (el.classList.contains("sr-only")) continue;
      const px = parseFloat(s.fontSize);
      if (px < suelo) hallazgos.push({ que: `${el.tagName}: ${propio.slice(0, 32)}`, px });
    }
    return hallazgos;
  }, SUELO);
}

const PANTALLAS = ["/", "/vender", "/catalogo", "/catalogo/nuevo", "/ventas", "/ajustes"] as const;

test("ninguna pantalla escribe por debajo del suelo de 14 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);

  const todo: { donde: string; que: string; px: number }[] = [];
  for (const ruta of PANTALLAS) {
    await page.goto(ruta);
    todo.push(...(await textosPequenos(page)).map((h) => ({ ...h, donde: ruta })));
  }

  expect(todo, JSON.stringify(todo, null, 1)).toEqual([]);
});

test("en los resultados de la venta manda el precio, le sigue el nombre y las existencias no encogen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await page.getByTestId("codigo-tecleado").fill(`Tipografía ${MARCA}`);
  await page.getByTestId("codigo-tecleado").press("Enter");

  // Una fila de resultados: el nombre y las existencias apilados, luego el precio (`T-033`).
  const fila = page.getByTestId(`resultado-${medible}`);
  await expect(fila).toBeVisible();

  const medido = await fila.evaluate((el) => {
    const px = (sel: string) => parseFloat(getComputedStyle(el.querySelector(sel)!).fontSize);
    return {
      nombre: px(":scope > span:first-child > span:first-child"),
      precio: px(":scope > span:nth-child(2)"),
      existencias: px(":scope > span:first-child > span:last-child"),
    };
  });

  expect(medido.precio).toBeGreaterThan(medido.nombre);
  expect(medido.nombre).toBeGreaterThan(medido.existencias);
  // Las existencias son la nota, pero no bajan de 16: verlas es la salvaguarda del saldo negativo.
  expect(medido.existencias).toBeGreaterThanOrEqual(16);
});
