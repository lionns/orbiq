/**
 * `data-model.md` § Open Questions deja sin nombrar la moneda del primer cliente, así que aquí no
 * se inventa ninguna: el precio se teclea y se guarda en la **unidad mínima**, sin factor de
 * conversión y sin símbolo. Un despliegue por negocio significa una moneda por base (`D-005`), así
 * que el día que se nombre se cambia este archivo y nada más.
 */
export const MONEDA = {
  /** Decimales de la unidad corriente. En 0, lo que se teclea es lo que se guarda. */
  decimales: 0,
  /** Sin símbolo hasta que la moneda tenga nombre. */
  simbolo: "",
  locale: "es",
} as const;

const AGRUPADORES = /[\s.,]/g;

/**
 * Lee lo que el dueño teclea. Acepta los separadores de miles que salen solos al escribir —
 * `12.500`, `12 500`, `12,500` — porque exigir el formato exacto en un celular es pedirle que se
 * equivoque mientras hay alguien esperando.
 */
export function parsearPrecio(texto: string): number | null {
  const limpio = texto.trim();
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

export function formatearPrecio(unidadesMinimas: number): string {
  const valor = unidadesMinimas / 10 ** MONEDA.decimales;
  const numero = new Intl.NumberFormat(MONEDA.locale, {
    minimumFractionDigits: MONEDA.decimales,
    maximumFractionDigits: MONEDA.decimales,
    // El español no agrupa los números de cuatro cifras, pero una lista de precios donde 3500 va
    // sin punto y 12.500 con él se lee peor: la vista busca el separador para calcular la magnitud.
    // `true` equivale a "always"; se usa así porque el `lib` del proyecto es ES2022 y todavía tipa
    // esta opción como booleana.
    useGrouping: true,
  }).format(valor);
  return MONEDA.simbolo ? `${MONEDA.simbolo}${numero}` : numero;
}
