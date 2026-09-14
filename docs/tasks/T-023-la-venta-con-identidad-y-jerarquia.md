---
id: T-023
title: La venta con identidad y jerarquía
status: done
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
      teléfono. Ver la revisión de abajo.)
- [x] Toda superficie de control se distingue de su fondo en los dos temas, medido y no estimado.
- [x] Las pruebas de `T-004`, `T-016` y `T-017` pasan sin tocarlas: escanear, buscar por nombre,
      tocar la cuadrícula, corregir cantidad y confirmar no cambian.
- [x] A 360 px ninguna acción del flujo de venta vive en el tercio superior, y el total sigue
      visible todo el tiempo (`AC-X01`).

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: recorrer con un celular real las cinco pantallas en los dos temas —venta, catálogo,
  ficha, historial de ventas y acceso— y comprobar que ninguna quedó rota por heredar los
  componentes nuevos. Es un cambio visual: «no cambia nada» hay que demostrarlo mirando, y
  `aspecto.spec.ts` solo cubre cuatro.

## Assumptions

- **Asunción** — que el claro venga por defecto es lo correcto para un dueño mayor. Sale de
  literatura sobre polaridad de contraste y edad, no de un dueño real usándola. Si el primer cliente
  trabaja de noche y pide lo contrario, se cambia el valor por defecto: es una línea.

## Risks

- **Catálogo, ficha e historial no están diseñados.** Heredan tipografía, color y componentes, y
  pueden quedar a medio camino: con cabecera nueva en la venta y sin ella en el resto. Se avisó
  antes de empezar y se decidió avanzar así. Si al recorrerlas se ven incoherentes, la salida es una
  tarea que lleve la dirección al resto, no ensancharla aquí.
- Es el cambio más visible que ha tenido el producto. No hay usuarios todavía, que es justo lo que
  lo hace barato: el argumento de la memoria muscular protege a quien ya usa algo, y orbiq no tiene
  a nadie.

## Outcome

- Changes: `negocio.ts` da nombre al negocio (`D-005`). La cabecera es una banda de acento con
  marca, nombre, navegación y el tema como píldora. El fondo y la tarjeta se invirtieron —fondo
  cálido, tarjeta blanca— con cada ratio medido. La casilla lleva precio dominante y existencias en
  píldora, en su propia línea. La barra del total se acotó al mismo hueco que la cuadrícula reserva.
- Files: `src/domain/negocio.ts`, `src/app/globals.css`, `src/app/(protegido)/{layout.tsx,venta.tsx}`,
  `src/ui/{boton.tsx,cifras.tsx,iconos.tsx,selector-tema.tsx}`, `docs/project/design-handoff.md`,
  `e2e/{tema.spec.ts,venta.spec.ts}`
- Baseline result: `npm test` 69/69 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 69/69 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **92/92**.
- Decisions recorded: ninguna nueva.
- Follow-up: `NEGOCIO.nombre` dice «Mi tienda», un marcador visible hasta que haya cliente. Lo que
  falta de dirección en catálogo, ficha e historial va a `T-024`.

## Review

- **Dos criterios no sobrevivieron al código; los dos se llevaron al estudio antes de implementar.**
  Uno daba por hecho un «nombre del negocio» inexistente en el esquema —lo que hay es el del dueño—;
  se resolvió con una constante, como la moneda. El otro pedía forzar el claro ignorando
  `prefers-color-scheme`: exigía borrar una prueba de `T-007` y pisa una preferencia que el dueño ya
  expresó. La evidencia citada al proponerlo respaldaba lo que orbiq ya tenía. Retirado.
- **Los colores se buscaron sobre una rejilla, no se eligieron.** Los del lienzo daban `surface`
  sobre `bg` a 1.11 y 1.15, bajo el umbral de 1.18 de `aspecto.spec.ts` — la trampa de `T-010`.
- **La cabecera costó tres intentos, medidos:** con iconos desbordaba a lo ancho (472 px en 360);
  en dos filas, a lo alto (el primer producto del catálogo caía en 761 con 740 de pantalla).
- **Lo que solo se vio mirando, y el estudio tuvo que pedirlo tres veces:** «Salir» salía blanco
  sobre blanco, las existencias inflaban la casilla, el nombre se truncaba, faltaba media
  composición del lienzo, el tema seguía siendo un enlace subrayado, y la barra del total tapaba el
  final de la cuadrícula con el carrito lleno. **91/91 estaba en verde con el botón invisible.** En
  un cambio visual el verde no es evidencia.
- **Un intento descartado:** meter «Salir» en el menú rompía dos helpers y tres pruebas de
  `sesion.spec.ts` por siete píxeles. Cuando un cambio cosmético pide reescribir pruebas de
  comportamiento, el cambio es el que falla.
- **Se actualizaron los colores esperados de `e2e/tema.spec.ts`** — no ablandándola: sigue
  comparando colores exactos, y la especificación se actualizó primero.
- La suite quedó en 92/92. El defecto de aislamiento va por la séptima manifestación y sigue sin
  tarea.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-14
- Firmada tras recorrerla en pantalla. El estudio devolvió la tarea dos veces —faltaba la
  composición del lienzo, y el control del tema seguía siendo un enlace subrayado— y una tercera
  con un defecto de uso: la barra del total tapaba el final de la cuadrícula.
- Catálogo, ficha e historial heredaron sin romperse, que era el riesgo aceptado. Lo que les falta
  de dirección va a `T-024`, no aquí.

## Trace

- `docs/traces/2026-09-13_T-023_implementer.md`
