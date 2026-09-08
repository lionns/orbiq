/**
 * Genera los íconos de la aplicación instalada, a partir de los tokens de `design-handoff.md`.
 *
 * Se generan en vez de guardarse porque **todavía no hay marca** (`design-handoff.md` § Visual
 * References): el ícono sale del acento y del fondo, así que sigue al diseño en lugar de quedarse
 * desfasado. El día que orbiq tenga identidad, este script se borra y entran los archivos de un
 * diseñador — que es una mejora, no una regresión.
 *
 * El PNG se escribe a mano porque el proyecto no tiene librería de imágenes y no vale la pena
 * añadir una para cuatro cuadrados: un PNG sin comprimir es cabecera, datos en zlib y CRC32.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

// `accent` y `accent-text` del tema claro. El acento es el único color saturado del producto.
const FONDO = [0x0f, 0x76, 0x6e];
const MARCA = [0xff, 0xff, 0xff];

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, "ascii"), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
}

/** `pintar(x, y)` devuelve el color de cada píxel. Sin transparencia: iOS la rellena de negro. */
function png(lado, pintar) {
  const filas = [];
  for (let y = 0; y < lado; y++) {
    const fila = Buffer.alloc(1 + lado * 3); // El 0 inicial es el filtro «ninguno».
    for (let x = 0; x < lado; x++) {
      const [r, g, b] = pintar(x, y);
      fila[1 + x * 3] = r;
      fila[2 + x * 3] = g;
      fila[3 + x * 3] = b;
    }
    filas.push(fila);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // 8 bits por canal
  ihdr[9] = 2; // color verdadero, sin alfa
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(Buffer.concat(filas), { level: 9 })),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * La marca: barras verticales de anchos distintos. No es un logotipo, es lo que el producto hace —
 * y a 48 px en una pantalla de inicio llena de íconos, se distingue de un cuadro de color.
 *
 * `zonaSegura` es la fracción del lado que puede ocupar el dibujo. Android recorta un ícono
 * `maskable` con la máscara que tenga el lanzador, y solo garantiza el 80% central: una marca
 * dibujada al borde sale cortada en unos teléfonos y entera en otros.
 */
function icono(lado, zonaSegura) {
  const anchos = [3, 1, 2, 1, 1, 3, 2, 1]; // Ritmo de código de barras, no barras iguales.
  const total = anchos.reduce((a, b) => a + b, 0) + (anchos.length - 1);
  const unidad = (lado * zonaSegura) / total;
  const margen = (lado - unidad * total) / 2;
  const alto = lado * zonaSegura * 0.62;
  const arriba = (lado - alto) / 2;

  const tramos = [];
  let x = margen;
  for (const [i, w] of anchos.entries()) {
    if (i % 2 === 0) tramos.push([x, x + unidad * w]);
    x += unidad * (w + 1);
  }

  return (px, py) => {
    if (py < arriba || py > arriba + alto) return FONDO;
    return tramos.some(([a, b]) => px >= a && px < b) ? MARCA : FONDO;
  };
}

const salida = (nombre) => join(process.cwd(), "public", nombre);
const archivos = [
  // Android y el navegador. Sin recorte: se muestran tal cual.
  ["icono-192.png", png(192, icono(192, 0.72))],
  ["icono-512.png", png(512, icono(512, 0.72))],
  // `maskable`: el lanzador recorta, así que la marca se encoge a la zona garantizada.
  ["icono-maskable-512.png", png(512, icono(512, 0.5))],
  // iOS. Redondea las esquinas él mismo y no admite transparencia ni SVG.
  ["apple-touch-icon.png", png(180, icono(180, 0.72))],
];

for (const [nombre, datos] of archivos) {
  writeFileSync(salida(nombre), datos);
  console.log(`generar-iconos: ${nombre} (${datos.length} B, sha ${createHash("sha256").update(datos).digest("hex").slice(0, 8)})`);
}
