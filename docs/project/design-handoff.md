# Design Handoff

Sistema mínimo, derivado de las restricciones reales del brief — no de una marca. Cuando orbiq
tenga identidad, se reemplazan los valores y las reglas siguen sirviendo.

## Visual References

- No hay marca todavía. La referencia es la situación de uso: de pie, una mano, un celular
  cualquiera, posiblemente con luz de día entrando al local (`brief.md` § Users).
- La comparación relevante no son otras aplicaciones de inventario: es el cuaderno. Si abrir la
  aplicación se siente más lento que anotar, se pierde (`brief.md` § Constraints).

## Design Tokens

### Color

Neutros más un acento. El acento es el único color saturado del flujo de venta, y existe para que
"Confirmar" no se confunda con nada más.

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#FFFFFF` | Fondo |
| `surface` | `#F5F5F4` | Tarjetas, cuadrícula de frecuentes |
| `border` | `#D6D3D1` | Separadores decorativos. 1.49:1 — **no vale para el borde de un control** |
| `border-strong` | `#8E8781` | Borde de campos y botones. 3.54:1 sobre `bg`, cumple el mínimo de 3:1 |
| `text` | `#1C1917` | Texto principal — 17.49:1 sobre `bg` |
| `text-muted` | `#57534E` | Secundario — 7.63:1 sobre `bg` |
| `accent` | `#0F766E` | Acción de confirmar. 5.47:1 sobre blanco |
| `accent-text` | `#FFFFFF` | Sobre `accent`. 5.47:1 |
| `danger` | `#B91C1C` | Anular, existencias negativas. 6.47:1 sobre blanco |
| `warning` | `#A16207` | Se está acabando. 4.92:1 sobre blanco |

#### Tema oscuro

Añadido el 2026-09-07 (`T-007`). Los ratios son contra `bg: #1C1917` y están medidos uno por uno,
igual que los del claro. Los tamaños, la escala y los radios no cambian: el tema solo redefine
color.

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#1C1917` | Fondo. No es negro puro: en OLED el negro absoluto emborrona el texto al desplazar |
| `surface` | `#292524` | Tarjetas, cuadrícula de frecuentes |
| `border` | `#44403C` | Separadores decorativos. 1.70:1 — **no vale para el borde de un control** |
| `border-strong` | `#78716C` | Borde de campos y botones. 3.65:1 sobre `bg`, 3.16:1 sobre `surface` |
| `text` | `#FAFAF9` | Texto principal — 16.74:1 sobre `bg` |
| `text-muted` | `#A8A29E` | Secundario — 6.93:1 sobre `bg`, 6.01:1 sobre `surface` |
| `accent` | `#14B8A6` | Acción de confirmar. 7.03:1 sobre `bg` |
| `accent-text` | `#1C1917` | Sobre `accent`. 7.03:1 |
| `danger` | `#F87171` | Anular, existencias negativas. 6.32:1 sobre `bg` |
| `warning` | `#FBBF24` | Se está acabando. 10.48:1 sobre `bg` |

**`accent-text` cambia de color entre temas y es lo único que lo hace.** En claro es blanco (5.47:1
sobre el acento); en oscuro tiene que ser oscuro, porque blanco sobre `#14B8A6` da **2.49:1** y no
se lee. Es el par que más fácilmente se hereda mal al añadir un tema oscuro, y por eso hay una
prueba que fija los dos.

Tres estados y no dos: claro, oscuro y **no elegir**. Sin elegir manda `prefers-color-scheme`. El
CSS lo resuelve con `:root:not([data-theme="light"])` dentro de la consulta de medio; sin ese
`:not`, quien pide claro con el dispositivo en oscuro se quedaría oscuro.

Ningún estado se comunica solo por color: existencias bajas llevan además un texto (`AC-X02`,
Accessibility Notes).

### Typography

- **Pila de sistema**, sin fuente web. Una tipografía descargada son 40-100 kB por datos móviles
  antes de que se vea el primer precio (`brief.md` § Constraints).
