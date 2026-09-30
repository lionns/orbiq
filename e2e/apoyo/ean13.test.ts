import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { FORMATOS } from "../../src/domain/escaneo";
import { codigoDeLaTienda } from "../../src/domain/ean13";
import { digitoDeControl, imagen } from "./ean13";

/**
 * El binario que trae el paquete, leído del disco. Sin esto la librería lo descarga de un CDN al
 * correr, así que la prueba pasaba con internet y fallaba sin él: bloqueó la línea base de `T-028`
 * en un entorno sin red. Se sube hasta la raíz del paquete igual que `scripts/copiar-wasm.mjs`,
 * para respetar dónde lo haya dejado el hoisting de npm.
 */
function binarioDelDecodificador(): ArrayBuffer {
  let dir = dirname(createRequire(import.meta.url).resolve("zxing-wasm/reader"));
  while (!existsSync(join(dir, "dist/reader/zxing_reader.wasm"))) {
    const padre = dirname(dir);
    if (padre === dir) throw new Error("no se encontró zxing_reader.wasm — ¿está instalado zxing-wasm?");
    dir = padre;
  }
  const bytes = readFileSync(join(dir, "dist/reader/zxing_reader.wasm"));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

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
  const { prepareZXingModule, readBarcodes } = await import("zxing-wasm/reader");
  prepareZXingModule({ overrides: { wasmBinary: binarioDelDecodificador() } });
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

  it("un código de la tienda, que es lo que se imprime en sus etiquetas (`D-012`)", async () => {
    const codigo = codigoDeLaTienda();
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
