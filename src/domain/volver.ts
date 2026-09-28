/**
 * «Volver» vuelve a donde se estaba (`T-036`). Hasta aquí cada pantalla volvía a una fija —el
 * detalle de una venta, siempre a Ventas; la ficha, siempre a Productos— y quien llegaba desde la
 * ficha o desde Inicio terminaba en otra parte.
 *
 * El origen viaja en la dirección (`?desde=`), así que sobrevive a recargar y funciona sin
 * JavaScript, como los filtros (`AC-018`).
 */
export type Volver = { href: string; texto: string };

/**
 * Solo direcciones de la propia aplicación. `desde` llega de la dirección, que cualquiera puede
 * escribir: sin esto, un enlace con `?desde=https://…` convertiría «volver» en una puerta a otro
 * sitio. `//otro.sitio` y `/\otro.sitio` los navegadores también los leen como de otro sitio.
 */
export function esRutaPropia(ruta: string): boolean {
  return (
    ruta.startsWith("/") &&
    !ruta.startsWith("//") &&
    !ruta.includes("\\") &&
    !/[\u0000-\u001f]/.test(ruta) &&
    ruta.length <= 2000
  );
}

const PRODUCTO = /^\/catalogo\/[0-9a-f-]{36}$/i;

/** Cómo se llama la pantalla a la que se vuelve: es lo que dice el enlace («← Producto»). */
export function nombreDe(ruta: string): string {
  const [camino = "", consulta = ""] = ruta.split("?");
  if (camino === "/") return "Inicio";
  if (camino === "/ventas" || camino.startsWith("/ventas/")) return "Ventas";
  if (PRODUCTO.test(camino)) return "Producto";
  if (camino === "/catalogo") {
    return new URLSearchParams(consulta).has("ficha") ? "Producto" : "Productos";
  }
  return "Volver";
}

/** Adónde vuelve una pantalla: al origen si lo hay y es propio; si no, a su sitio de siempre. */
export function volverA(desde: unknown, porDefecto: Volver): Volver {
  if (typeof desde !== "string" || !esRutaPropia(desde)) return porDefecto;
  return { href: desde, texto: nombreDe(desde) };
}

/** Un enlace que recuerda de dónde se sale. Sin origen, o si es el sitio de siempre, queda igual. */
export function conDesde(ruta: string, desde: string | null | undefined): string {
  if (!desde || !esRutaPropia(desde)) return ruta;
  return `${ruta}${ruta.includes("?") ? "&" : "?"}desde=${encodeURIComponent(desde)}`;
}
