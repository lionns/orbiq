// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-010. El contrato visual, en las cuatro pantallas y en los dos temas.
 *
 * Esta es la prueba que faltaba. Las de `tema.spec.ts` comprueban unos pocos colores en la pantalla
 * de acceso, así que un control sin relleno pasaba desapercibido: el fondo del `body` seguía siendo
 * el correcto. Lo que hay que afirmar no es «el token vale X» sino «este control **se distingue**
 * de lo que tiene detrás».
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("aspecto");
});
test.afterAll(async () => {
  await borrarDueno(dueno);
});

type Hallazgo = { que: string; motivo: string };

async function revisar(page: Page): Promise<Hallazgo[]> {
  return page.evaluate(() => {
    const lum = (color: string) => {
      const n = color.match(/[\d.]+/g)?.map(Number) ?? [];
      const [r, g, b] = n.slice(0, 3).map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const opaco = (color: string) => !/rgba\([^)]*,\s*0\s*\)/.test(color);
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x! + 0.05) / (y! + 0.05);
    };
    /** El primer ancestro con fondo opaco: contra eso se ve el control de verdad. */
    const fondoDetras = (el: Element): string => {
      let p = el.parentElement;
      while (p) {
        const c = getComputedStyle(p).backgroundColor;
        if (opaco(c)) return c;
        p = p.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };

    const hallazgos: { que: string; motivo: string }[] = [];
    const controles = document.querySelectorAll<HTMLElement>(
      'button, input:not([type="hidden"]), select, a[class*="rounded-button"], [data-testid="lista-catalogo"] li',
    );

    controles.forEach((el) => {
      if (el.offsetParent === null && el.tagName !== "BODY") return; // no está a la vista
      const s = getComputedStyle(el);
      const que = ((el.textContent ?? "").trim().slice(0, 24) || (el as HTMLInputElement).name || el.tagName);
      const detras = fondoDetras(el);

      const relleno = opaco(s.backgroundColor) ? ratio(s.backgroundColor, detras) : 1;
      const borde =
        parseFloat(s.borderTopWidth) > 0 && opaco(s.borderTopColor)
          ? ratio(s.borderTopColor, detras)
          : 1;

      // Se distingue si tiene relleno perceptible **o** un borde que cumple el mínimo de control.
      // 1.18 no es un número de la WCAG —para superficies no hay uno— sino el que separa «panel»
      // de «misma hoja de papel»: el `surface` viejo estaba en 1.09 y 1.15, y no se veía.
      if (relleno < 1.18 && borde < 3) {
        hallazgos.push({
          que,
          motivo: `no se distingue del fondo — relleno ${relleno.toFixed(2)}:1, borde ${borde.toFixed(2)}:1`,
        });
      }
      // «Los forms perdieron el radius»: un control con esquinas vivas es señal de token perdido.
      if (parseFloat(s.borderTopLeftRadius) === 0) {
        hallazgos.push({ que, motivo: "sin radio de esquina" });
      }
    });
    return hallazgos;
  });
}

for (const tema of ["claro", "oscuro"] as const) {
  test(`en tema ${tema}, todo control se distingue de su fondo y conserva el radio`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "orbiq.tema", value: tema, domain: "localhost", path: "/" },
    ]);

    await page.goto("/acceso");
    const enAcceso = await revisar(page);

    await entrarComo(page, dueno);
    const enVenta = await revisar(page);

    await page.goto("/catalogo");
    const enCatalogo = await revisar(page);

    await page.goto("/catalogo/nuevo");
    const enAlta = await revisar(page);

    const todo = [
      ...enAcceso.map((h) => ({ ...h, donde: "acceso" })),
      ...enVenta.map((h) => ({ ...h, donde: "venta" })),
      ...enCatalogo.map((h) => ({ ...h, donde: "catálogo" })),
      ...enAlta.map((h) => ({ ...h, donde: "alta" })),
    ];
    expect(todo, JSON.stringify(todo, null, 1)).toEqual([]);
  });
}
