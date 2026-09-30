/**
 * Códigos EAN-13 de verdad para las pruebas, y una imagen decodificable de cada uno. El codificador
 * —dígito de control y módulos— vive en el dominio desde `T-038`: la hoja de etiquetas imprime con
 * él, y las pruebas leen lo mismo que se imprime.
 */
import { digitoDeControl, modulos } from "../../src/domain/ean13";

export { digitoDeControl, modulos };

/** Pinta el código centrado sobre blanco y lo devuelve como RGBA, listo para decodificar. */
export function imagen(
  codigo: string,
  { ancho = 640, alto = 480, escala = 4, margen = 60 } = {},
): ImageData {
  const barras = modulos(codigo);
  const inicio = Math.floor((ancho - barras.length * escala) / 2);
  if (inicio < margen) throw new Error("el código no cabe con su zona muda");

  const data = new Uint8ClampedArray(ancho * alto * 4).fill(255);
  for (let x = 0; x < barras.length * escala; x++) {
    if (barras[Math.floor(x / escala)] !== "1") continue;
    for (let y = margen; y < alto - margen; y++) {
      const p = (y * ancho + inicio + x) * 4;
      data[p] = 0;
      data[p + 1] = 0;
      data[p + 2] = 0;
    }
  }
  // `colorSpace` lo exige el tipo `ImageData` del DOM, que es lo que espera el decodificador.
  return { data, width: ancho, height: alto, colorSpace: "srgb" };
}

/** El código que usan las pruebas. Con su dígito de control, así que es un EAN-13 legítimo. */
export const CODIGO_DE_PRUEBA = "770200400350" + digitoDeControl("770200400350");

/**
 * Un EAN-13 válido y distinto en cada llamada.
 *
 * Las pruebas corren en paralelo y el código de barras es único en la base (`AC-004`): un código
 * fijo compartido hace que el segundo trabajador choque contra la restricción, no contra un fallo
 * de verdad.
 */
export function codigoAleatorio(): string {
  const base = String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
  return base + digitoDeControl(base);
}
