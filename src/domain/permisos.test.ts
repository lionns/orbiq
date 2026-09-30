import { describe, expect, it } from "vitest";
import { leerRol, puede, type Accion } from "./permisos";

const TODAS: Accion[] = ["anular", "editarProducto", "ajustarConteo", "administrarPersonas"];

describe("lo que puede cada rol (D-013)", () => {
  it("el dueño puede todo", () => {
    for (const a of TODAS) expect(puede("owner", a)).toBe(true);
  });

  it("un empleado no anula, no edita productos, no corrige el conteo ni administra personas", () => {
    for (const a of TODAS) expect(puede("staff", a)).toBe(false);
  });

  it("sin rol, o con uno que no se conoce, no se puede nada", () => {
    for (const a of TODAS) {
      expect(puede(null, a)).toBe(false);
      expect(puede(undefined, a)).toBe(false);
      expect(puede(leerRol("admin"), a)).toBe(false);
    }
  });

  it("lee los dos roles que existen y ninguno más", () => {
    expect(leerRol("owner")).toBe("owner");
    expect(leerRol("staff")).toBe("staff");
    expect(leerRol("Owner")).toBeNull();
    expect(leerRol(undefined)).toBeNull();
  });
});
