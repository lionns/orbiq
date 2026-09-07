// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-007. El tema no toca la base, así que casi todo se comprueba en la pantalla de acceso, que es
 * pública. Solo la de la cabecera necesita sesión.
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("tema");
});
test.afterAll(async () => {
  await borrarDueno(dueno);
});

const fondoDe = (page: import("@playwright/test").Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

const CLARO = "rgb(255, 255, 255)";
const OSCURO = "rgb(28, 25, 23)";

async function elegir(page: import("@playwright/test").Page, tema: string) {
  await page.getByTestId("abrir-tema").click();
  await page.getByTestId(`tema-${tema}`).click();
  // El envío repinta desde la plantilla raíz; sin esperar, se lee el fondo de antes.
  await page.waitForLoadState("networkidle");
}

test("elegir oscuro lo aplica y lo recuerda en la siguiente visita", async ({ page }) => {
  await page.goto("/acceso");
  expect(await fondoDe(page)).toBe(CLARO);

  await elegir(page, "oscuro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await fondoDe(page)).toBe(OSCURO);

  // Se recuerda: no es estado de pantalla, es una preferencia guardada.
  await page.goto("/acceso");
  expect(await fondoDe(page)).toBe(OSCURO);
});

test("elegir claro manda aunque el dispositivo esté en oscuro", async ({ page }) => {
  // Es el caso que se rompe si el CSS solo mira `prefers-color-scheme`.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/acceso");
  expect(await fondoDe(page)).toBe(OSCURO);

  await elegir(page, "claro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await fondoDe(page)).toBe(CLARO);
});

test("con «el del sistema» sigue al dispositivo sin tocar nada", async ({ page }) => {
  await page.goto("/acceso");
  await elegir(page, "sistema");
  // Sin atributo: manda `prefers-color-scheme`.
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);

  await page.emulateMedia({ colorScheme: "dark" });
  expect(await fondoDe(page)).toBe(OSCURO);
  await page.emulateMedia({ colorScheme: "light" });
  expect(await fondoDe(page)).toBe(CLARO);
});

test("el HTML llega ya con el tema puesto: no hay destello", async ({ page, context }) => {
  // Lo que evita el destello es que lo decida el servidor, así que se comprueba en el HTML que
  // llega por el cable, no en la pantalla ya pintada — ahí el destello ya no se ve.
  await context.addCookies([
    { name: "orbiq.tema", value: "oscuro", domain: "localhost", path: "/" },
  ]);
  const respuesta = await page.goto("/acceso");
  const html = await respuesta!.text();
  expect(html).toContain('data-theme="dark"');
  // Y `color-scheme`, o la barra de desplazamiento se queda en claro dentro de una pantalla oscura.
  expect(html).toContain("color-scheme:dark");
});

test("el selector funciona con JavaScript apagado", async ({ browser }) => {
  // La aplicación entera se apoya en formularios de verdad; esto lo comprueba en vez de afirmarlo.
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexto.newPage();
  await page.goto("/acceso");
  // `<details>` se abre solo: es del navegador, no nuestro.
  await page.getByTestId("abrir-tema").click();
  await page.getByTestId("tema-oscuro").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await contexto.close();
});

test("una cookie con basura no tumba la pantalla", async ({ page, context }) => {
  await context.addCookies([
    { name: "orbiq.tema", value: "<script>alert(1)</script>", domain: "localhost", path: "/" },
  ]);
  await page.goto("/acceso");
  expect(await fondoDe(page)).toBe(CLARO);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("el tema también se elige desde las pantallas del negocio, y a 360 px no desborda", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await entrarComo(page, dueno);
  await elegir(page, "oscuro");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await fondoDe(page)).toBe(OSCURO);

  // El desplegable sigue abierto tras elegir: React no controla el `open` de un `<details>`, así
  // que el nodo sobrevive al repintado. Se queda mostrando cuál quedó activo, que es buena señal.
  await expect(page.getByTestId("tema-claro")).toBeVisible();

  // Y abierto no empuja nada fuera de la pantalla: va posicionado por encima, no en el flujo.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  const panel = await page.getByTestId("tema-claro").boundingBox();
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(360);
});
