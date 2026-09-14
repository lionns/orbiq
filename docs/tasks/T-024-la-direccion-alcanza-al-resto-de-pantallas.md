---
id: T-024
title: La dirección alcanza al resto de las pantallas
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que la ficha del producto y el historial de ventas se vean diseñados y no heredados. Heredaron la paleta y los componentes de T-023 sin romperse, pero se nota que nadie las miró: el precio no manda donde se va a comprobar un precio, y quedan subrayados del look que el estudio ya rechazó.
decisions: [D-007]
implements: [FR-010, NFR-003, US-010, AC-X01]
---

## Sources

- Capturas de las cinco pantallas a 360 px en los dos temas, revisadas con el estudio el 2026-09-14
- `docs/project/design-handoff.md` § Design Tokens, § Typography
- `docs/tasks/T-023-la-venta-con-identidad-y-jerarquia.md` § Risks — el riesgo que se aceptó
  al empezar, y que ahora se paga

## Scope

Cuatro hallazgos concretos, todos vistos en pantalla y no deducidos:

- **La ficha: el precio no manda.** «$ 4.300» y «28 en existencia» pesan lo mismo. La jerarquía de
  `T-021` —precio dominante— no llegó a la pantalla donde se va a comprobar un precio.
- **La ficha: «Volver al catálogo» va subrayado**, que es el look que el estudio rechazó en el
  menú de tema. Hay un icono de flecha en el set desde `T-022` y no se usa.
- **La ficha: los desplegables de Acciones** muestran el triangulito nativo del navegador,
  alineado a la derecha. Desentona con todo lo demás.
- **El historial: el encabezado del día parte en dos renglones** a 360 px —«lunes, 14 de septiembre
  de / 2026»— y el total queda colgando, desalineado del nombre del día.

Y lo que aparezca al recorrer **catálogo** y **alta de producto**, que tampoco se han mirado.

## Out of Scope

- Cambiar qué hacen esas pantallas. Ni un comportamiento nuevo: lo que se toca es cómo se ven.
- La cuadrícula de venta y su barra. Es `T-023` y quedó firmada.
- Tokens nuevos. Si algo no se puede expresar con la paleta que ya hay, es señal de que el problema
  es otro y merece su propia conversación.

## Acceptance Criteria

- [x] CUANDO el dueño abre la ficha de un producto EL SISTEMA DEBE mostrar el precio más grande que
      las existencias, con la misma jerarquía que la cuadrícula.
- [x] Ningún enlace de navegación de la aplicación se distingue **solo** por subrayado: llevan
      icono, píldora o peso, como los de la venta.
- [x] CUANDO una sección plegable está cerrada EL SISTEMA DEBE indicarlo con un glifo propio y no
      con el marcador nativo del navegador.
- [x] A 360 px el encabezado de cada día del historial cabe en una línea con su total alineado.
- [x] Las cinco pantallas se recorren en los dos temas sin que ningún control deje de distinguirse
      de su fondo (`aspecto.spec.ts`), y sin texto por debajo de 14 px (`tipografia.spec.ts`).

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: **capturar las cinco pantallas en los dos temas y mirarlas, antes de decir que
  está lista.** En `T-023` el estudio devolvió el trabajo tres veces con la suite en verde; la
  captura deja de ser un extra y pasa a ser el control.

## Assumptions

- Ninguna.

## Risks

- Tocar `SeccionPlegable` y los enlaces alcanza a pantallas que no están en el título de esta
  tarea. Es deliberado —son componentes compartidos— pero significa que la prueba de aspecto y la
  de tipografía son obligatorias aquí, no opcionales.
- Acortar la fecha del encabezado cambia lo que el dueño lee al cerrar la caja. Se acorta el
  formato, nunca el dato: el día tiene que seguir siendo inconfundible.

## Outcome

- Changes: en la ficha el precio pasa a 24 y manda, como en la cuadrícula. Los tres enlaces de
  volver llevan flecha en vez de subrayado. `SeccionPlegable` y «Filtros» cambian el carácter «▾»
  del navegador por el glifo del set, que gira al abrir. El encabezado del día usa `dateStyle:
  "long"`: el día de la semana delante lo partía en dos renglones a 360 px.
- Files: `src/ui/seccion-plegable.tsx`, `src/app/(protegido)/catalogo/{filtros.tsx,[id]/page.tsx,nuevo/page.tsx}`,
  `src/app/(protegido)/ventas/{page.tsx,[id]/page.tsx}`, `src/app/(protegido)/venta.tsx`
- Baseline result: `npm test` 69/69 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: el mismo comando en verde · `test:e2e` **92/92 en dos pasadas**.
- Decisions recorded: ninguna nueva.
- Follow-up: ninguno propio.

## Review

- **Los cuatro hallazgos venían de mirar capturas, no de razonar**, y esta vez la captura se hizo
  **antes** de dar nada por terminado — que es lo que `T-023` costó aprender a base de tres
  devoluciones del estudio.
- **Un subrayado se queda, a propósito.** «Darlo de alta» vive dentro de una frase, y ahí el
  subrayado es la convención correcta para marcar un enlace en prosa. Los otros cuatro eran
  navegación o desplegables disfrazados de enlace.
- **«Filtros» no era un enlace y lo parecía.** Es un desplegable, así que recibe el mismo trato que
  `SeccionPlegable`: glifo que gira, sin subrayado. La incoherencia venía de que cada uno se
  escribió por su lado.
- **La fecha se acortó, el dato no.** `full` daba «lunes, 14 de septiembre de 2026» y partía el
  encabezado dejando el total colgando; `long` da «14 de septiembre de 2026» en una línea. El día
  sigue siendo inconfundible, que es lo que se mira al cerrar la caja.
- Tocar `SeccionPlegable` alcanza a pantallas fuera del título de la tarea. Era el riesgo escrito, y
  por eso `aspecto.spec.ts` y `tipografia.spec.ts` eran obligatorias aquí: las dos pasan.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-14_T-024_implementer.md`
