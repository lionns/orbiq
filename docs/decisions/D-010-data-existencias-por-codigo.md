# D-010 — Un producto con varios códigos, y las existencias separadas por código

- Status: accepted
- Date: 2026-09-27
- Supersedes: none
- Tasks: T-032

## Context

El proveedor cambia el código de barras de un producto que la tienda ya vende. Hoy el producto
tiene un solo código, así que el escaneo dice «no está» y la salida es darlo de alta otra vez: dos
fichas del mismo producto, con dos precios y dos conteos. El cliente pide añadir el código nuevo al
producto que ya existe, y saber cuántas unidades hay de cada código.

## Decision

Los códigos pasan a una tabla propia, `product_barcode`, varios por producto y únicos entre todos.
Cada movimiento del libro dice de qué código fue (`stock_movement.barcode_id`, nulo = sin código).
El precio sigue siendo del producto. Lo vendido sin escanear se descuenta del código más antiguo
que tenga unidades.

## Consequences

- La cantidad de un código es la suma de sus movimientos: sale del libro, como el total
  (`D-002`). No se materializa por código; el total de `product.stock` sigue siendo la copia.
- La migración **completa** una columna nueva en movimientos existentes con el único código que su
  producto tenía. No cambia cantidad, tipo ni fecha de ningún movimiento: dice lo que ya era cierto.
- `product.barcode` desaparece. Una sola fuente para los códigos, no dos que puedan discrepar.
- Nace el tipo de movimiento `purchase` («Llegaron»): entrada de mercancía con su código.
- Un producto sigue sin variantes (`brief.md` § In Scope): varios códigos son el mismo producto.

## References

- Prototipo validado el 2026-09-27: `.diseno/codigos/`
- `docs/project/data-model.md` § product_barcode
