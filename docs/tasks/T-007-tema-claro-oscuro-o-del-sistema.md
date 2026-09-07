---
id: T-007
title: Tema claro, oscuro o el del sistema
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño elige entre tema claro, oscuro o el del sistema, la elección se recuerda, y la pantalla nunca aparece con el tema equivocado ni por un instante. Ambas paletas cumplen contraste medido, no estimado.
decisions: [D-007]
implements: [FR-010, AC-X01, AC-X02]
---

## Sources

- `docs/project/design-handoff.md` § Design Tokens, § Interaction States
- `docs/decisions/D-007-interface-web-responsive-en-pestana.md`
- `src/ui/README.md`

## Scope

- Paleta oscura completa, con el contraste de cada par real **medido** y anotado.
- Tres opciones: claro, oscuro y el del sistema. «El del sistema» es la de fábrica.
- La elección se recuerda entre visitas y entre dispositivos del mismo navegador.
- El selector funciona sin JavaScript, como el resto de la aplicación.
- `color-scheme` acompaña al tema, para que los controles nativos y la barra de desplazamiento no
  se queden en claro dentro de una pantalla oscura.

## Out of Scope

- Temas por negocio o colores de marca configurables.
- Animar la transición entre temas. `design-handoff.md` § Motion no la pide y encarece cada cambio.
- Un tema de alto contraste aparte: las dos paletas ya cumplen AA en todos los pares reales.

## Acceptance Criteria

- [x] CUANDO el dueño elige un tema EL SISTEMA DEBE aplicarlo y recordarlo en la siguiente visita.
- [x] CUANDO el tema es «el del sistema» EL SISTEMA DEBE seguir la preferencia del dispositivo y
      cambiar con ella sin que el dueño toque nada.
- [x] CUANDO se carga cualquier pantalla EL SISTEMA DEBE pintarla ya con el tema correcto: nunca un
      destello del tema contrario.
- [x] Todos los pares de color que la aplicación usa de verdad cumplen 4,5:1 para texto y 3:1 para
      bordes de control, en los dos temas, **medidos y anotados** (`AC-X02`).
- [x] El texto del botón principal se lee sobre el acento en los dos temas — no es el mismo color en
      los dos.
- [x] El selector se opera a 360 px sin desbordar ni empujar nada fuera de la pantalla (`AC-X01`).
- [x] Una prueba de recorrido comprueba los tres modos y que la elección sobrevive a una recarga.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando, en verde, con las pruebas nuevas del tema.
- Task-specific: recalcular el contraste de los dos temas y dejar los números en
  `design-handoff.md`. Un color que no se mide es un color que se supone.

## Assumptions

- **Asunción** — la preferencia se guarda en una cookie y no en el navegador, para que el servidor
  ya sepa el tema al pintar la primera vez. Es lo que evita el destello sin un script bloqueante.

## Risks

- El destello del tema equivocado es el modo de fallar clásico aquí, y no lo detecta ninguna prueba
  que solo mire el resultado final. Se evita por construcción —el servidor decide— y se comprueba
  mirando el HTML que llega, no la pantalla ya pintada.
- Guardar el tema en una cookie hace dinámica la plantilla raíz. Todas las pantallas ya lo eran.

## Outcome

- Changes: paleta oscura completa con contraste medido; el tema se decide en el servidor leyendo una
  cookie, así que la primera pintura ya sale bien; selector de tres opciones en la cabecera y en la
  pantalla de acceso; `color-scheme` acompaña al tema.
- Files: `src/domain/tema.ts`, `src/domain/tema.test.ts`, `src/app/acciones-tema.ts`,
  `src/ui/selector-tema.tsx`, `src/app/layout.tsx`, `src/app/globals.css`,
  `src/app/(protegido)/layout.tsx`, `src/app/acceso/page.tsx`, `e2e/tema.spec.ts`,
  `docs/project/design-handoff.md`
- Baseline result: `npm test` 42/42 · `typecheck` clean · `lint` clean · `test:e2e` 35/35.
- Final result: `npm test` **48/48** · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **42/42** en tres corridas seguidas.
- Decisions recorded: ninguna nueva; un tema no es una puerta. `design-handoff.md` § Design Tokens
  recoge la paleta oscura con los once pares medidos.
- Follow-up: ninguno abierto.

## Review

- **El destello del tema equivocado se evita por construcción, no por remiendo.** El servidor lee la
  cookie y pinta el `<html>` ya con el atributo puesto; la alternativa habitual —un script en el
  `<head>` que bloquea la pintura— cuesta latencia en un celular con datos lentos, que es el caso
  que manda. La prueba mira el HTML que llega por el cable, no la pantalla ya pintada: en la
  pantalla el destello ya no se ve.
- **Hallazgo al medir, no al mirar: en oscuro el texto del botón de acento no puede ser blanco.**
  Blanco sobre `#14B8A6` da 2.49:1. Es el par que más fácilmente se hereda mal del tema claro, y de
  los once pares medidos era el único que fallaba. Ahora `accent-text` cambia entre temas y hay una
  prueba que fija los dos.
- Tres estados y no dos. `:root:not([data-theme="light"])` dentro de la consulta de medio es lo que
  hace que pedir claro con el dispositivo en oscuro se respete; sin ese `:not` se ignoraría, y es un
  fallo que solo aparece en el dispositivo de otra persona. Hay una prueba que emula justo ese caso.
- Se comprobó que el selector funciona **con JavaScript apagado** en vez de afirmarlo, que es lo
  que veníamos diciendo de todos los formularios de la aplicación.
- Hallazgo propio, corregido después de cerrar la tarea: `SelectorDeTema` importaba la acción de
  servidor desde `src/app/`, invirtiendo las capas — la presentación atada a una ruta concreta.
  Ahora la acción llega por parámetro, y `eslint.config.mjs` impide que vuelva a pasar, igual que
  con `src/domain/`. Salió al preguntarnos si estos componentes se podrían mirar en un Storybook:
  era el único de los siete que no.
- Detalle conocido: tras elegir, el desplegable se queda abierto. React no controla el `open` de un
  `<details>`, así que el nodo sobrevive al repintado. Se deja: muestra cuál quedó activo, que es
  buena señal, y cerrarlo exigiría JavaScript para algo que no lo necesita.

## Validation

- Validated by: 
- Date: 
- Pendiente de tu firma, junto con `T-004`, `T-005` y `T-006`.

## Trace

- `docs/traces/2026-09-07_T-007_implementer.md`
