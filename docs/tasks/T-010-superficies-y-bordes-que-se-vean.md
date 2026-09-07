---
id: T-010
title: Superficies y bordes que de verdad se distingan
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que un botón secundario y una tarjeta se distingan del fondo de la página en los dos temas, y que la suite detecte por sí sola el día que dejen de distinguirse.
decisions: [D-007]
implements: [FR-010, AC-X01, AC-X02]
---

## Sources

- `docs/project/design-handoff.md` § Design Tokens
- `docs/tasks/T-008-tailwind-sin-css-a-mano.md` § Review
- Reporte del estudio, 2026-09-07: «hay botones que no tienen bordes o fondo diferente al del
  cuerpo completo de la página»

## Scope

- Subir `surface` para que se distinga del fondo, y `border-strong` en consecuencia — los dos están
  acoplados y mover uno solo rompe el otro.
- Dar relleno a los controles secundarios y a las tarjetas, que hoy se apoyan solo en un borde.
- Una prueba que recorra **todas** las pantallas en **los dos temas** y compruebe que cada control
  se distingue de su fondo. Es la que faltaba.

## Out of Scope

- Volver atrás en `T-008`. Se midió: el refactor no cambió ningún color. El problema es anterior y
  el tema oscuro solo lo hizo visible.
- Tocar `accent`, `danger`, `warning`, `text` o `text-muted`. Sus once pares siguen medidos y bien.

## Acceptance Criteria

- [x] `surface` contra `bg` es de al menos 1.18:1 en los dos temas — visible como panel, no como
      mancha.
- [x] `border-strong` cumple 3:1 tanto sobre `bg` como **sobre `surface`**, en los dos temas. Es la
      condición que se rompía al subir solo `surface`.
- [x] Ningún botón ni tarjeta queda con fondo transparente sobre el fondo de la página.
- [x] Una prueba recorre las cuatro pantallas en los dos temas y falla si un control deja de
      distinguirse de su fondo.
- [x] Las casillas de la cuadrícula de venta miden todas lo mismo, y cada botón llena su celda.
- [x] Los once pares ya medidos en `T-007` siguen cumpliendo.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando, con la prueba nueva incluida.
- Task-specific: volver a calcular todos los pares de los dos temas y dejar los números en
  `design-handoff.md`.

## Assumptions

- Ninguna. Los valores salieron de una búsqueda sobre una rejilla de candidatos con las tres
  condiciones a la vez, no de elegir un color que se viera bien.

## Risks

- Cambiar dos tokens toca todas las pantallas. La red es la suite, y esta tarea añade justo la
  prueba que faltaba para que esa red cubra el aspecto y no solo el comportamiento.

## Outcome

- Changes: `surface` sube a `#E9E7E4` en claro y `#332F2B` en oscuro; `border-strong` a `#7C756F` y
  `#8E8781`, que es lo que hace falta para que aguante sobre la superficie nueva. Botones
  secundarios, campos, tarjetas del catálogo y casillas de la cuadrícula pasan a llevar relleno.
  Se añade `e2e/aspecto.spec.ts`, el contrato visual.
- Files: `src/app/globals.css`, `src/ui/boton.tsx`, `src/ui/campo.tsx`,
  `src/app/(protegido)/venta.tsx`, `src/app/(protegido)/catalogo/page.tsx`, `e2e/aspecto.spec.ts`,
  `e2e/tema.spec.ts`, `docs/project/design-handoff.md`
- Baseline result: la auditoría de las cuatro pantallas en los dos temas midió correcto todo lo que
  `T-008` tocó — ningún color se había movido.
- Final result: `npm test` 48/48 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **47/47**. Los 24 pares de los dos temas medidos, sin fallos, y las casillas de la cuadrícula
  todas de 158×122 a 360 px.
- Decisions recorded: ninguna nueva. `design-handoff.md` § Design Tokens recoge la regla que faltaba:
  un control se distingue por relleno, no solo por borde.
- Follow-up: ninguno abierto.

## Review

- **Lo primero fue descartar la hipótesis fácil.** El reporte llegó justo después de `T-008`, así
  que parecía una regresión del refactor. Se auditaron las cuatro pantallas en los dos temas,
  midiendo borde, fondo y radio de cada control, y todo daba correcto: `T-008` no movió ni un color.
  Haberlo revertido habría deshecho una mejora sin arreglar nada.
- La causa era anterior y el tema oscuro solo la hizo evidente: `surface` a 1.09:1 y 1.15:1 del
  fondo, y varios controles sin relleno ninguno. Un contorno de 1 px sobre el mismo fondo no se lee
  como botón.
- `surface` y `border-strong` están acoplados. Subir solo `surface` habría dejado el borde en
  2.96:1 sobre la superficie — por debajo del mínimo. Los valores salieron de una búsqueda sobre
  rejilla con las tres condiciones simultáneas, no de elegir un color a ojo.
- **La prueba nueva se comprobó al revés antes de darla por buena:** con los valores viejos falla y
  señala exactamente las tarjetas del catálogo con «relleno 1.09:1, borde 1.49:1». Una prueba que
  no se ha visto fallar no prueba nada.
- Lección propia, sin adornos: en `T-008` afirmé que el refactor no cambiaba nada apoyándome en seis
  propiedades de tres elementos de **una** pantalla. La afirmación era más ancha que la evidencia.
  Lo que faltaba no era más cuidado, era esta prueba.
- **Segundo reporte del estudio, mismo día: la cuadrícula de venta no era simétrica.** Eran dos
  defectos distintos que se veían como uno. Dentro de una fila, el `<li>` se estira al alto de la
  fila y el `<button>` no lo seguía, así que junto a un nombre de dos líneas el vecino quedaba 24 px
  más corto. Y entre filas, una fila cuyos nombres cabían en una línea encogía entera y la
  cuadrícula quedaba dentada. Se arregla con `auto-rows-fr` en la lista y `h-full` en el botón.
  El contrato visual crece con una prueba que compara el tamaño de todas las casillas; comprobada al
  revés, señala las cuatro casillas cortas por su nombre.

## Validation

- Validated by: 
- Date: 
- Pendiente de tu firma, junto con `T-004`…`T-008`.

## Trace

- `docs/traces/2026-09-07_T-010_implementer.md`
