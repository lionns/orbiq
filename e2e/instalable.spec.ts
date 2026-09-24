import "dotenv/config";
import { expect, test } from "@playwright/test";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-015 · `D-009`. Que la aplicación se pueda instalar en la pantalla de inicio.
 *
 * Un manifest mal formado **degrada en silencio**: el ícono queda puesto y al tocarlo abre el
 * navegador con su barra de direcciones. No hay error en ninguna consola, así que la única forma de
 * enterarse es comprobarlo. Lo que no puede comprobar Playwright —que en un teléfono de verdad
 * abra sin barra— lo pide `T-015` § Verification a mano.
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("instalable");
});
test.afterAll(async () => {
  await borrarDueno(dueno);
});

test("el manifest declara una aplicación instalable, no un marcador", async ({ page }) => {
  await page.goto("/acceso");

  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href, "no hay <link rel=manifest>: el navegador no ofrecerá instalar").toBeTruthy();

  const respuesta = await page.request.get(href!);
  expect(respuesta.status()).toBe(200);
  const manifest = await respuesta.json();

  // Sin esto es un marcador: abre el navegador entero, que es justo lo que la tarea quita.
  expect(manifest.display).toBe("standalone");
  expect(manifest.name).toContain("Orbiq");
  expect(manifest.short_name.length).toBeLessThanOrEqual(12);

  // `start_url` tiene que caer dentro de `scope`, o Android se niega a construir el WebAPK.
  expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
});

test("todos los íconos declarados se sirven de verdad", async ({ page }) => {
  await page.goto("/acceso");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  const manifest = await (await page.request.get(href!)).json();

  // Un ícono declarado que devuelve 404 deja la instalación sin imagen y nadie se entera.
  for (const icono of manifest.icons) {
    const r = await page.request.get(icono.src);
    expect(r.status(), `${icono.src} no se sirve`).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }

  // Android recorta con su máscara: sin uno `maskable`, la marca sale flotando en un círculo.
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);

  // iOS no lee los íconos del manifest y quiere el suyo.
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
  expect(apple, "sin apple-touch-icon, iPhone usa una captura de la pantalla").toBeTruthy();
  expect((await page.request.get(apple!)).status()).toBe(200);
});

test("la barra de estado sigue al tema del dispositivo, en los dos", async ({ page }) => {
  await entrarComo(page, dueno);

  const claro = page.locator('meta[name="theme-color"][media*="light"]');
  const oscuro = page.locator('meta[name="theme-color"][media*="dark"]');

  // Los valores son los `bg` de design-handoff.md § Color. Si alguien cambia el token y no esto,
  // la barra de estado queda de un color que ya no existe en el producto.
  await expect(claro).toHaveAttribute("content", "#E8EBF4");
  await expect(oscuro).toHaveAttribute("content", "#0D0F1C");
});
