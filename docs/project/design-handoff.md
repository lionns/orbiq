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

Neutros más un acento. El acento es el único color saturado del producto, y existe para que la
acción principal —Cobrar— no se confunda con nada más.

Revisados el 2026-09-24 (`T-029`): la dirección **Cobalto**, validada por el estudio en el lienzo
que vive en `.diseno/cobalto/`. Sustituye a la paleta cálida de `T-023`. Hay dos tokens nuevos,
`accent-soft` y `danger-soft`: rellenos suaves para acciones de apoyo (Escanear) y para lo que
borra o alerta (Vaciar, «Agotado»), sin competir con el acento.

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#E8EBF4` | Fondo. La tarjeta blanca se levanta de él a **1.19:1** |
| `surface` | `#FFFFFF` | Tarjetas, campos y botones secundarios |
| `border` | `#DCDFEC` | Separadores decorativos. **No vale para el borde de un control** |
| `border-strong` | `#767B95` | Borde de campos y botones. **4.17:1 sobre `surface`** |
| `text` | `#12152A` | Texto principal — 18.0:1 sobre `surface` |
| `text-muted` | `#50566F` | Secundario — 6.07:1 sobre `bg` |
| `accent` | `#2F47D6` | Cobrar, la navegación activa, el bloque de Inicio. 5.89:1 sobre `bg` |
| `accent-text` | `#FFFFFF` | Sobre `accent`. 7.02:1 |
| `accent-soft` | `#E3E7FC` | Relleno de apoyo. `accent` sobre él: 5.71:1 |
| `danger` | `#B42318` | Anular, vaciar, existencias negativas. 6.57:1 sobre `surface` |
| `danger-soft` | `#FBE4E1` | Relleno de alerta. `danger` sobre él: 5.41:1 |
| `warning` | `#8A4A08` | Se conserva. Ninguna pantalla de Cobalto lo usa hoy |

#### Tema oscuro

Los tamaños, la escala y los radios no cambian: el tema solo redefine color.

| Token | Valor | Uso |
| --- | --- | --- |
| `bg` | `#0D0F1C` | Fondo. No es negro puro: en OLED el negro absoluto emborrona el texto al desplazar |
| `surface` | `#1C2038` | 1.19:1 sobre `bg` |
| `border` | `#262A44` | Separadores decorativos |
| `border-strong` | `#7D83A3` | Borde de campos y botones. 4.30:1 sobre `surface` |
| `text` | `#EEF0FB` | 14.1:1 sobre `surface` |
| `text-muted` | `#A1A7C4` | 8.02:1 sobre `bg` |
| `accent` | `#8397FF` | 7.11:1 sobre `bg` |
| `accent-text` | `#0D0F1C` | Sobre `accent`. 7.11:1 |
| `accent-soft` | `#222A57` | `accent` sobre él: 5.10:1 |
| `danger` | `#F97066` | 5.74:1 sobre `surface` |
| `danger-soft` | `#3B1C1A` | `danger` sobre él: 5.51:1 |
| `warning` | `#FBBF24` | Se conserva |

**`accent-text` cambia de color entre temas y es lo único que lo hace.** En claro es blanco; en
oscuro tiene que ser oscuro, porque blanco sobre `#8397FF` no llega a 3:1. Es el par que más
fácilmente se hereda mal, y por eso hay una prueba que fija los dos (`e2e/tema.spec.ts`).

`bg` claro y `surface` oscuro están un paso más lejos que en el primer lienzo de Cobalto. Con
aquellos, la tarjeta quedaba a 1.16 y 1.11 del fondo, por debajo del 1.18 que exige
`e2e/aspecto.spec.ts`.

Tres estados y no dos: claro, oscuro y **no elegir**. Sin elegir manda `prefers-color-scheme`. El
CSS lo resuelve con `:root:not([data-theme="light"])` dentro de la consulta de medio; sin ese
`:not`, quien pide claro con el dispositivo en oscuro se quedaría oscuro.

#### Un control se distingue por relleno, no solo por borde

Corregido el 2026-09-07 (`T-010`), a raíz de un reporte del estudio: «hay botones que no tienen
bordes o fondo diferente al del cuerpo completo de la página».

`surface` estaba a **1.09:1** del fondo en claro y **1.15:1** en oscuro. Era un fondo distinto que
no se distinguía, y varios controles ni siquiera lo usaban: se apoyaban en un contorno de 1 px, que
no se lee como botón. **Un botón secundario, un campo y una tarjeta llevan relleno además de
borde.** Al pulsarlos caen al fondo de la página, que es la inversión más barata y no necesita un
token nuevo.

`surface` y `border-strong` están **acoplados**: subir uno sin el otro deja el borde por debajo de
3:1 sobre la superficie. Los valores salieron de buscar sobre una rejilla el par que cumple las
tres condiciones a la vez, no de elegir un color que se viera bien.