- Escala: `12 · 14 · 16 · 20 · 28 · 40`.
- **16 px es el mínimo en cualquier campo de entrada.** Por debajo, iOS hace zoom al enfocar y saca
  al dueño del flujo.
- El total de la venta va en `40`. Es el número que se mira mientras se cobra.
- Precios y cantidades con cifras tabulares, para que no bailen al cambiar.

### Spacing

Base 4. Escala: `4 · 8 · 12 · 16 · 24 · 32 · 48`. `16` es el margen lateral por defecto en celular.

### Radius

`0` (nada) · `8` (tarjetas, campos) · `12` (botones grandes) · `9999` (píldoras de cantidad).

### Elevation

Casi nada. Se prefiere borde de `1px`, que sobrevive a una pantalla barata al sol donde una sombra
suave desaparece. Sombra solo en la barra fija de total, para separarla de lo que scrollea debajo.

## Responsive Behavior

Se diseña en 360 px y se ensancha. Un solo código, nunca dos interfaces (`FR-010`, `D-007`).

- **< 640 px (celular, el caso que manda):** una columna. Cuadrícula de frecuentes de 2 columnas.
  **Barra fija abajo** con el total y "Confirmar" — abajo porque ahí llega el pulgar, no arriba.
  La navegación también vive abajo.
- **640–1024 px (tablet):** cuadrícula de 3-4 columnas. La barra de total sigue fija.
- **> 1024 px (computador):** dos columnas — cuadrícula a la izquierda, venta en curso a la derecha
  y siempre visible. La navegación pasa a un lateral.

Regla de pulgar: en celular, ninguna acción del flujo de venta vive en el tercio superior de la
pantalla.

## Interaction States

- **Hover:** solo bajo `@media (hover: hover)`. En táctil no existe y no debe simularse.
- **Focus:** anillo visible de 2 px siempre, nunca `outline: none`. Un lector de código de barras es
  un teclado, y sin foco visible no se sabe dónde va a escribir (`AC-X02`).
- **Active:** retroalimentación en menos de 100 ms al tocar un producto. Si el dueño duda si lo
  añadió, lo toca dos veces y vende de más.
- **Loading:** el botón de confirmar se bloquea y dice qué está haciendo. Nunca queda tocable dos
  veces — aunque la idempotencia de `FR-005` lo cubra por detrás, la duda ya rompió el flujo.
- **Empty:** el catálogo vacío ofrece dar de alta el primer producto, no una ilustración.
- **Error:** en el sitio donde falló, con qué hacer. La caída de red dice explícitamente que **no**
  se guardó y ofrece reintentar (`AC-015`).
- **Success:** una venta confirmada deja la pantalla lista para la siguiente. Sin diálogo que haya
  que cerrar: la siguiente persona ya está esperando.

## Motion

- Transiciones de 120-160 ms, solo para que un cambio no aparezca de golpe. Nada decorativo: cada
  milisegundo de animación se resta de los veinte segundos de `NFR-002`.
- Nada se mueve bajo el pulgar. Añadir un producto no reordena la lista que se está tocando.
- `prefers-reduced-motion: reduce` elimina toda transición. No es una versión degradada.

## Accessibility Notes

- Contraste mínimo 4.5:1 para texto y 3:1 para bordes de control. Cada token lleva su ratio medido
  (`node`, fórmula WCAG 2.1), no estimado. `border` está por debajo de 3:1 a propósito: separa, no
  delimita un control. Todo control usa `border-strong`.
- Objetivo táctil mínimo **48 × 48 px** en el flujo de venta, con 8 px de separación. De pie y con
  una mano, 44 no alcanza.
- Toda la aplicación operable con teclado, en orden lógico (`AC-X02`).
- Ningún estado se comunica solo por color ni solo por icono: siempre hay texto.
- El objetivo de escaneo se puede saltar con el teclado — quien use lector no debería tener que
  tocar la pantalla nunca.
- **Sin decidir:** modo oscuro. Se evalúa cuando haya un dueño usándola de noche, no antes.
