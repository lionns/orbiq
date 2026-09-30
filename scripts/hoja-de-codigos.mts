import "dotenv/config";
import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../src/db";
import { digitoDeControl, modulos } from "../src/domain/ean13";
import { formatearPrecio } from "../src/domain/moneda";

/**
 * Una hoja con los códigos de barras de los productos del catálogo, para probar la cámara sin
 * tener los productos físicos delante.
 *
 *   npm run codigos              genera la hoja
 *   npm run codigos -- --corregir  además arregla en la base los códigos que no se pueden imprimir
 *
 * Se abre en el navegador del computador y se escanea desde el teléfono, o se imprime. Es para
 * probar, no para la tienda: las etiquetas que pega el dueño salen de Productos (`T-038`).
 */

/** Un código impreso tiene que llevar dígito de control correcto o ningún lector lo acepta. */
function esImprimible(codigo: string): boolean {
  return codigo.length === 13 && digitoDeControl(codigo.slice(0, 12)) === codigo[12];
}

const MODULO = 3; // px por módulo. Con menos, la cámara de un teléfono empieza a fallar.
const ALTO = 140;
const MUDA = 12; // Zona muda a cada lado, en módulos. Sin ella el lector no encuentra el principio.

function svg(codigo: string): string {
  const barras = modulos(codigo);
  const ancho = (barras.length + MUDA * 2) * MODULO;
  const rects: string[] = [];
  for (let i = 0; i < barras.length; i++) {
    if (barras[i] !== "1") continue;
    rects.push(`<rect x="${(i + MUDA) * MODULO}" y="0" width="${MODULO}" height="${ALTO}"/>`);
  }
  return `<svg width="${ancho}" height="${ALTO}" viewBox="0 0 ${ancho} ${ALTO}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${ancho}" height="${ALTO}" fill="#fff"/>
  <g fill="#000">${rects.join("")}</g>
</svg>`;
}

async function principal() {
  const corregir = process.argv.includes("--corregir");

  // Una tarjeta por código, no por producto: desde `D-010` un producto puede tener varios.
  const productos = await db
    .select({
      id: schema.productBarcode.id,
      nombre: schema.product.name,
      precio: schema.product.price,
      codigo: schema.productBarcode.code,
    })
    .from(schema.productBarcode)
    .innerJoin(schema.product, eq(schema.product.id, schema.productBarcode.productId));

  const imprimibles: { nombre: string; precio: number; codigo: string }[] = [];
  const rotos: { nombre: string; codigo: string; deberiaSer: string }[] = [];

  for (const p of productos) {
    const codigo = p.codigo!;
    if (esImprimible(codigo)) {
      imprimibles.push({ nombre: p.nombre, precio: p.precio, codigo });
      continue;
    }
    // Solo se puede arreglar lo que tiene la forma correcta: trece dígitos con el último mal.
    const arreglado =
      codigo.length === 13 ? codigo.slice(0, 12) + digitoDeControl(codigo.slice(0, 12)) : null;
    if (corregir && arreglado) {
      await db
        .update(schema.productBarcode)
        .set({ code: arreglado })
        .where(eq(schema.productBarcode.id, p.id));
      imprimibles.push({ nombre: p.nombre, precio: p.precio, codigo: arreglado });
    } else {
      rotos.push({ nombre: p.nombre, codigo, deberiaSer: arreglado ?? "—" });
    }
  }

  const tarjetas = imprimibles
    .map(
      (p) => `  <figure>
    ${svg(p.codigo)}
    <figcaption><b>${p.nombre}</b><br>${formatearPrecio(p.precio)}<br><code>${p.codigo}</code></figcaption>
  </figure>`,
    )
    .join("\n");

  const html = `<!doctype html>
<meta charset="utf-8">
<title>Códigos de barras — orbiq</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 24px; background: #fff; color: #1C1917; }
  h1 { font-size: 20px; }
  .hoja { display: flex; flex-wrap: wrap; gap: 28px; }
  figure { margin: 0; text-align: center; page-break-inside: avoid; }
  figcaption { margin-top: 6px; line-height: 1.4; }
  code { color: #57534E; letter-spacing: 1px; }
  @media print { .aviso { display: none } }
</style>
<h1>Códigos de barras del catálogo</h1>
<p class="aviso">Escanéalos desde el teléfono apuntando a esta pantalla, o imprime la hoja.
Sube el brillo: la cámara necesita contraste.</p>
<div class="hoja">
${tarjetas}
</div>
`;

  const destino = "hoja-de-codigos.html";
  writeFileSync(destino, html);
  console.log(`hoja-de-codigos: ${imprimibles.length} códigos en ${destino}`);
  if (rotos.length) {
    console.log(`\n${rotos.length} no se pueden imprimir: el dígito de control no cuadra.`);
    for (const r of rotos) console.log(`  ${r.codigo} (${r.nombre}) → debería ser ${r.deberiaSer}`);
    console.log("\nCorrígelos en la base con:  npm run codigos -- --corregir");
  }
  await pool.end();
}

principal();
