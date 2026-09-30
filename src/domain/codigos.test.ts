import { describe, expect, it } from "vitest";
import { cola, existenciasPorCodigo, repartir, type Grupo } from "./codigos";

const viejo: Grupo = { id: "viejo", desde: 1, cantidad: 4 };
const nuevo: Grupo = { id: "nuevo", desde: 2, cantidad: 24 };

describe("repartir lo vendido sin escanear (AC-027)", () => {
  it("sale del código más antiguo que tiene unidades", () => {
    expect(repartir([nuevo, viejo], 3)).toEqual([{ codigoId: "viejo", cantidad: 3 }]);
  });

  it("si el más antiguo no alcanza, sigue con el siguiente", () => {
    expect(repartir([viejo, nuevo], 6)).toEqual([
      { codigoId: "viejo", cantidad: 4 },
      { codigoId: "nuevo", cantidad: 2 },
    ]);
  });

  it("se salta los códigos agotados o en negativo", () => {
    const agotado = { ...viejo, cantidad: 0 };
    const negativo = { id: "raro", desde: 0, cantidad: -2 };
    expect(repartir([agotado, negativo, nuevo], 1)).toEqual([{ codigoId: "nuevo", cantidad: 1 }]);
  });

  it("lo que no cabe en ninguno se descuenta del más reciente", () => {
    expect(repartir([viejo, { ...nuevo, cantidad: 1 }], 8)).toEqual([
      { codigoId: "viejo", cantidad: 4 },
      { codigoId: "nuevo", cantidad: 4 },
    ]);
  });

  it("todo agotado: sale del más reciente y queda en negativo", () => {
    expect(repartir([{ ...viejo, cantidad: 0 }, { ...nuevo, cantidad: 0 }], 2)).toEqual([
      { codigoId: "nuevo", cantidad: 2 },
    ]);
  });

  it("el grupo sin código es el más antiguo, aunque su fecha diga otra cosa", () => {
    const sin = { id: null, desde: 99, cantidad: 5 };
    expect(repartir([nuevo, sin], 2)).toEqual([{ codigoId: null, cantidad: 2 }]);
  });

  it("un producto sin grupos lo descuenta del sin código", () => {
    expect(repartir([], 3)).toEqual([{ codigoId: null, cantidad: 3 }]);
  });

  it("siempre reparte exactamente lo pedido", () => {
    for (const pedida of [1, 4, 5, 28, 40]) {
      const total = repartir([viejo, nuevo], pedida).reduce((s, p) => s + p.cantidad, 0);
      expect(total).toBe(pedida);
    }
  });
});

describe("existencias por código", () => {
  const codigos = [
    { id: "b", numero: "7702511004432", desde: new Date("2026-09-27") },
    { id: "a", numero: "7702511000014", desde: new Date("2026-09-06") },
  ];

  it("suma el libro de cada código, del más antiguo al más nuevo", () => {
    const r = existenciasPorCodigo(codigos, [
      { codigoId: "a", quantity: 10 },
      { codigoId: "a", quantity: -6 },
      { codigoId: "b", quantity: 24 },
      { codigoId: "b", quantity: -1 },
    ]);
    expect(r.codigos.map((c) => [c.id, c.cantidad])).toEqual([
      ["a", 4],
      ["b", 23],
    ]);
    expect(r.sinCodigo).toBeNull();
  });

  it("muestra lo que no tiene código solo si hay movimientos sin código", () => {
    const r = existenciasPorCodigo(codigos, [
      { codigoId: null, quantity: 31 },
      { codigoId: "b", quantity: 5 },
    ]);
    expect(r.sinCodigo).toBe(31);
    expect(r.codigos.reduce((s, c) => s + c.cantidad, 0) + r.sinCodigo!).toBe(36);
  });

  it("lo que quedó en cero sin código no se muestra: tras etiquetar, todo está en el código", () => {
    // El par `relabel` de `D-012`: −12 sin código y +12 en el código nuevo.
    const r = existenciasPorCodigo(codigos, [
      { codigoId: null, quantity: 12 },
      { codigoId: null, quantity: -12 },
      { codigoId: "a", quantity: 12 },
    ]);
    expect(r.sinCodigo).toBeNull();
    expect(r.codigos.find((c) => c.id === "a")?.cantidad).toBe(12);
  });

  it("lo vendido de más sin código sí se muestra, en negativo", () => {
    const r = existenciasPorCodigo(codigos, [{ codigoId: null, quantity: -2 }]);
    expect(r.sinCodigo).toBe(-2);
  });

  it("un producto sin códigos no tiene grupo aparte: su total ya lo dice", () => {
    expect(existenciasPorCodigo([], [{ codigoId: null, quantity: 9 }]).sinCodigo).toBeNull();
  });
});

describe("cola de un código", () => {
  it("nombra un código por sus últimos cuatro dígitos", () => {
    expect(cola("7702511004432")).toBe("…4432");
    expect(cola("123")).toBe("123");
  });
});
