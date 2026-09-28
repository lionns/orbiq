// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-022. La regla de `design-handoff.md` § Accessibility Notes, fijada y no prometida: ningún
 * estado se comunica solo por icono. Escrita en un documento dura hasta el primer botón que alguien
 * deja con un dibujo y sin palabra; aquí falla la suite.
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("iconos");
});
test.afterAll(async () => {
  await borrarDueno(dueno);
});

const PANTALLAS = ["/", "/vender", "/catalogo", "/catalogo/nuevo", "/ventas", "/ajustes"] as const;

/** Controles cuyo contenido visible es un icono y nada más. */
async function iconosHuerfanos(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const huerfanos: string[] = [];
    for (const control of document.querySelectorAll<HTMLElement>("button, a, summary")) {
      if (control.offsetParent === null) continue;
      if (control.querySelector("svg") === null) continue; // sin icono, no es asunto de esta prueba
      // Texto que un ojo puede leer: lo que está para el lector de pantalla no cuenta.
      const clon = control.cloneNode(true) as HTMLElement;
      clon.querySelectorAll("svg, .sr-only").forEach((n) => n.remove());
      if (!(clon.textContent ?? "").trim()) {
        huerfanos.push(control.getAttribute("data-testid") ?? control.outerHTML.slice(0, 70));
      }
    }
    return huerfanos;
  });
}

test("ningún icono se queda sin su palabra al lado", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);

  const todo: { donde: string; control: string }[] = [];
  for (const ruta of PANTALLAS) {
    await page.goto(ruta);
    todo.push(...(await iconosHuerfanos(page)).map((control) => ({ donde: ruta, control })));
  }

  expect(todo, JSON.stringify(todo, null, 1)).toEqual([]);
});

test("los iconos no los anuncia un lector de pantalla, y los nombres accesibles no cambian", async ({
  page,
}) => {
  await entrarComo(page, dueno);

  // Todo `svg` de la aplicación es decorativo: el texto de al lado ya dice lo que es.
  const anunciados = await page.evaluate(() =>
    [...document.querySelectorAll("svg")]
      .filter((s) => s.getAttribute("aria-hidden") !== "true")
      .map((s) => s.outerHTML.slice(0, 60)),
  );
  expect(anunciados).toEqual([]);

  // El nombre accesible sigue siendo la palabra, no la palabra más el dibujo.
  const secciones = page.getByRole("navigation", { name: "Secciones" });
  await expect(secciones.getByRole("link", { name: "Productos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cobrar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Escanear", exact: true })).toBeVisible();
});
