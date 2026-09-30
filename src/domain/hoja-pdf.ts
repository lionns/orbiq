import { modulos } from "./ean13";
import { POR_HOJA, type Etiqueta } from "./etiquetas";
import { formatearPrecio } from "./moneda";

/**
 * La hoja de etiquetas como PDF (`T-038`, `D-012`). Existe porque imprimir la página no sirve en el
 * celular: con la app abierta desde su ícono (`D-009`) no hay menú del navegador, y en iPhone
 * `window.print()` no hace nada. Un PDF sí: el sistema lo abre, lo imprime o lo guarda.
 *
 * Escrito a mano y sin dependencias, como el EAN-13: lo que se necesita es exacto y pequeño —
 * rectángulos negros y dos tipos de letra estándar que todo lector de PDF trae—. Sin nada de Node:
 * corre igual en un Worker (`T-031`).
 *
 * Medidas de la hoja carta de 30 (validada el 2026-09-29): 3 × 10 etiquetas de 2⅝" × 1", 0,5"
 * arriba, 3⁄16" a los lados y ⅛" entre columnas. En puntos: 72 por pulgada.
 */
const PT = 72;
const ANCHO_HOJA = 8.5 * PT;
const ALTO_HOJA = 11 * PT;
const ETIQUETA = { ancho: 2.625 * PT, alto: 1 * PT };
const IZQUIERDA = 0.1875 * PT;
const ARRIBA = 0.5 * PT;
const PASO_X = 2.75 * PT;
const MUDA = 9; // zona muda a cada lado, en módulos, como en pantalla
const BARRAS = { ancho: 1.75 * PT, alto: 0.5 * PT };
const TEXTO = { ancho: 2.2 * PT, cuerpo: 8 };

/** Anchos de Helvetica-Bold (AFM estándar), en milésimas de em, de ` ` a `~`. */
const NEGRITA = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
  611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
  278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/**
 * Lo que WinAnsi guarda fuera del Latin-1: rayas, comillas tipográficas, «…», «€». El resto del
 * español (tildes, ñ, ¿¡) ya está en su sitio de Latin-1.
 */
const FUERA_DE_LATIN1: Record<string, string> = {
  "\u2026": "\x85", "\u2013": "\x96", "\u2014": "\x97", "\u2018": "\x91", "\u2019": "\x92",
  "\u201c": "\x93", "\u201d": "\x94", "\u2022": "\x95", "\u20ac": "\x80",
};

/** Un carácter en WinAnsi, la codificación de los tipos estándar. Lo que no cabe, «?». */
function winAnsi(c: string): string {
  return FUERA_DE_LATIN1[c] ?? (c.charCodeAt(0) <= 0xff ? c : "?");
}

/** Anchos en negrita de lo que no es ASCII y no tiene letra base. */
const ESPECIALES: Record<string, number> = {
  "\u2026": 1000, "\u2013": 556, "\u2014": 1000, "\u00a0": 278, "\u00bf": 611, "\u00a1": 333,
};

/** Ancho de un texto en negrita, en puntos. Una letra con tilde mide lo que su letra base. */
function ancho(texto: string, cuerpo: number): number {
  let total = 0;
  for (const c of texto) {
    const base = c.normalize("NFD")[0]!.charCodeAt(0);
    total += base >= 32 && base <= 126 ? NEGRITA[base - 32]! : c === "…" ? 1000 : 556;
  }
  return (total * cuerpo) / 1000;
}

