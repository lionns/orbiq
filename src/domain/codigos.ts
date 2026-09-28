import { saldoDesdeLibro } from "./stock";

/**
 * Las reglas de los códigos de un producto, sin base delante (`D-010`). Un producto puede tener
 * varios códigos porque el proveedor los cambia, y cada uno lleva su cantidad. Aquí vive la única
 * definición de «cuánto hay de este código» y de «de qué código sale lo vendido sin escanear».
 */

/**
 * Un grupo de existencias de un producto: uno de sus códigos, o el grupo sin código (`id: null`),
 * que es donde caen los movimientos de lo que se registró antes de tener código.
 */
export type Grupo = {
  id: string | null;
  /** Cuándo empezó el grupo. El sin código es el más antiguo: existía antes que todo código. */
  desde: number;
  cantidad: number;
};

export type Porcion = { codigoId: string | null; cantidad: number };

/** Los grupos del más antiguo al más nuevo, con el sin código siempre primero. */
function ordenados(grupos: readonly Grupo[]): Grupo[] {
  return [...grupos].sort((a, b) => {
    if (a.id === null) return -1;
    if (b.id === null) return 1;
    return a.desde - b.desde;
  });
}

/**
 * Reparte lo vendido sin escanear entre los grupos de un producto (`AC-027`).
 *
 * Sale primero del más antiguo que tenga unidades: es lo que lleva más tiempo en el estante. Lo
 * que ya no cabe en ninguno se descuenta del más reciente, que es el que se está vendiendo ahora, y
 * queda en negativo — que está permitido (`data-model.md` § Open Questions). Un producto sin
 * ningún código lo descuenta todo del grupo sin código.
 */
export function repartir(grupos: readonly Grupo[], pedida: number): Porcion[] {
  const orden = ordenados(grupos);
  const porciones = new Map<string | null, number>();
  let falta = pedida;

  for (const g of orden) {
    if (falta <= 0) break;
    if (g.cantidad <= 0) continue;
    const toma = Math.min(g.cantidad, falta);
    porciones.set(g.id, (porciones.get(g.id) ?? 0) + toma);
    falta -= toma;
  }

  if (falta > 0) {
    const ultimo = orden.at(-1)?.id ?? null;
    porciones.set(ultimo, (porciones.get(ultimo) ?? 0) + falta);
  }

  return [...porciones].map(([codigoId, cantidad]) => ({ codigoId, cantidad }));
}

export type CodigoConCantidad = {
  id: string;
  numero: string;
  desde: Date;
  cantidad: number;
};

export type ExistenciasPorCodigo = {
  codigos: CodigoConCantidad[];
  /**
   * Lo que no tiene código. `null` cuando no hay nada que mostrar: ningún movimiento sin código, o
   * un producto que nunca tuvo código (ahí el total ya lo dice todo).
   */
  sinCodigo: number | null;
};

/**
 * Cuánto hay de cada código, sumando el libro (`D-002`). Sale de los mismos movimientos que el
 * total, así que la suma de los grupos es el total por construcción.
 */
export function existenciasPorCodigo(
  codigos: readonly { id: string; numero: string; desde: Date }[],
  movimientos: readonly { codigoId: string | null; quantity: number }[],
): ExistenciasPorCodigo {
  const de = (id: string | null) => movimientos.filter((m) => m.codigoId === id);
  const sinCodigo = de(null);
  return {
    codigos: [...codigos]
      .sort((a, b) => a.desde.getTime() - b.desde.getTime())
      .map((c) => ({ ...c, cantidad: saldoDesdeLibro(de(c.id)) })),
    sinCodigo: codigos.length > 0 && sinCodigo.length > 0 ? saldoDesdeLibro(sinCodigo) : null,
  };
}

/** Los últimos cuatro dígitos: así se nombra un código en una línea donde no cabe entero. */
export function cola(numero: string): string {
  return numero.length > 4 ? `…${numero.slice(-4)}` : numero;
}
