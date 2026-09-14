---
id: T-023
title: La venta con identidad y jerarquía
status: ready
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

- [ ] CUANDO el dueño abre la venta EL SISTEMA DEBE mostrar el nombre del negocio y un acceso
      visible al selector de tema.
- [ ] CUANDO una casilla muestra existencias bajas EL SISTEMA DEBE escribirlas en una sola línea,
      sin que la palabra y el número queden en renglones distintos, a 360 px.
- [ ] CUANDO no se ha elegido tema EL SISTEMA DEBE abrir en claro, también con el dispositivo en
      oscuro.
- [ ] Toda superficie de control se distingue de su fondo en los dos temas, medido y no estimado.
- [ ] Las pruebas de `T-004`, `T-016` y `T-017` pasan sin tocarlas: escanear, buscar por nombre,
      tocar la cuadrícula, corregir cantidad y confirmar no cambian.
- [ ] A 360 px ninguna acción del flujo de venta vive en el tercio superior, y el total sigue
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

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/<fecha>_T-023_implementer.md`
