import { describe, expect, it } from "vitest";
import { diaDelNegocio, ZONA_DEL_NEGOCIO } from "./zona";

/**
 * T-019. Todo con instantes fijos: una prueba de fechas que dependa de `now()` pasa por la mañana
 * y falla por la noche, que es exactamente el defecto que esta tarea vino a quitar.
 */
describe("diaDelNegocio", () => {
  it("da el día del negocio y no el de UTC en las horas en que no coinciden", () => {
    // 21:30 en Bogotá. En UTC ya es el día siguiente, y por ahí se colaba el defecto.
    expect(diaDelNegocio(new Date("2026-03-01T02:30:00Z"))).toBe("2026-02-28");
  });

  it("coincide con UTC cuando el día es el mismo en las dos zonas", () => {
    expect(diaDelNegocio(new Date("2026-03-01T15:00:00Z"))).toBe("2026-03-01");
  });

  it("pone el corte en la medianoche del negocio, no cerca", () => {
    // Bogotá es UTC-5 todo el año: 05:00Z es la medianoche exacta.
    expect(diaDelNegocio(new Date("2026-03-01T04:59:59.999Z"))).toBe("2026-02-28");
    expect(diaDelNegocio(new Date("2026-03-01T05:00:00Z"))).toBe("2026-03-01");
  });

  it("devuelve `YYYY-MM-DD`, que es la forma con la que se acota el rango en la dirección", () => {
    expect(diaDelNegocio(new Date("2026-01-05T15:00:00Z"))).toBe("2026-01-05");
    expect(ZONA_DEL_NEGOCIO).toBe("America/Bogota");
  });
});
