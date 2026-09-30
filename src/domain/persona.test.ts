import { describe, expect, it } from "vitest";
import { aQuienAvisarEntre, validarContrasena, validarPersona } from "./persona";

describe("los datos de una persona", () => {
  it("limpia el nombre y pasa el correo a minúsculas", () => {
    const r = validarPersona({ nombre: "  María   Gómez ", correo: " Maria@Gmail.com ", contrasena: "12345678" });
    expect(r).toEqual({
      ok: true,
      valor: { nombre: "María Gómez", correo: "maria@gmail.com", contrasena: "12345678" },
    });
  });

  it("dice cada campo que falla, debajo de su campo", () => {
    const r = validarPersona({ nombre: " ", correo: "maria", contrasena: "corta" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errores).sort()).toEqual(["contrasena", "correo", "nombre"]);
  });

  it("la contraseña pide al menos ocho caracteres, como el alta del dueño", () => {
    expect(validarContrasena("1234567")).not.toBeNull();
    expect(validarContrasena("12345678")).toBeNull();
  });
});

describe("a quién avisa un empleado", () => {
  it("nombra al dueño cuando hay uno solo", () => {
    expect(aQuienAvisarEntre(["Juan"])).toBe("a Juan");
  });

  it("con varios dueños —el del estudio también lo es— no elige uno al azar", () => {
    expect(aQuienAvisarEntre(["Juan", "Estudio"])).toBe("al dueño");
    expect(aQuienAvisarEntre([])).toBe("al dueño");
  });
});
