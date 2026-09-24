# .diseno

Material de diseño: los artboards que se llevaron al estudio antes de tocar código. No es parte de
la aplicación y nada de `src/` lo importa.

## Qué hay

| Archivo | Qué es |
| --- | --- |
| `Hoy.dc.html` | La pantalla de venta **como está hoy**, recreada desde `src/ui/` con los valores exactos. Es el ancla de la comparación, no una propuesta |
| `Main.dc.html` | La dirección aprobada, tema claro. El que abre por defecto |
| `Oscuro.dc.html` | La misma dirección en tema oscuro. Mismo esqueleto y mismos tamaños: el tema solo redefine color |
| `canvas.json` | Posición de los artboards y las notas del lienzo |
| `cobalto/` | La dirección que reemplaza a esta, validada el 2026-09-24. Contrato de `T-028` y `T-029` |

Cada `.dc.html` es un artboard de 390 × 844 y se abre en cualquier navegador por su cuenta.

## Qué implementan

`T-021` (escala), `T-022` (iconos) y `T-023` (la dirección aplicada a la venta). Los tamaños y los
colores de estos archivos son los que esas tareas tienen que producir.

Validado por el estudio el 2026-09-13. Catálogo, ficha e historial **no están maquetados**: heredan
de `src/ui/` y es el riesgo escrito en `T-023`.

## El archivo generado no se versiona

`venta-tres-direcciones.html` pesa 2,5 MB porque lleva el editor dentro, y se regenera entero desde
los cuatro archivos de arriba. Por eso está en `.gitignore`: lo que se conserva es la fuente.
