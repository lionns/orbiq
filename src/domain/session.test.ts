import { describe, expect, it } from "vitest";
import { sesionVigente, type Sesion } from "./session";

const enHoras = (h: number) => new Date(Date.now() + h * 3600 * 1000);
const sesion = (expiraEn: Date): Sesion => ({
  usuarioId: "u1",
  nombre: "Dueño",
  correo: "dueno@negocio.test",
  expiraEn,
  rol: "owner",
  deBajaDesde: null,
});

describe("sesionVigente", () => {
  it("devuelve la sesión cuando todavía no vence", () => {
    const s = sesion(enHoras(1));
    expect(sesionVigente(s)).toBe(s);
  });

  it("trata una sesión vencida como ausente, no como inválida", () => {
    expect(sesionVigente(sesion(enHoras(-1)))).toBeNull();
  });

  it("no acepta una sesión que vence justo ahora", () => {
    const ahora = new Date("2026-09-06T12:00:00Z");
    expect(sesionVigente(sesion(ahora), ahora)).toBeNull();
  });

  it("una persona dada de baja no tiene sesión, aunque la suya no haya vencido", () => {
    const s = { ...sesion(enHoras(24)), rol: "staff" as const, deBajaDesde: new Date() };
    expect(sesionVigente(s)).toBeNull();
  });

  it("sin sesión no inventa una", () => {
    expect(sesionVigente(null)).toBeNull();
  });
});