/** Recorta con «…» hasta que quepa. */
function recortar(texto: string, maximo: number, cuerpo: number): string {
  if (ancho(texto, cuerpo) <= maximo) return texto;
  let t = texto;
  while (t.length > 1 && ancho(`${t.trimEnd()}…`, cuerpo) > maximo) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function cadena(texto: string): string {
  const escapado = [...texto].map(winAnsi).join("").replace(/[\\()]/g, (c) => `\\${c}`);
  return `(${escapado})`;
}

const n = (x: number) => (Math.round(x * 100) / 100).toString();

/** Lo que se dibuja en una etiqueta, con su esquina de arriba a la izquierda en (x, y). */
function etiqueta(e: Etiqueta, x: number, y: number): string {
  const { cuerpo } = TEXTO;
  const margen = (ETIQUETA.ancho - TEXTO.ancho) / 2;
  const precio = formatearPrecio(e.precio);
  const anchoPrecio = ancho(precio, cuerpo);
  const nombre = recortar(e.nombre, TEXTO.ancho - anchoPrecio - 6, cuerpo);
  const linea = y - 14;

  const barras = modulos(e.codigo);
  const modulo = BARRAS.ancho / (barras.length + MUDA * 2);
  const x0 = x + (ETIQUETA.ancho - BARRAS.ancho) / 2;
  const abajo = y - 18 - BARRAS.alto;
  const rects: string[] = [];
  for (let i = 0; i < barras.length; i++) {
    if (barras[i] !== "1") continue;
    let fin = i;
    while (barras[fin + 1] === "1") fin++;
    rects.push(`${n(x0 + (i + MUDA) * modulo)} ${n(abajo)} ${n((fin - i + 1) * modulo)} ${n(BARRAS.alto)} re`);
    i = fin;
  }

  // Los dígitos, en Helvetica: todos miden 556. Con un punto de aire entre ellos, como en pantalla.
  const aire = 1;
  const anchoDigitos = (e.codigo.length * 556 * cuerpo) / 1000 + aire * (e.codigo.length - 1);
  return [
    // `0 Tc` en cada bloque: el espaciado entre letras no se reinicia con `BT`, y el de los dígitos
    // de la etiqueta anterior separaba las letras del nombre de esta.
    `BT /F2 ${cuerpo} Tf 0 Tc ${n(x + margen)} ${n(linea)} Td ${cadena(nombre)} Tj ET`,
    `BT /F2 ${cuerpo} Tf 0 Tc ${n(x + margen + TEXTO.ancho - anchoPrecio)} ${n(linea)} Td ${cadena(precio)} Tj ET`,
    `${rects.join(" ")} f`,
    `BT /F1 ${cuerpo} Tf ${aire} Tc ${n(x + (ETIQUETA.ancho - anchoDigitos) / 2)} ${n(y - 64)} Td ${cadena(e.codigo)} Tj ET`,
  ].join("\n");
}

function pagina(hoja: readonly Etiqueta[]): string {
  const partes = ["0 g"];
  hoja.slice(0, POR_HOJA).forEach((e, i) => {
    const x = IZQUIERDA + (i % 3) * PASO_X;
    const y = ALTO_HOJA - ARRIBA - Math.floor(i / 3) * ETIQUETA.alto;
    partes.push(etiqueta(e, x, y));
  });
  return partes.join("\n");
}

/** Las hojas, ya repartidas por `enHojas`, como un PDF de una página carta por hoja. */
export function hojaEnPdf(hojas: readonly (readonly Etiqueta[])[]): Uint8Array<ArrayBuffer> {
  const objetos: string[] = [];
  const nuevo = (cuerpo: string) => objetos.push(cuerpo);

  nuevo("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  nuevo(""); // 2: las páginas, cuando se sepa cuáles son
  nuevo("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
  nuevo("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4

  const paginas: number[] = [];
  for (const hoja of hojas) {
    const contenido = pagina(hoja);
    nuevo(`<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
    const idContenido = objetos.length;
    nuevo(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO_HOJA} ${ALTO_HOJA}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idContenido} 0 R >>`,
    );
    paginas.push(objetos.length);
  }
  objetos[1] = `<< /Type /Pages /Kids [${paginas.map((p) => `${p} 0 R`).join(" ")}] /Count ${paginas.length} >>`;

  // Cada carácter es un byte (WinAnsi), así que la longitud del texto es la de los bytes: los
  // desplazamientos de la tabla `xref` salen de contar caracteres.
  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const desplazamientos: number[] = [];
  objetos.forEach((cuerpo, i) => {
    desplazamientos.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const d of desplazamientos) pdf += `${String(d).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
