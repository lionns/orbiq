import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-016. Que la cámara siga encendida una vez encendida.
 *
 * Existe por un fallo real: el efecto que abría la cámara dependía del mismo estado que él
 * escribía, así que React lo limpiaba y paraba el flujo a los ~300 ms. En pantalla la imagen
 * aparecía y se moría sola, sin ningún error. Lo que lo delata no es mirar la pantalla —el `<video>`
 * sigue puesto— sino el estado de la pista.
 *
 * Aquí no se comprueba que decodifique: el vídeo falso de Chromium llega negro al lienzo en
 * headless, así que eso se queda en la comprobación manual de `T-016` § Verification.
 */
let dueno: DuenoDePrueba;

test.beforeAll(async () => {
  dueno = await crearDueno("camara");
});
test.afterAll(async () => {
  await borrarDueno(dueno);
});

const pistas = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="camara"]') as HTMLVideoElement | null;
    return ((el?.srcObject as MediaStream | null)?.getTracks() ?? []).map((t) => t.readyState);
  });

test("la cámara sigue viva después de abrirla, no se apaga sola", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.getByTestId("alternar-camara").click();
  await expect(page.getByTestId("camara")).toBeVisible();

  // Se rompía a los ~300 ms. Tres segundos dan margen de sobra sin volver la suite lenta.
  await expect(async () => expect(await pistas(page)).toEqual(["live"])).toPass({ timeout: 2_000 });
  await page.waitForTimeout(3_000);
  expect(await pistas(page), "el flujo se apagó solo").toEqual(["live"]);
});

test("cerrar la cámara apaga el flujo: el piloto del teléfono no se queda encendido", async ({
  page,
}) => {
  await entrarComo(page, dueno);
  await page.getByTestId("alternar-camara").click();
  await expect(page.getByTestId("camara")).toBeVisible();
  await expect(async () => expect(await pistas(page)).toEqual(["live"])).toPass({ timeout: 2_000 });

  // Al cerrar desaparece el `<video>` y con él la referencia al flujo, así que hay que guardarla
  // antes: si no, la prueba comprobaría que no hay nada que mirar, que es distinto de que se soltó.
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="camara"]') as HTMLVideoElement;
    (window as unknown as { flujo: MediaStream }).flujo = el.srcObject as MediaStream;
  });

  await page.getByTestId("alternar-camara").click();
  await expect(page.getByTestId("camara")).toHaveCount(0);

  const estados = await page.evaluate(() =>
    (window as unknown as { flujo: MediaStream }).flujo.getTracks().map((t) => t.readyState),
  );
  expect(estados, "el flujo quedó abierto: el piloto de la cámara se queda encendido").toEqual([
    "ended",
  ]);
});
