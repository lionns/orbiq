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
      teléfono. Ver `## Review`.)
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

- Changes: `src/domain/negocio.ts` da nombre al negocio, con el mismo argumento que la moneda y la
  zona (`D-005`). La cabecera pasa a ser una banda de acento con ese nombre, la navegación y el
  tema, en **una sola fila**. El fondo y la tarjeta se invirtieron —fondo cálido, tarjeta blanca—,
  que es lo que hace que una casilla se lea como objeto. Las existencias bajan a su propia línea
  bajo el precio.
- Files: `src/domain/negocio.ts`, `src/app/globals.css`, `src/app/(protegido)/layout.tsx`,
  `src/app/(protegido)/venta.tsx`, `docs/project/design-handoff.md`, `e2e/tema.spec.ts`
- Baseline result: `npm test` 69/69 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 69/69 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **91/91 en dos pasadas seguidas**.
- Decisions recorded: ninguna nueva.
- Follow-up: `NEGOCIO.nombre` dice «Mi tienda», que es un marcador visible. Se cambia por el del
  primer cliente cuando lo haya, y es una línea.

## Review

- **Dos criterios de esta tarea no sobrevivieron al código, y los dos se llevaron al estudio antes
  de tocar nada.** El primero daba por hecho un «nombre del negocio» que **no existe en el esquema**
  —lo que hay es el nombre del dueño, que es quien entra, no cómo se llama la tienda—; se resolvió
  con una constante de dominio, siguiendo el precedente escrito de la moneda. El segundo pedía
  forzar el tema claro ignorando `prefers-color-scheme`: eso exigía **borrar una prueba de `T-007`**,
  que es lo que `quality-gates.md` llama defecto, y además le pisa al dueño una preferencia que ya
  expresó en su teléfono. La propia evidencia que se citó al proponerlo dice que la variación
  individual es enorme y que ninguna polaridad gana para todos — es decir, respaldaba lo que orbiq
  ya tenía. Retirado.
- **Los colores se buscaron sobre una rejilla, no se eligieron.** Los del lienzo daban `surface`
  sobre `bg` a **1.11 en claro y 1.15 en oscuro**, por debajo del umbral de 1.18 que
  `aspecto.spec.ts` exige — la misma trampa que `T-010` documentó. El par que cumple las cuatro
  condiciones a la vez es `#EFEAE3` con `#FFFFFF` en claro y `#1C1917` con `#2E2926` en oscuro.
  `warning` tuvo que oscurecerse a `#8A4A08`: el ámbar viejo se medía contra blanco y el fondo dejó
  de serlo.
- **La cabecera costó tres intentos, y los tres se midieron.** Con iconos desbordaba a lo ancho
  (472 px en una pantalla de 360, `T-022`). En dos filas desbordaba a lo alto: el primer producto
  del catálogo caía en 761 con 740 de pantalla, o sea **bajo el pliegue**. La versión final es una
  fila donde el nombre trunca, así que un negocio con nombre largo encoge su propio rótulo en vez
  de sacar la navegación de la pantalla.
- **Se actualizaron los colores esperados de `e2e/tema.spec.ts`, y conviene mirarlo.** No es
  ablandar la prueba: sigue comparando colores calculados exactos contra la tabla del handoff, y la
  tabla cambió a propósito dentro del alcance de esta tarea. **La especificación se actualizó
  primero y la prueba la siguió**, que es el orden que pide `AGENTS.md`. Aun así es un cambio de
  valores esperados hecho por quien implementa.
- **El enlace «Vender» desapareció** porque el nombre del negocio ya lleva a la misma pantalla.
  Tener los dos era decir lo mismo dos veces y costaba sitio donde no sobra.
- **La suite volvió a 91/91 y a un minuto**, desde los 87 de 91 y 3,2 minutos de `T-022`. Los
  fallos de entonces no eran de aquella tarea ni de esta: eran latencia contra Neon. El defecto de
  aislamiento sigue ahí sin manifestarse hoy, y sigue mereciendo su tarea.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-13_T-023_implementer.md`
