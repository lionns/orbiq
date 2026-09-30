# Etiquetas

El prototipo del pedido del cliente: crear un código de barras para los productos que no traen, e
imprimir sus etiquetas. Validado con el estudio el 2026-09-29. Es el contrato
de `T-038`. Usa los tokens de `../cobalto/`; si difieren, manda la tabla de Cobalto.

Nada de `src/` importa estos archivos. Cada `.dc.html` es un artboard de 360 de ancho, salvo `Hoja`,
que es una hoja carta a 96 ppp (816 × 1056). Los códigos de la hoja son EAN-13 reales con prefijo
`2`: se pueden escanear desde la pantalla con la aplicación.

## Qué hay

| Archivo | Qué es |
| --- | --- |
| `Ficha-sin-codigo` | «Generar código» arriba, en la tarjeta de un producto que no tiene |
| `Generado` | El código recién creado, las unidades que pasan a él y cuántas etiquetas imprimir |
| `Historial-etiquetado` | La ficha después: el código con sus unidades, «Imprimir etiquetas» y la línea «Etiquetado» (±0) en el historial |
| `Etiquetas-1-Entrada` | Productos con «Imprimir etiquetas» junto al conteo |
| `Etiquetas-2-Buscar` | Se busca y se filtra con el mismo buscador de Productos, y se marcan. Lo marcado se queda al cambiar la búsqueda |
| `Etiquetas-3-Cuantas` | Cuántas de cada uno, empezando por una por unidad que hay |
| `Hoja` | La hoja carta de 30 etiquetas (3 × 10, 66,7 × 25,4 mm) tal como sale impresa |

## Lo que se decidió al validarlo

1. «Generar código» va arriba, en la tarjeta del producto (dirección B), no dentro de «Por código».
2. Las etiquetas se eligen desde Productos (dirección B), con su buscador y sus filtros: con cientos
   de productos y muchas categorías se busca por nombre o se filtra, se marca, y se vuelve a
   buscar. Lo marcado no se pierde entre búsquedas. Después se ajusta cuántas de cada uno.
3. Al generar el código, las unidades «sin código» pasan a él con un par de movimientos
   «Etiquetado» que suman cero. El total no cambia y el libro no se reescribe (`D-012`).
4. La hoja es carta, de 30 etiquetas (3 × 10, 66,7 × 25,4 mm).
