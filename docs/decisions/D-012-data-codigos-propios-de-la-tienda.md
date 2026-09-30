# D-012 — Códigos propios de la tienda, en el rango interno de EAN-13

- Status: accepted
- Date: 2026-09-29
- Supersedes: none
- Tasks: T-038

## Context

El cliente pide poder escanear también lo que no trae código —pan, queso, huevos—. `brief.md` dejaba
fuera imprimir etiquetas porque eso se resolvía buscando por nombre. Y si a un producto sin código
solo se le pega uno, sus unidades se quedan en «sin código» y el código nuevo arranca en cero: la
primera venta escaneada lo deja en negativo.

## Decision

El código que genera la tienda es un EAN-13 que empieza por `2`, el rango que GS1 reserva para uso
dentro de una tienda, y es una fila más de `product_barcode` (`D-010`). Al generarlo, lo que había
«sin código» pasa a ese código con un par de movimientos de un tipo nuevo, `relabel` («Etiquetado»):
−N sin código y +N en el código. Suman cero.

## Consequences

- Todo lo que vende la tienda se puede escanear, y el lector no cambia: ya lee EAN-13.
- Un código de la tienda no choca nunca con uno de fábrica, que no empieza por `2`.
- El libro no se reescribe (`D-002`): el traslado queda escrito y el total del producto no cambia.
  Añadir el valor al enum es una migración de una línea.
- Solo se genera para un producto sin ningún código. Uno que ya tiene código no lo necesita.
- La hoja es carta de 30 etiquetas. Cambiar de hoja o pasar a impresora térmica cambia la hoja,
  no el código.

## References

- Prototipo validado el 2026-09-29: `.diseno/etiquetas/`
- `docs/project/data-model.md` § stock_movement
