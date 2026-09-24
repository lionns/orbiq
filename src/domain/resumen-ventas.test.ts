import { describe, expect, it } from "vitest";
import { diaDelNegocio } from "./zona";
import { resumirDias } from "./resumen";
import type { DiaDeVentas } from "./venta";

describe("resumirDias", () => {
  it("cuenta el dinero y las ventas válidas del mismo rango que la lista, y separa las anuladas", () => {
    const cuando = new Date("2026-03-01T02:30:00Z");
    const dia = diaDelNegocio(cuando);
    const dias: DiaDeVentas[] = [
      {
        dia,
        total: 9000,
        ventas: [
          { id: "1", total: 5000, cuando, articulos: 2, anulada: false },
          { id: "2", total: 4000, cuando, articulos: 1, anulada: false },
          { id: "3", total: 7000, cuando, articulos: 3, anulada: true },
        ],
      },
      {
        dia: "2026-02-27",
        total: 2000,
        ventas: [{ id: "4", total: 2000, cuando, articulos: 1, anulada: false }],
      },
    ];

    expect(dia).toBe("2026-02-28");
    expect(resumirDias(dias)).toEqual({ total: 11000, numeroVentas: 3, anuladas: 1 });
    expect(resumirDias([])).toEqual({ total: 0, numeroVentas: 0, anuladas: 0 });
  });
});
