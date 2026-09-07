/**
 * Peso colombiano. Decidido con el estudio el 2026-09-06; cierra la pregunta abierta de
 * `data-model.md` § Open Questions.
 *
 * El COP no tiene centavos en circulación, así que su unidad mínima **es** el peso: lo que el dueño
 * teclea es lo que se guarda, sin factor de conversión. Un despliegue por negocio significa una
 * moneda por base (`D-005`), así que cambiar de país es cambiar este archivo, no el esquema —
 * salvo que la moneda nueva tenga centavos, y entonces los precios ya guardados hay que
 * multiplicarlos.
 */
export const MONEDA = {
  codigo: "COP",
  /** Decimales de la unidad corriente. En 0, lo que se teclea es lo que se guarda. */
  decimales: 0,
  locale: "es-CO",
} as const;

const AGRUPADORES = /[\s.,]/g;

const FORMATO = new Intl.NumberFormat(MONEDA.locale, {
  style: "currency",
  currency: MONEDA.codigo,
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: MONEDA.decimales,
  maximumFractionDigits: MONEDA.decimales,
  // El español no agrupa los números de cuatro cifras, pero una lista de precios donde 3500 va
  // sin punto y 12.500 con él se lee peor: la vista busca el separador para calcular la magnitud.
  // `true` equivale a "always"; se usa así porque el `lib` del proyecto es ES2022 y todavía tipa
  // esta opción como booleana.
  useGrouping: true,
});

/**
 * Lee lo que el dueño teclea. Acepta los separadores de miles que salen solos al escribir —
 * `12.500`, `12 500`, `12,500` — porque exigir el formato exacto en un celular es pedirle que se
 * equivoque mientras hay alguien esperando.
 */
export function parsearPrecio(texto: string): number | null {
  const limpio = texto.trim().replace(/^\$/, "").trim();
  if (!limpio) return null;
  if (MONEDA.decimales > 0) {
    const normalizado = Number(limpio.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(normalizado)) return null;
    return Math.round(normalizado * 10 ** MONEDA.decimales);
  }
  const soloDigitos = limpio.replace(AGRUPADORES, "");
  if (!/^-?\d+$/.test(soloDigitos)) return null;
  return Number(soloDigitos);
}

/**
 * `Intl` separa el símbolo con un espacio duro (U+00A0) siguiendo la convención de es-CO. Se deja
 * como viene: es la del país, no una elección nuestra.
 */
export function formatearPrecio(unidadesMinimas: number): string {
  return FORMATO.format(unidadesMinimas / 10 ** MONEDA.decimales);
}
