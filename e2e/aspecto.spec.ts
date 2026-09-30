// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { eq, like } from "drizzle-orm";
import { db, schema } from "../src/db";
import { codigoDeLaTienda } from "../src/domain/ean13";
import { borrarDueno, borrarProductos, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-010. El contrato visual, en las cuatro pantallas y en los dos temas.
 *
 * Esta es la prueba que faltaba. Las de `tema.spec.ts` comprueban unos pocos colores en la pantalla
 * de acceso, así que un control sin relleno pasaba desapercibido: el fondo del `body` seguía siendo
 * el correcto. Lo que hay que afirmar no es «el token vale X» sino «este control **se distingue**
 * de lo que tiene detrás».
 */
let dueno: DuenoDePrueba;
let etiquetable: string;

// Productos propios: los resultados de la venta tienen que tener filas que medir aunque la base esté
// vacía, como la que se entrega al negocio. Antes contaba con los de demostración.
const MARCA = `t10-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("aspecto");
  await db.insert(schema.product).values(
    ["Arroz", "Panela cuadrada", "Aceite", "Leche entera", "Café molido", "Galletas"].map((n, i) => ({
      name: `${n} ${MARCA}`,
      price: (i + 1) * 1500,
      stock: i === 5 ? 0 : 10,
    })),
  );
  // Uno con código de la tienda, para que las pantallas de etiquetas tengan qué enseñar (`T-038`).
  const [arroz] = await db.select().from(schema.product).where(eq(schema.product.name, `Arroz ${MARCA}`));
  etiquetable = arroz!.id;
  await db.insert(schema.productBarcode).values({ productId: etiquetable, code: codigoDeLaTienda() });
});
test.afterAll(async () => {
  await borrarProductos(like(schema.product.name, `%${MARCA}%`));
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
      // `[data-tarjeta]` marca las tarjetas a propósito: si el contrato dependiera de la etiqueta,
      // mover el estilo de un `<li>` al `<a>` de dentro lo dejaría midiendo un elemento sin estilo.
      // Casillas y radios quedan fuera: su marco lo dibuja el navegador, no nuestro CSS, así que
      // medirles borde y relleno da un falso positivo. Lo que sí controlamos ahí es `accent-color`.
      'button, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select,' +
        ' a[class*="rounded-button"], [data-tarjeta], [data-control]',
    );

    controles.forEach((el) => {
      // Un campo con algo dentro —el «$», «Mostrar»— es un solo control: su contenedor lleva el
      // borde, el relleno y el radio (`T-029`). Lo de dentro se mide como parte de él, no suelto.
      if (el.parentElement?.closest("[data-control]")) return;
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

    await page.goto(`/catalogo/etiquetas?q=${MARCA}&m=${etiquetable}`);
    const enEtiquetas = await revisar(page);

    await page.goto(`/catalogo/etiquetas/cuantas?m=${etiquetable}`);
    const enCuantas = await revisar(page);

    const todo = [
      ...enAcceso.map((h) => ({ ...h, donde: "acceso" })),
      ...enVenta.map((h) => ({ ...h, donde: "venta" })),
      ...enCatalogo.map((h) => ({ ...h, donde: "catálogo" })),
      ...enAlta.map((h) => ({ ...h, donde: "alta" })),
      ...enEtiquetas.map((h) => ({ ...h, donde: "etiquetas" })),
      ...enCuantas.map((h) => ({ ...h, donde: "cuántas etiquetas" })),
    ];
    expect(todo, JSON.stringify(todo, null, 1)).toEqual([]);
  });
}

/**
 * Los resultados de la venta son una lista, no un mosaico: cada fila ocupa el ancho de la lista
 * entero y es un objetivo táctil de verdad. Heredado de la prueba de la cuadrícula (`T-033`), que
 * se rompía de dos formas que ninguna otra prueba veía: el botón que no llenaba su celda y la fila
 * que encogía.
 */
test("las filas de resultados de la venta llenan la lista y se tocan con el pulgar", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await page.getByTestId("codigo-tecleado").fill(MARCA);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.locator('[data-testid^="resultado-"]').first()).toBeVisible();

  const filas = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="resultado-"]')].map((b) => {
      // Por dentro del borde: la línea que separa una fila de la de arriba es del `li`, no del botón.
      const li = b.closest("li")!;
      const rb = b.getBoundingClientRect();
      return {
        nombre: (b.textContent ?? "").trim().slice(0, 20),
        celda: [li.clientWidth, li.clientHeight],
        boton: [Math.round(rb.width), Math.round(rb.height)],
      };
    }),
  );

  expect(filas.length).toBeGreaterThan(3);
  const cortos = filas.filter((c) => c.boton[0] !== c.celda[0] || c.boton[1] !== c.celda[1]);
  expect(cortos, `botones que no llenan su fila: ${JSON.stringify(cortos)}`).toEqual([]);
  // Todas del mismo ancho, y ninguna por debajo de los 48 px de `NFR-003`.
  expect(new Set(filas.map((c) => c.celda[0])).size).toBe(1);
  expect(filas.filter((c) => c.boton[1]! < 48)).toEqual([]);
});
