---
id: T-024
title: La dirección alcanza al resto de las pantallas
status: ready
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

- [ ] CUANDO el dueño abre la ficha de un producto EL SISTEMA DEBE mostrar el precio más grande que
      las existencias, con la misma jerarquía que la cuadrícula.
- [ ] Ningún enlace de navegación de la aplicación se distingue **solo** por subrayado: llevan
      icono, píldora o peso, como los de la venta.
- [ ] CUANDO una sección plegable está cerrada EL SISTEMA DEBE indicarlo con un glifo propio y no
      con el marcador nativo del navegador.
- [ ] A 360 px el encabezado de cada día del historial cabe en una línea con su total alineado.
- [ ] Las cinco pantallas se recorren en los dos temas sin que ningún control deje de distinguirse
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

- **Implementada, enseñada y rechazada por el estudio el 2026-09-14. Revertida entera.** El código
  vuelve a lo que había al firmar `T-023`; la tarea vuelve a `ready` con sus criterios sin marcar.
- Lo que se llegó a construir, por si se retoma: precio dominante en la ficha, flecha en los tres
  enlaces de volver, glifo propio y giratorio en `SeccionPlegable` y «Filtros», y encabezado del día
  en `long` para que quepa en una línea. Está en el commit `b494d08` y se puede recuperar entero.
- Final result antes de revertir: `npm test` 69/69 · `test:e2e` 92/92 en dos pasadas · typecheck,
  lint, build y harness-lint limpios. **El verde no era el problema.**
- Decisions recorded: ninguna.
- Follow-up: los cuatro hallazgos del § Scope siguen siendo ciertos —los vimos los dos en las
  capturas—, pero la forma de resolverlos no se acordó con el estudio antes de escribirla. Retomarla
  exige enseñar el aspecto **antes** de implementarlo, no después.

## Review

- **El fallo no fue de ejecución, fue de método.** Los criterios se cumplieron y las pruebas
  pasaron; lo que no se hizo fue acordar **cómo iban a verse** los cambios antes de hacerlos. En
  `T-023` había un lienzo validado que servía de contrato; aquí no había ninguno, y la tarea se
  escribió describiendo problemas en vez de soluciones. «Que lleven icono, píldora o peso» es una
  restricción, no un diseño.
- **La lección de `T-023` se aplicó a medias.** Se capturó y se miró antes de entregar —eso sí
  mejoró— pero mirar sirve para encontrar defectos, no para acordar una dirección. Lo segundo pasa
  por enseñar antes de construir.
- Revertir costó una orden porque todo el cambio vivía en un commit y en `src/`. Que fuera barato
  deshacerlo es lo único que salió bien de esta tarea, y no fue casualidad.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-14_T-024_implementer.md`
