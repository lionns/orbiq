/**
 * La zona horaria del negocio. Mismo argumento que la moneda en `moneda.ts`, y por eso vive al
 * lado y no en el esquema: un despliegue por negocio es una zona por base (`D-005`).
 *
 * Existe porque «hoy» no es una pregunta que sepan responder ni la base ni el servidor. Neon corre
 * su sesión en UTC y Vercel su proceso en la zona que le toque, así que sin esto el corte del día
 * lo decidía la infraestructura: una venta de las nueve de la noche en Bogotá se listaba bajo el
 * día siguiente —ya es el día siguiente en UTC— con su hora correcta al lado. La pantalla del
 * cierre de caja se contradecía a sí misma en las últimas cinco horas de cada jornada.
 *
 * Cambiar de país es cambiar esta constante, igual que con la moneda. Varios negocios en zonas
 * distintas sobre la misma base es multi-tenancy, y eso lo gobierna `D-005`, no este archivo.
 */
export const ZONA_DEL_NEGOCIO = "America/Bogota";

/**
 * `YYYY-MM-DD` del instante dado, en la zona del negocio. Es la misma noción de día que
 * `ventasPorDia` agrupa en SQL, escrita una sola vez para quien tenga que preguntarla fuera de
 * SQL — hoy, las pruebas que comprueban bajo qué día debe caer una venta.
 *
 * `en-CA` no es un descuido: es el `locale` cuyo formato corto **es** `YYYY-MM-DD`, así que la
 * cadena sale ya en el orden que la pantalla y la base usan, sin recomponerla a mano.
 */
export function diaDelNegocio(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_DEL_NEGOCIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}
