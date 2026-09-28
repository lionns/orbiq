/**
 * La venta en curso, sin base de datos delante. Vive en la pantalla mientras el dueño la arma, y
 * viaja entera al servidor al confirmar. Aquí no hay efectos: solo la aritmética que el dueño ve
 * cambiar mientras toca (`D-001`).
 */
export type ArticuloEnVenta = {
  productoId: string;
  nombre: string;
  /** Precio vigente al momento de tocarlo. El servidor lo vuelve a leer al confirmar (`AC-009`). */
  precio: number;
  cantidad: number;
  /**
   * El código escaneado, si lo hubo (`D-010`). Lo vendido sale de ese código; sin él, el servidor
   * lo descuenta del más antiguo con unidades. Opcional: una venta guardada en el dispositivo antes
   * de que existiera sigue siendo válida.
   */
  codigoId?: string | null;
  /** El número de ese código, para decirlo en la línea («Código …4432»). */
  codigo?: string | null;
};

/**
 * Qué hace que dos artículos sean la misma línea: el producto y el código del que salen. El mismo
 * producto escaneado con su código viejo y con el nuevo son dos líneas, porque descuentan de dos
 * sitios distintos. Sin código, la clave es el producto a secas.
 */
export function clave(a: Pick<ArticuloEnVenta, "productoId" | "codigoId">): string {
  return a.codigoId ? `${a.productoId}:${a.codigoId}` : a.productoId;
}

export type Carrito = {
  /** Generado en el cliente antes de enviar. Su unicidad ES la idempotencia (`D-005`, `AC-010`). */
  id: string;
  articulos: ArticuloEnVenta[];
};

export function carritoVacio(id: string): Carrito {
  return { id, articulos: [] };
}

/**
 * Añadir un producto que ya está en la venta suma uno, no lo duplica. Lo nuevo va **arriba**: es lo
 * que se acaba de escanear, y es lo que el dueño busca con la vista (`T-033`).
 */
export function agregar(carrito: Carrito, producto: Omit<ArticuloEnVenta, "cantidad">): Carrito {
  const k = clave(producto);
  const existente = carrito.articulos.find((a) => clave(a) === k);
  if (!existente) {
    return { ...carrito, articulos: [{ ...producto, cantidad: 1 }, ...carrito.articulos] };
  }
  return {
    ...carrito,
    articulos: carrito.articulos.map((a) => (clave(a) === k ? { ...a, cantidad: a.cantidad + 1 } : a)),
  };
}

/**
 * Bajar a cero saca el artículo. Un artículo con cantidad cero no es una línea de venta. `k` es la
 * clave de la línea (`clave`), que sin código es el producto.
 */
export function cambiarCantidad(carrito: Carrito, k: string, cantidad: number): Carrito {
  if (cantidad <= 0) {
    return { ...carrito, articulos: carrito.articulos.filter((a) => clave(a) !== k) };
  }
  return {
    ...carrito,
    articulos: carrito.articulos.map((a) => (clave(a) === k ? { ...a, cantidad } : a)),
  };
}

export function total(carrito: Carrito): number {
  return carrito.articulos.reduce((suma, a) => suma + a.precio * a.cantidad, 0);
}

export function unidades(carrito: Carrito): number {
  return carrito.articulos.reduce((suma, a) => suma + a.cantidad, 0);
}

export function estaVacio(carrito: Carrito): boolean {
  return carrito.articulos.length === 0;
}
