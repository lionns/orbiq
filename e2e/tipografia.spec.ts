// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-021. El suelo tipográfico, comprobado y no prometido.
 *
 * `design-handoff.md` § Typography dice que no hay texto por debajo de 14 px. Escrito en un
 * documento eso dura hasta el primer `text-xs` que alguien añada con prisa; aquí falla la suite.
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("tipografia");
});
test.afterAll(async () => {
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

const PANTALLAS = ["/", "/catalogo", "/catalogo/nuevo", "/ventas"] as const;

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

test("en la cuadrícula manda el precio, le sigue el nombre y las existencias no encogen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);

  // La primera casilla que haya: la jerarquía es del componente, no de un producto concreto.
  const casilla = page.locator('[data-testid^="casilla-"]').first();
  await expect(casilla).toBeVisible();

  const medido = await casilla.evaluate((el) => {
    const px = (sel: string) => parseFloat(getComputedStyle(el.querySelector(sel)!).fontSize);
    const hijos = [...el.querySelectorAll("span")];
    return {
      nombre: parseFloat(getComputedStyle(hijos[0]!).fontSize),
      precio: px("[data-testid], span > span:first-child") ,
      existencias: parseFloat(
        getComputedStyle(el.querySelector("[data-alerta], span > span:last-child")!).fontSize,
      ),
    };
  });

  expect(medido.precio).toBeGreaterThan(medido.nombre);
  expect(medido.nombre).toBeGreaterThan(medido.existencias);
  // Las existencias son la nota, pero no bajan de 16: verlas es la salvaguarda del saldo negativo.
  expect(medido.existencias).toBeGreaterThanOrEqual(16);
});
