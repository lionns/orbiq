import { describe, expect, it } from "vitest";
import { nuevoId } from "./ids";

describe("identificadores (D-002)", () => {
  it("no son secuenciales", () => {
    const ids = Array.from({ length: 100 }, nuevoId);
    expect(new Set(ids).size).toBe(100);
  });

  it("quedan ordenados en el tiempo: dos seguidos ordenan igual como texto que como secuencia", () => {
    const ids = Array.from({ length: 50 }, nuevoId);
    expect([...ids].sort()).toEqual(ids);
  });

  it("no revelan el volumen del negocio: dos consecutivos no difieren en uno", () => {
    const [a, b] = [nuevoId(), nuevoId()];
    expect(a).not.toBe(b);
    // El sufijo aleatorio hace que la distancia entre dos ids no sea informativa.
    expect(a.slice(-12)).not.toBe(b!.slice(-12));
  });
});
