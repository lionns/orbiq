---
id: T-013
title: La ficha del producto informa antes de dejar editar
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que tocar un producto en el catálogo lleve a verlo, no a un formulario. Las acciones que lo cambian existen, pero detrás de una intención explícita y separadas de la consulta.
decisions: [D-007]
implements: [FR-010, AC-X01, AC-X02]
---

## Sources

- `docs/project/design-handoff.md` § Interaction States, § Responsive Behavior
- Reporte del estudio, 2026-09-07: «no es entendible que al hacer click se edita un producto»

## Scope

- La ficha abre mostrando lo que se fue a ver: nombre, precio, existencias y el historial.
- Corregir el conteo, editar los datos y retirar el producto pasan a estar plegados, cada uno con su
  nombre, en el mismo patrón de `<details>` que ya usan los filtros y el tema.
- La tarjeta del catálogo dice que abre algo, en vez de parecer una fila de lista.
- Retirar de la venta se separa de editar: no es corregir un dato, es sacar algo de circulación.

## Out of Scope

- Rediseñar el catálogo o la cuadrícula de venta. El reporte es sobre la ficha.
- Quitar funciones. Todo lo de `T-012` sigue existiendo; cambia dónde y cuándo aparece.
- Confirmación al retirar. Es reversible y queda registrado; un diálogo aquí sería ruido.

## Acceptance Criteria

- [x] CUANDO se abre la ficha de un producto EL SISTEMA DEBE mostrar primero sus datos y su
      historial, sin ningún formulario desplegado.
- [x] CUANDO se despliega una acción EL SISTEMA DEBE mostrar solo esa, con su nombre visible.
- [x] La tarjeta del catálogo indica que lleva a alguna parte, y su área tocable llega a 48 px.
- [x] Retirar de la venta no comparte formulario con editar los datos.
- [x] Todo sigue funcionando sin JavaScript: los `<details>` son del navegador.
- [x] Las pruebas de `T-011` y `T-012` siguen pasando, adaptadas al recorrido nuevo — que ahora
      incluye abrir la sección, que es lo que hace una persona.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando en verde.
- Task-specific: medir a 360 px que el historial empieza por encima del pliegue al abrir la ficha —
  es la prueba de que la pantalla informa antes de pedir nada.

## Assumptions

- **Asunción** — la acción más frecuente en la ficha es mirar, no cambiar. Si resulta que el dueño
  entra sobre todo a corregir el conteo, esa sección se despliega por defecto y las otras no.

## Risks

- Plegar cosas las esconde. La defensa es que cada sección lleva su nombre visible y el patrón ya se
  usa en dos pantallas, así que no es una convención nueva.

## Outcome

- Changes: la ficha abre con los datos y el historial, y las tres acciones —corregir el conteo,
  editar, retirar— pasan a `SeccionPlegable`, cada una con su nombre a la vista. La tarjeta del
  catálogo gana la marca de que lleva a alguna parte.
- Files: `src/ui/seccion-plegable.tsx`, `src/app/(protegido)/catalogo/[id]/page.tsx`,
  `src/app/(protegido)/catalogo/page.tsx`, `e2e/historial.spec.ts`
- Baseline result: `npm test` 49/49 · `typecheck` clean · `lint` clean · `test:e2e` 58/58.
- Final result: `npm test` 49/49 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **61/61**. A 360 px el historial empieza en 293 px —por encima del pliegue—, las acciones en 629,
  y no hay ningún formulario desplegado al aterrizar.
- Decisions recorded: ninguna nueva.
- Follow-up: si resulta que el dueño entra sobre todo a corregir el conteo, esa sección se despliega
  por defecto y las otras no. Es un cambio de una línea, pero necesita verlo usándolo.

## Review

- El defecto era de orden, no de funciones. Tocabas un producto esperando **verlo** y aterrizabas en
  dos formularios abiertos antes de cualquier dato. Ahora la ficha informa primero y lo que cambia
  el producto está detrás de una intención.
- Retirar se separó de editar. No es corregir un dato: es sacar algo de circulación, y compartir
  formulario con el nombre y el precio invitaba a hacerlo sin querer.
- Una excepción deliberada: cuando el conteo no cuadra, «Corregir el conteo» viene abierto. Si la
  pantalla avisa de un problema, esconder su remedio detrás de un toque más es hacerse el
  interesante. Hay una prueba que fija esa excepción y otra que fija la regla.
- La tarjeta del catálogo no decía que abriera nada: parecía una fila de lista. Ahora lleva la marca
  y hay una prueba de que está y de que el blanco llega a 48 px.
- Lo que se fija en las pruebas nuevas no es cómo se ve, sino **qué se ofrece primero**. Un criterio
  de aspecto que se pueda ejecutar vale más que uno que se acuerda.

## Validation

- Validated by: 
- Date: 
- Pendiente de tu firma, junto con `T-004`…`T-008` y `T-010`…`T-012`.

## Trace

- `docs/traces/2026-09-07_T-013_implementer.md`