`e2e/aspecto.spec.ts` recorre las cuatro pantallas en los dos temas y falla si un control deja de
distinguirse de lo que tiene detrás, o si pierde el radio de esquina. Se comprobó que falla con los
valores viejos antes de darla por buena.

Ningún estado se comunica solo por color: existencias bajas llevan además un texto (`AC-X02`,
Accessibility Notes).

### Typography

- **Geist**, autoalojada con `next/font` (`T-029`). Sustituye a la pila de sistema que se había
  elegido para no gastar datos móviles (`brief.md` § Constraints): se sirve desde nuestro origen,
  en un solo archivo variable, y se descarga **una vez**. Si no llega, detrás queda la pila de
  sistema, así que nunca se espera a la fuente para ver un precio. **Medido en el build de `T-029`:
  29 kB** el archivo latino que se precarga; los demás subconjuntos solo bajan si hace falta una
  letra suya.
- Escala: `14 · 16 · 18 · 20 · 24 · 30 · 40`.
- **14 px es el suelo absoluto** (`T-021`). Por debajo no hay texto en ninguna pantalla.
- **16 px es el mínimo en cualquier campo de entrada.** Por debajo, iOS hace zoom al enfocar y saca
  al dueño del flujo.
- El total de la venta va en `40`. Es el número que se mira mientras se cobra.
- Precios y cantidades con cifras tabulares, para que no bailen al cambiar. Se aplican **solo** en
  `src/ui/cifras.tsx`: repartido por las pantallas, un día una columna se queda sin ellas.

#### La jerarquía la hace el tamaño, no el color

Añadido el 2026-09-13 (`T-021`). Hasta entonces **toda la aplicación estaba en 16 px**: no había ni
un `text-xs` ni un `text-sm`, y tampoco nada que destacara. El nombre de un producto, su precio y
sus existencias se leían igual de grandes, así que la vista no tenía dónde agarrarse y había que
leer la casilla entera para saber cuánto costaba algo.

En un producto que se elige para vender —la casilla de la antigua cuadrícula, hoy la fila de
resultados (`T-033`)— manda el precio, le sigue el nombre y las existencias son la nota:

| Elemento | Tamaño | Por qué |
| --- | --- | --- |
| Precio | `24` | Es lo que se compara de un vistazo mientras se cobra |
| Nombre | `18` | Identifica; se lee después de haber encontrado el precio |
| Existencias | `16` | **No baja de 16**: se separa por su píldora y su peso, no encogiéndola |

Las existencias **no se hacen más pequeñas** aunque sean la nota. El saldo negativo está permitido
(`T-004`), así que verlo es la única salvaguarda que queda, y el público de esta aplicación incluye
a un dueño de setenta años. Se separa con relleno y peso, que no cuestan legibilidad.

### Spacing

Base 4. Escala: `4 · 8 · 12 · 16 · 24 · 32 · 48`. `16` es el margen lateral por defecto en celular.

### Radius

`0` (nada) · `16` (botones y campos) · `24` (tarjetas) · `28` (el bloque de color de Inicio) ·
`9999` (píldoras).

Cobalto (`T-029`) redondea más que la dirección anterior (`8` y luego `12`): el estudio pidió una
interfaz «no tan cuadrada». La regla es una sola escala y en todas partes: un control de 16 dentro
de una tarjeta de 24.

### Elevation

Casi nada. Se prefiere borde de `1px`, que sobrevive a una pantalla barata al sol donde una sombra
suave desaparece. Sombra solo en la barra fija de total, para separarla de lo que scrollea debajo.

## Responsive Behavior

Se diseña en 360 px y se ensancha. Un solo código, nunca dos interfaces (`FR-010`, `D-007`).

- **< 640 px (celular, el caso que manda):** una columna. **Barra de secciones fija abajo**
  (Inicio, Vender, Ventas, Productos) y, en Vender, Escanear y «Cobrar $ N» juntos encima — abajo
  porque ahí llega el pulgar, no arriba (`T-029`). Vender no sugiere productos: la pantalla es la
  venta que se arma escaneando o buscando (`T-033`, `.diseno/codigos/Vender`).
- **640–1024 px (tablet):** la misma columna, más ancha. La barra de cobrar sigue fija.
- **> 1024 px (computador):** Vender es una columna centrada con la venta y, pegada al pie, la
  barra de cobrar. La navegación pasa a un menú lateral, con el dueño y Ajustes al pie.

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
- El tema claro es el que abre por defecto, y no por gusto: la presbicia, el astigmatismo y la
  miopía empeoran con texto claro sobre fondo oscuro —el halo alrededor de las letras—, y en un
  local con luz de día la pupila dilatada cuesta más de enfocar. El oscuro existe y está a un toque
  porque con catarata algunas personas leen mejor así, y la variación individual es grande: elegir
  por el dueño sería peor que darle el interruptor (`T-007`, `T-023`).
