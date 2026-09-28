import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { like } from "drizzle-orm";
import { db, schema } from "../src/db";
import { borrarDueno, borrarProductos, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

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
const MARCA = `t34-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
test.afterAll(async () => {
  await borrarProductos(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

const pistas = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="camara"]') as HTMLVideoElement | null;
    return ((el?.srcObject as MediaStream | null)?.getTracks() ?? []).map((t) => t.readyState);
  });

// En la venta del celular la cámara se enciende desde «Escanear», abajo junto a Cobrar (`T-029`).
// Es la prueba que más importa de las dos: ahora quien la enciende es la pantalla y no el objetivo,
// y si su efecto dependiera del padre, la cámara volvería a morirse sola.
test("la cámara sigue viva después de abrirla, no se apaga sola", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.getByTestId("escanear").click();
  await expect(page.getByTestId("camara")).toBeVisible();

  // Arrancar puede tardar más de 2 s con varios navegadores abriendo cámaras a la vez: eso no es lo
  // que se prueba aquí. Lo que se prueba es la espera de después: se rompía a los ~300 ms de estar
  // viva, y tres segundos dan margen de sobra sin volver la suite lenta.
  await expect(async () => expect(await pistas(page)).toEqual(["live"])).toPass({ timeout: 5_000 });
  await page.waitForTimeout(3_000);
  expect(await pistas(page), "el flujo se apagó solo").toEqual(["live"]);
});

test("cerrar la cámara apaga el flujo: el piloto del teléfono no se queda encendido", async ({
  page,
}) => {
  await entrarComo(page, dueno);
  await page.getByTestId("escanear").click();
  await expect(page.getByTestId("camara")).toBeVisible();
  await expect(async () => expect(await pistas(page)).toEqual(["live"])).toPass({ timeout: 2_000 });

  // Al cerrar desaparece el `<video>` y con él la referencia al flujo, así que hay que guardarla
  // antes: si no, la prueba comprobaría que no hay nada que mirar, que es distinto de que se soltó.
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="camara"]') as HTMLVideoElement;
    (window as unknown as { flujo: MediaStream }).flujo = el.srcObject as MediaStream;
  });

  // Con el visor abierto, «Escanear» queda tapado: se cierra con su propio «Cerrar» (`T-034`).
  await page.getByTestId("cerrar-camara").click();
  await expect(page.getByTestId("camara")).toHaveCount(0);

  const estados = await page.evaluate(() =>
    (window as unknown as { flujo: MediaStream }).flujo.getTracks().map((t) => t.readyState),
  );
  expect(estados, "el flujo quedó abierto: el piloto de la cámara se queda encendido").toEqual([
    "ended",
  ]);
});

/**
 * T-034. La cámara se abre al centro y tapándolo todo, para que se note que se está dentro de ella.
 * Se cierra con «Cerrar» y con Esc, y en computador el botón dice «Escanear», como en el celular.
 */
test("el visor tapa la pantalla, se cierra con Esc, y en computador el botón dice Escanear", async ({
  page,
}) => {
  await entrarComo(page, dueno);
  await page.getByTestId("escanear").click();
  const visor = page.getByTestId("visor");
  await expect(visor).toBeVisible();
  const caja = (await visor.boundingBox())!;
  const pantalla = page.viewportSize()!;
  expect([Math.round(caja.width), Math.round(caja.height)]).toEqual([pantalla.width, pantalla.height]);
  // El video está al centro de la pantalla, no pegado arriba.
  const video = (await page.getByTestId("camara").boundingBox())!;
  const centro = video.y + video.height / 2;
  expect(Math.abs(centro - pantalla.height / 2)).toBeLessThan(pantalla.height / 6);
  await expect(page.getByTestId("cerrar-camara")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(visor).toHaveCount(0);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/vender");
  await expect(page.getByTestId("alternar-camara")).toHaveText("Escanear");
  await page.getByTestId("alternar-camara").click();
  await expect(visor).toBeVisible();
  const ventana = (await page.getByTestId("camara").boundingBox())!;
  expect(Math.abs(ventana.x + ventana.width / 2 - 1280 / 2)).toBeLessThan(200);
  await page.getByTestId("cerrar-camara").click();
  await expect(visor).toHaveCount(0);
});

test("«Añadir otro código» en la ficha se escanea con el mismo visor", async ({ page }) => {
  const [p] = await db
    .insert(schema.product)
    .values({ name: `Visor ${MARCA}`, price: 1000, stock: 0 })
    .returning({ id: schema.product.id });
  await entrarComo(page, dueno);
  await page.goto(`/catalogo/${p!.id}`);
  const seccion = page.getByTestId("abrir-codigo");
  await seccion.locator("summary").click();
  await seccion.getByTestId("alternar-camara").click();
  await expect(page.getByTestId("visor")).toBeVisible();
  await expect(async () => expect(await pistas(page)).toEqual(["live"])).toPass({ timeout: 2_000 });
  await page.getByTestId("cerrar-camara").click();
  await expect(page.getByTestId("visor")).toHaveCount(0);
  // Cerrar sin leer no toca el campo.
  await expect(page.getByTestId("codigo-nuevo")).toHaveValue("");
});

/**
 * T-034 · el enfoque. La cámara falsa de Chromium no tiene zoom ni enfoque, así que aquí se le
 * ponen, como los anuncia Chrome en Android, y se registra lo que el visor le pide. Sin ellos —el
 * caso de Safari en iPhone— no puede aparecer nada que no funcione.
 */
test("con una cámara que lo permite: 2× acerca, tocar enfoca ahí; sin ella no aparece nada", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const pedidos: unknown[] = [];
    (window as unknown as { pedidos: unknown[] }).pedidos = pedidos;
    MediaStreamTrack.prototype.getCapabilities = function () {
      return { zoom: { min: 1, max: 8, step: 0.1 }, focusMode: ["continuous", "single-shot"] } as MediaTrackCapabilities;
    };
    const admitidas = navigator.mediaDevices.getSupportedConstraints.bind(navigator.mediaDevices);
    navigator.mediaDevices.getSupportedConstraints = () =>
      ({ ...admitidas(), pointsOfInterest: true }) as MediaTrackSupportedConstraints;
    MediaStreamTrack.prototype.applyConstraints = async function (c?: MediaTrackConstraints) {
      pedidos.push(c?.advanced?.[0]);
    };
  });
  const pedidos = () => page.evaluate(() => (window as unknown as { pedidos: unknown[] }).pedidos);

  await entrarComo(page, dueno);
  await page.getByTestId("escanear").click();
  await expect(page.getByTestId("acercar")).toHaveText("2×");
  // Al abrir, el enfoque continuo.
  await expect.poll(pedidos).toContainEqual({ focusMode: "continuous" });

  await page.getByTestId("acercar").click();
  await expect(page.getByTestId("acercar")).toHaveText("1×");
  await expect(page.getByTestId("acercar")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(pedidos).toContainEqual({ zoom: 2 });
  // El botón no cuenta como un toque para enfocar.
  await expect(page.getByTestId("enfoque-tocado")).toHaveCount(0);

  const imagen = (await page.getByTestId("camara").boundingBox())!;
  await page.mouse.click(imagen.x + imagen.width / 2, imagen.y + imagen.height / 4);
  await expect(page.getByTestId("enfoque-tocado")).toBeVisible();
  // Donde se tocó, en proporción a la imagen. Con tolerancia: el clic cae en un píxel entero.
  await expect
    .poll(async () =>
      (await pedidos()).some((p) => {
        const q = p as { focusMode?: string; pointsOfInterest?: { x: number; y: number }[] };
        const punto = q.pointsOfInterest?.[0];
        return (
          q.focusMode === "single-shot" &&
          !!punto &&
          Math.abs(punto.x - 0.5) < 0.02 &&
          Math.abs(punto.y - 0.25) < 0.02
        );
      }),
    )
    .toBe(true);
  // El círculo es respuesta al toque, no un control: se va solo.
  await expect(page.getByTestId("enfoque-tocado")).toHaveCount(0, { timeout: 3_000 });
});

test("con la cámara de siempre, sin zoom ni enfoque, el visor no ofrece 2× ni responde al toque", async ({
  page,
}) => {
  await entrarComo(page, dueno);
  await page.getByTestId("escanear").click();
  await expect(page.getByTestId("visor")).toBeVisible();
  await expect(async () => expect(await pistas(page)).toEqual(["live"])).toPass({ timeout: 2_000 });
  await expect(page.getByTestId("acercar")).toHaveCount(0);
  const imagen = (await page.getByTestId("camara").boundingBox())!;
  await page.mouse.click(imagen.x + imagen.width / 2, imagen.y + imagen.height / 2);
  await expect(page.getByTestId("enfoque-tocado")).toHaveCount(0);
  await expect(page.getByTestId("visor")).toBeVisible();
});

test("en un iPhone que abre con zoom, 2× acerca desde ahí y 1× vuelve a como abrió, no más lejos", async ({
  page,
}) => {
  // Como lo reporta Safari en un iPhone con varias cámaras: el mínimo es el gran angular.
  await page.addInitScript(() => {
    const pedidos: unknown[] = [];
    (window as unknown as { pedidos: unknown[] }).pedidos = pedidos;
    MediaStreamTrack.prototype.getCapabilities = function () {
      return { zoom: { min: 1, max: 15 } } as MediaTrackCapabilities;
    };
    const ajustes = MediaStreamTrack.prototype.getSettings;
    MediaStreamTrack.prototype.getSettings = function () {
      return { ...ajustes.call(this), zoom: 2 } as MediaTrackSettings;
    };
    MediaStreamTrack.prototype.applyConstraints = async function (c?: MediaTrackConstraints) {
      pedidos.push(c?.advanced?.[0]);
    };
  });
  const zooms = () =>
    page.evaluate(() =>
      (window as unknown as { pedidos: { zoom?: number }[] }).pedidos
        .map((p) => p?.zoom)
        .filter((z) => z !== undefined),
    );

  await entrarComo(page, dueno);
  await page.getByTestId("escanear").click();
  await page.getByTestId("acercar").click();
  await expect.poll(zooms).toEqual([4]);
  await page.getByTestId("acercar").click();
  await expect.poll(zooms).toEqual([4, 2]);
  // Sin enfoque al tocar: Safari no lo permite, así que no hay círculo que prometa nada.
  const imagen = (await page.getByTestId("camara").boundingBox())!;
  await page.mouse.click(imagen.x + imagen.width / 2, imagen.y + imagen.height / 3);
  await expect(page.getByTestId("enfoque-tocado")).toHaveCount(0);
});
