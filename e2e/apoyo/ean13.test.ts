import { describe, expect, it } from "vitest";
import { FORMATOS } from "../../src/domain/escaneo";
import { digitoDeControl, imagen } from "./ean13";

/**
 * El decodificador que se envía, contra códigos de barras de verdad.
 *
 * Esta prueba existe porque el camino de cámara **no se puede automatizar de extremo a extremo**:
 * el dispositivo de vídeo falso de Chromium entrega negro al lienzo, medido en headless y con
 * navegador visible, y el decodificador lee por lienzo. Lo que sí es verificable —y es donde
 * estuvo el error real de esta tarea— es que los formatos que se le piden al detector alcanzan
 * para leer lo que trae un producto de tienda. Que la cámara del teléfono llegue a estos bytes lo
 * comprueba a mano `T-016` § Verification.
 */
async function leer(codigo: string) {
  const { readBarcodes } = await import("zxing-wasm/reader");
  // Los mismos formatos que pide el objetivo de escaneo, con el nombre que usa esta librería.
  const formatos = FORMATOS.map((f) => (f === "ean_13" ? "EAN-13" : "EAN-8"));
  const encontrados = await readBarcodes(imagen(codigo), { formats: formatos });
  return encontrados.map((r) => r.text);
}

describe("el decodificador lee lo que trae un producto de tienda", () => {
  it("un EAN-13", async () => {
    const codigo = `770200400350${digitoDeControl("770200400350")}`;
    expect(await leer(codigo)).toEqual([codigo]);
  });

  it("un UPC-A, que llega como EAN-13 con un cero delante", async () => {
    // Es el caso que rompió esta tarea una vez: pedir el formato `upc_a` descarta el detector
    // nativo de Chromium, que no lo tiene. Pedir `ean_13` lo lee igual, y `equivalentes` resuelve
    // los doce dígitos impresos en el empaque.
    const upcA = "012345678905";
    expect(await leer(`0${upcA}`)).toEqual([`0${upcA}`]);
  });
});
