/**
 * Cómo se lee un catálogo acotado. Vive en la dirección, no en la pantalla: el enlace se guarda, se
 * comparte y sobrevive a una recarga (`AC-018`). Aquí no hay base ni navegador — solo la lectura de
 * unos parámetros de texto que pueden venir de cualquiera (`D-001`).
 */
export const ESTADOS = ["todos", "disponibles", "agotados", "negativos"] as const;
export type EstadoExistencias = (typeof ESTADOS)[number];

/** Cuántos productos entran de una vez. Pendiente de validar con un catálogo largo de verdad. */
export const TANDA = 24;
/** Tope duro: una dirección escrita a mano no puede pedir el catálogo entero. */
export const VER_MAXIMO = TANDA * 20;

export type FiltrosCatalogo = {
  busqueda: string | null;
  categoria: string | null;
  existencias: EstadoExistencias;
  desde: number | null;
  hasta: number | null;
  ver: number;
};

export type ParametrosCrudos = Record<string, string | string[] | undefined>;

const primero = (valor: string | string[] | undefined): string =>
  (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";

function entero(valor: string): number | null {
  if (!valor) return null;
  const limpio = valor.replace(/[\s.,]/g, "");
  if (!/^\d+$/.test(limpio)) return null;
  return Number(limpio);
}

/**
 * Nunca lanza. Un parámetro imposible se ignora, no tumba la pantalla: la dirección la puede
 * escribir cualquiera, y un catálogo que revienta con `?desde=hola` es un catálogo roto.
 */
export function leerFiltros(params: ParametrosCrudos): FiltrosCatalogo {
  const estadoCrudo = primero(params.existencias) as EstadoExistencias;
  const existencias = ESTADOS.includes(estadoCrudo) ? estadoCrudo : "todos";

  let desde = entero(primero(params.desde));
  let hasta = entero(primero(params.hasta));
  // Al revés se entiende igual. Corregirlo en silencio es mejor que devolver cero resultados y
  // dejar al dueño mirando una lista vacía sin saber por qué.
  if (desde !== null && hasta !== null && desde > hasta) [desde, hasta] = [hasta, desde];

  const verPedido = entero(primero(params.ver)) ?? TANDA;
  const ver = Math.min(Math.max(verPedido, TANDA), VER_MAXIMO);

  return {
    busqueda: primero(params.q) || null,
    categoria: primero(params.categoria) || null,
    existencias,
    desde,
    hasta,
    ver,
  };
}

/** Verdadero cuando algo acota de verdad. La paginación no cuenta: no es un filtro. */
export function hayFiltros(f: FiltrosCatalogo): boolean {
  return Boolean(f.busqueda || f.categoria || f.desde !== null || f.hasta !== null) ||
    f.existencias !== "todos";
}

/**
 * La dirección de la misma consulta con algo cambiado. Se usa para «Ver más», que conserva los
 * filtros porque los vuelve a escribir enteros (`AC-017`).
 */
export function comoDireccion(f: FiltrosCatalogo, cambios: Partial<FiltrosCatalogo> = {}): string {
  const final = { ...f, ...cambios };
  const p = new URLSearchParams();
  if (final.busqueda) p.set("q", final.busqueda);
  if (final.categoria) p.set("categoria", final.categoria);
  if (final.existencias !== "todos") p.set("existencias", final.existencias);
  if (final.desde !== null) p.set("desde", String(final.desde));
  if (final.hasta !== null) p.set("hasta", String(final.hasta));
  if (final.ver !== TANDA) p.set("ver", String(final.ver));
  const texto = p.toString();
  return texto ? `/catalogo?${texto}` : "/catalogo";
}

export function siguienteTanda(f: FiltrosCatalogo): number {
  return Math.min(f.ver + TANDA, VER_MAXIMO);
}
