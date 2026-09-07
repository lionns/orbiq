import { describe, expect, it } from "vitest";
import { saldoCoincide, saldoDesdeLibro } from "./stock";

describe("saldo desde el libro (NFR-005)", () => {
  it("un producto sin movimientos no tiene existencias", () => {
    expect(saldoDesdeLibro([])).toBe(0);
  });

  it("suma un alta, una venta y su anulación de vuelta al punto de partida", () => {
    const libro = [
      { quantity: 12 }, // initial
      { quantity: -3 }, // sale
      { quantity: 3 }, // sale_void: corregir es insertar, no editar
    ];
    expect(saldoDesdeLibro(libro)).toBe(12);
  });

  it("permite saldo negativo: la aplicación registra, no impide (data-model.md § Open Questions)", () => {
    expect(saldoDesdeLibro([{ quantity: 2 }, { quantity: -5 }])).toBe(-3);
  });

  it("detecta que la copia materializada se separó del libro", () => {
    const libro = [{ quantity: 10 }, { quantity: -4 }];
    expect(saldoCoincide(6, libro)).toBe(true);
    expect(saldoCoincide(7, libro)).toBe(false);
  });
});
