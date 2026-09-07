/**
 * El saldo de existencias se deriva del libro, siempre (`D-002`, `NFR-005`).
 *
 * `product.stock` es una copia materializada para no sumar el libro entero en cada pantalla. Cuando
 * copia y libro divergen, manda el libro: esta función es la que lo dice.
 */

export type Movimiento = { quantity: number };

/** Suma el libro de un producto. Es la única definición de "cuánto hay". */
export function saldoDesdeLibro(movimientos: readonly Movimiento[]): number {
  return movimientos.reduce((total, m) => total + m.quantity, 0);
}

/** ¿La copia materializada sigue coincidiendo con el libro? */
export function saldoCoincide(saldoMaterializado: number, movimientos: readonly Movimiento[]): boolean {
  return saldoMaterializado === saldoDesdeLibro(movimientos);
}
