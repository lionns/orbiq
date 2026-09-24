import type { DiaDeVentas } from "./venta";

export type ResumenDelRango = { total: number; numeroVentas: number; anuladas: number };

/** La suma del rango se deriva de los mismos días que muestra Ventas. */
export function resumirDias(dias: DiaDeVentas[]): ResumenDelRango {
  return dias.reduce(
    (resumen, dia) => {
      resumen.total += dia.total;
      for (const venta of dia.ventas) {
        if (venta.anulada) resumen.anuladas++;
        else resumen.numeroVentas++;
      }
      return resumen;
    },
    { total: 0, numeroVentas: 0, anuladas: 0 },
  );
}
