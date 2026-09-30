/**
 * El EAN-13, escrito a mano y sin dependencias porque lo que se necesita es exacto y pequeño: el
 * dígito de control, los 95 módulos de las barras, y el código que genera la tienda (`D-012`).
 *
 * Nació en las pruebas (`e2e/apoyo/ean13.ts`) para fabricar códigos decodificables; desde `T-038`
 * la hoja de etiquetas imprime con él, así que vive aquí y las pruebas lo importan.
 */
const L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
const PARIDAD = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

/** El dígito de control: sin él, ningún lector acepta el código. */
export function digitoDeControl(doce: string): string {
  const suma = [...doce].reduce((t, d, i) => t + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (suma % 10)) % 10);
}

/** Trece dígitos con el último bien puesto. */
export function esEan13(codigo: string): boolean {
  return /^\d{13}$/.test(codigo) && digitoDeControl(codigo.slice(0, 12)) === codigo[12];
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

/**
 * El prefijo de los códigos de la tienda. GS1 reserva los que empiezan por `2` para uso dentro de
 * una tienda: ningún código de fábrica empieza así, así que uno generado no choca con lo que llegue
 * del proveedor (`D-012`).
 */
export const PREFIJO_DE_LA_TIENDA = "2";

/** ¿Es un código generado por la tienda? */
export function esDeLaTienda(codigo: string): boolean {
  return esEan13(codigo) && codigo.startsWith(PREFIJO_DE_LA_TIENDA);
}

/**
 * Un código de la tienda nuevo: el prefijo, once dígitos al azar y el de control. Al azar y no
 * correlativo para que dos altas simultáneas no pidan el mismo número; si aun así choca, la
 * unicidad de la base lo rechaza y quien llama pide otro. `azar` se inyecta para las pruebas.
 */
export function codigoDeLaTienda(azar: () => number = Math.random): string {
  let once = "";
  for (let i = 0; i < 11; i++) once += String(Math.floor(azar() * 10) % 10);
  const doce = PREFIJO_DE_LA_TIENDA + once;
  return doce + digitoDeControl(doce);
}
