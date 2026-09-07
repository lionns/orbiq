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
};

export type Carrito = {
  /** Generado en el cliente antes de enviar. Su unicidad ES la idempotencia (`D-005`, `AC-010`). */
  id: string;
  articulos: ArticuloEnVenta[];
};

export function carritoVacio(id: string): Carrito {
  return { id, articulos: [] };
}

/** Tocar un producto que ya está en la venta suma uno, no lo duplica. */
export function agregar(carrito: Carrito, producto: Omit<ArticuloEnVenta, "cantidad">): Carrito {
  const existente = carrito.articulos.find((a) => a.productoId === producto.productoId);
  if (!existente) {
    return { ...carrito, articulos: [...carrito.articulos, { ...producto, cantidad: 1 }] };
  }
  return {
    ...carrito,
    articulos: carrito.articulos.map((a) =>
      a.productoId === producto.productoId ? { ...a, cantidad: a.cantidad + 1 } : a,
    ),
  };
}

/** Bajar de uno saca el artículo. Un artículo con cantidad cero no es una línea de venta. */
export function cambiarCantidad(carrito: Carrito, productoId: string, cantidad: number): Carrito {
  if (cantidad <= 0) {
    return { ...carrito, articulos: carrito.articulos.filter((a) => a.productoId !== productoId) };
  }
  return {
    ...carrito,
    articulos: carrito.articulos.map((a) => (a.productoId === productoId ? { ...a, cantidad } : a)),
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
