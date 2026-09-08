/**
 * Genera códigos EAN-13 de verdad para las pruebas: sus módulos, su dígito de control y una imagen
 * decodificable. Escrito a mano y sin dependencias porque lo que se necesita es exacto y pequeño.
 */
const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
const PARIDAD = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

/** El dígito de control: sin él, el decodificador rechaza el código y la prueba mentiría. */
export function digitoDeControl(doce: string): string {
  const suma = [...doce].reduce((t, d, i) => t + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (suma % 10)) % 10);
}

/** Los 95 módulos de un EAN-13, como cadena de "0" y "1". */
export function modulos(codigo: string): string {
  if (codigo.length !== 13) throw new Error(`EAN-13 son 13 dígitos, llegaron ${codigo.length}`);
  const paridad = PARIDAD[Number(codigo[0])]!;
  const izquierda = [...codigo.slice(1, 7)]
    .map((d, i) => (paridad[i] === "L" ? L : G)[Number(d)]!)
    .join("");
  const derecha = [...codigo.slice(7)].map((d) => R[Number(d)]!).join("");
  return `101${izquierda}01010${derecha}101`;
}

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
