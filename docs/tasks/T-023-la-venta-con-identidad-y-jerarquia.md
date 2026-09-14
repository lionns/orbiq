---
id: T-023
title: La venta con identidad y jerarquía
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que la pantalla de venta deje de leerse como un formulario sin estilar. Hoy no hay cabecera ni marca, `surface` está a 1.23:1 del fondo —así que las casillas parecen texto entre hilos— y el precio no destaca sobre el nombre.
decisions: [D-007, D-009]
implements: [FR-010, NFR-003, US-010, AC-X01]
---

## Sources

- Lienzo de diseño validado por el estudio el 2026-09-13, artboards «Claro» y «Oscuro»
- `docs/project/design-handoff.md` § Design Tokens, § Responsive Behavior, § Interaction States
- `src/app/(protegido)/venta.tsx` y `src/ui/` — lo que hay hoy

## Scope

- **Cabecera con el nombre del negocio** y el selector de tema a la vista, no escondido. Hoy la
  aplicación no dice en ninguna parte de quién es.
- **La casilla de la cuadrícula:** relleno que se distingue de verdad del fondo, precio dominante,
  nombre debajo, y las existencias **en su propia línea** — compartiendo fila con el precio,
  «Quedan 3» se parte y el número cae debajo de la palabra.
- **El claro es el tema por defecto.** Por evidencia y no por gusto: presbicia, astigmatismo y
  miopía empeoran con texto claro sobre fondo oscuro, y en un local con luz de día la pupila
  dilatada cuesta más de enfocar. El oscuro existe igual, a un toque, porque con catarata algunas
  personas leen mejor así y la variación individual es grande.
- Los valores nuevos entran en `design-handoff.md` § Design Tokens con su ratio medido, como los de
  hoy. Ninguno se escribe sin medirlo.

## Out of Scope

- **Mover la cuadrícula de frecuentes o la barra de total de su sitio.** Sigue siendo lo de `T-004`:
  la acción abajo, donde llega el pulgar. Cambia el aspecto, no la posición.
- Catálogo, ficha e historial. **No están maquetados** y heredarán lo que caiga de `src/ui/`. Si al
  verlos hace falta dirección propia, es otra tarea — ver Risks.
- Cambiar qué hace la pantalla. Ni un comportamiento nuevo: escanear, tocar, corregir cantidad y
  confirmar funcionan exactamente igual al terminar.

## Acceptance Criteria

- [x] CUANDO el dueño abre la venta EL SISTEMA DEBE mostrar el nombre del negocio y un acceso
      visible al selector de tema.
- [x] CUANDO una casilla muestra existencias bajas EL SISTEMA DEBE escribirlas en una sola línea,
      sin que la palabra y el número queden en renglones distintos, a 360 px.
- [x] CUANDO no se ha elegido tema EL SISTEMA DEBE seguir al dispositivo, y el dueño puede elegir
      claro u oscuro desde la cabecera. (**Criterio retirado y sustituido el 2026-09-13, decidido
      por el estudio.** El original pedía forzar el claro ignorando `prefers-color-scheme`; eso
      exigía borrar una prueba de `T-007` y le pisa al dueño una preferencia que ya expresó en su
      teléfono. Ver `## Review

- **Dos criterios no sobrevivieron al código y los dos se llevaron al estudio antes de implementar.**
  Uno daba por hecho un «nombre del negocio» que no existe en el esquema —lo que hay es el del
  dueño, que es quien entra, no cómo se llama la tienda—; se resolvió con una constante de dominio,
  siguiendo el precedente de la moneda. El otro pedía forzar el claro ignorando
  `prefers-color-scheme`: exigía **borrar una prueba de `T-007`** y le pisa al dueño una preferencia
  que ya expresó. La evidencia que se citó al proponerlo dice que ninguna polaridad gana para todos,
  o sea que respaldaba lo que orbiq ya tenía. Retirado.
- **Los colores se buscaron sobre una rejilla, no se eligieron.** Los del lienzo daban `surface`
  sobre `bg` a 1.11 y 1.15, bajo el umbral de 1.18 de `aspecto.spec.ts` — la trampa de `T-010`.
  `warning` se oscureció a `#8A4A08`: se medía contra blanco y el fondo dejó de serlo.
- **La cabecera costó tres intentos y los tres se midieron.** Con iconos desbordaba a lo ancho
  (472 px en 360, `T-022`). En dos filas, a lo alto: el primer producto del catálogo caía en 761
  con 740 de pantalla, bajo el pliegue. Queda en una fila.
- **Se miró en pantalla y estaba mal.** Capturar las pantallas reales destapó tres defectos que la
  suite no veía: «Salir» **blanco sobre blanco** —la variante secundaria heredaba el color de la
  banda en vez de fijar el suyo—, «117 en existencia» inflando la casilla, y el nombre truncado a
  «Mi ti…». Corregidos. **91/91 estaba en verde con el botón invisible**: un cambio visual se
  valida mirando.
- **Un intento descartado:** meter «Salir» en el menú para ganar sitio rompía dos helpers y tres
  pruebas de `sesion.spec.ts` por siete píxeles. Se revirtió y los píxeles salieron de los huecos.
  Cuando un cambio cosmético pide reescribir pruebas de comportamiento, el cambio es el que falla.
- **Se actualizaron los colores esperados de `e2e/tema.spec.ts`.** No es ablandarla —sigue
  comparando colores exactos— sino que la tabla del handoff cambió a propósito, y **la
  especificación se actualizó primero**. Aun así son valores esperados cambiados por quien
  implementa.
- **El estudio avisó de que faltaba diseño, y era cierto.** Se habían aplicado los tokens y la
  jerarquía, pero no la composición del lienzo: faltaban la píldora de existencias, el encabezado
  «Más vendidos · Catálogo ›», la marca de la cabecera, la sombra de la barra y el radio de 12.
  Todo eso estaba aprobado y no se había llevado al código. Ya está.
- **La navegación salió de la banda porque el lienzo nunca la tuvo ahí.** Con marca, nombre,
  Catálogo, Ventas, Tema y Salir en una fila de 360 px el nombre se truncaba a «Mi…». El catálogo
  se alcanza desde la cuadrícula —donde tiene sentido buscar lo que no está entre los frecuentes— y
  tenerlo además arriba era decirlo dos veces.
- **Defecto reportado por el estudio y corregido aquí:** con el carrito lleno no se podía llegar al
  final de la cuadrícula. La cuadrícula reservaba un hueco **fijo** para la barra del total, pero la
  barra crece con el carrito — con ocho artículos medía 379 px contra 304 reservados, y esos 75 px
  tapaban las últimas casillas sin que se pudiera desplazar más. Ahora el hueco y el tope de la
  barra son el mismo número. Medido antes y después, y la prueba cae con el código viejo.
- **La prueba nueva destapó una fragilidad ajena y se arregló de paso:** sembrar ocho productos
  vendidos desplazó de la cuadrícula a «Galleta ancha», que otra prueba sembraba **sin ventas** y
  daba por visible. Es la familia de `T-018`; se le aplicó el mismo remedio. Sexta manifestación.
- **La suite volvió a 92/92 y a un minuto**, desde los 87 de 91 y 3,2 minutos de `T-022`. Aquellos
  fallos eran latencia contra Neon. El defecto de aislamiento sigue ahí sin manifestarse hoy.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-13_T-023_implementer.md`
