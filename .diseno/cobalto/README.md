# Cobalto

La dirección visual y de navegación que reemplaza a la de `T-023`. Se validó con el estudio el
2026-09-24, pantalla por pantalla y punto por punto, antes de escribir código. Es el contrato de
`T-028` (lo que el servidor tiene que dar) y de `T-029` (cómo se ve y cómo se navega).

Nada de `src/` importa estos archivos. Cada `.dc.html` es un artboard que se abre por su cuenta en
el navegador. Para compararlo con la aplicación, una captura al mismo tamaño:

```sh
npx playwright screenshot --viewport-size=360,844 "file://$PWD/.diseno/cobalto/U-M-Inicio.dc.html" artboard.png
```

Celular a 360 × 844 (algunos son más altos: la altura del artboard lo dice); computador a 1440 × 900.
Si un artboard y la tabla de tokens de abajo difieren, **manda la tabla**.

## Qué hay

| Archivo | Qué es |
| --- | --- |
| `U-M-Inicio` | Celular: la portada nueva, con lo vendido hoy, atajos y la barra de abajo |
| `U-M-Vender` | Celular: la venta recogida en una línea, con Escanear y Cobrar juntos |
| `U-M-Vender-abierta` | Celular: la venta desplegada, con la cantidad escribiéndose |
| `U-M-Cobrada` | Celular: justo después de cobrar, con Deshacer |
| `U-M-Deshecha` | Celular: tras Deshacer, la venta anulada vuelve al carrito para corregirla |
| `U-M-Vaciada` | Celular: la venta vaciada, con Deshacer en vez de un diálogo |
| `U-M-Productos`, `U-M-Ficha` | Celular: la lista y la ficha, con los nombres nuevos |
| `U-M-Ajustes` | Celular: Tema y Salir, fuera de la cabecera |
| `U-D-Inicio`, `U-D-Vender`, `U-D-Productos` | Computador: menú lateral, venta en columna, ficha al lado de la lista |
| `W-Ventas` | Computador: los días como tarjetas y la suma del rango a la derecha |
| `B-Inicio-oscuro`, `W-Inicio-oscuro`, `W-Vender-oscuro` | Tema oscuro, en celular y computador |
| `F-M-Piezas` | Los controles de formulario y sus estados: campo, precio, cantidad, opciones, fecha, interruptor |
| `F-M-Nuevo`, `F-D-Nuevo` | Alta de producto, con la categoría sugiriendo; en computador, en el panel lateral |
| `F-M-Filtros`, `F-D-Filtros` | Filtros sin listas desplegables, en hoja inferior o en el panel lateral |
| `F-M-Ventas`, `F-D-Ventas` | Atajos de fechas y rango. En celular, las fechas van una debajo de otra |
| `F-M-Conteo` | Corregir el conteo con motivos de un toque |
| `F-M-Acceso` | Acceso con el error arriba y «Mostrar» en la contraseña |

## Los catorce puntos validados

1. El carrito no se pierde al salir de Vender. 2. Navegación abajo en el celular: Inicio, Vender,
Ventas, Productos. 3. La venta se recoge en una línea. 4. Escanear y Cobrar juntos, abajo.
5. Tocar la cantidad para escribirla. 6. «Corregir el conteo» igual en todas partes. 7. Tema y
Salir en Ajustes. 8. «Cobrar $ N» en vez de «Confirmar». 9. «Productos» en vez de «Catálogo».
10. «Nuevo producto» fuera del menú. 11. Deshacer justo después de cobrar. 12. «Conteo en -2»,
«Hay 12», «Agotados», «Dejar de vender». 13. En computador, el lector escribe en la búsqueda sin
tocar nada y F2 cobra. 14. «Vaciar» borra la venta sin cobrar de una vez, con Deshacer
en vez de diálogo; va en la cabecera de la venta, lejos de Cobrar.

## Tokens

Mismos nombres que hoy más dos nuevos (`accent-soft`, `danger-soft`). Ratios WCAG 2.1 medidos.

| Token | Claro | Oscuro | Medido |
| --- | --- | --- | --- |
| `bg` | `#E8EBF4` | `#0D0F1C` | |
| `surface` | `#FFFFFF` | `#1C2038` | 1.19:1 sobre `bg` en los dos: supera el 1.18 de `aspecto.spec.ts` |
| `border` | `#DCDFEC` | `#262A44` | Solo separadores |
| `border-strong` | `#767B95` | `#7D83A3` | 4.17 y 4.30 sobre `surface` |
| `text` | `#12152A` | `#EEF0FB` | 18.0 y 14.1 sobre `surface` |
| `text-muted` | `#50566F` | `#A1A7C4` | 6.07 y 8.02 sobre `bg` |
| `accent` | `#2F47D6` | `#8397FF` | 5.89 y 7.11 sobre `bg` |
| `accent-text` | `#FFFFFF` | `#0D0F1C` | 7.02 y 7.11 sobre `accent` |
| `accent-soft` | `#E3E7FC` | `#222A57` | `accent` sobre él: 5.71 y 5.10 |
| `danger` | `#B42318` | `#F97066` | 6.57 y 5.74 sobre `surface` |
| `danger-soft` | `#FBE4E1` | `#3B1C1A` | `danger` sobre él: 5.41 y 5.51 |
| `warning` | `#8A4A08` | `#FBBF24` | Se conserva; ninguna pantalla nueva lo usa |

`bg` claro y `surface` oscuro están un paso más lejos que en los artboards (`#ECEEF6` y `#171A2E`).
Con aquellos, la tarjeta quedaba a 1.16 y 1.11 del fondo, y la prueba de aspecto falla por debajo
de 1.18. A la vista la diferencia no se aprecia; la prueba sí la ve.

Radios: 16 en botones y campos, 24 en tarjetas, 28 en el bloque de Inicio, 9999 en píldoras.
Tipografía: Geist, autoalojada. Sustituye a la pila de sistema.
