---
id: T-021
title: Escala tipográfica para vista cansada
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: Que una persona de setenta años lea la pantalla sin acercársela a la cara. El dueño de una tienda de barrio no tiene veinticinco años, y hoy el nombre del producto, su precio y sus existencias pesan casi lo mismo y se leen al mismo tamaño.
decisions: [D-007]
implements: [FR-010, NFR-003, US-010, AC-X01]
---

## Sources

- `docs/project/design-handoff.md` § Typography — la escala actual y el motivo de cada decisión
- `docs/project/brief.md` § Users — de pie, una mano, un celular cualquiera
- Lienzo de diseño validado por el estudio el 2026-09-13, artboards «Claro» y «Oscuro»

## Scope

- **Actualizar `design-handoff.md` primero.** La escala pasa de `12 · 14 · 16 · 20 · 28 · 40` a
  `14 · 16 · 17 · 20 · 24 · 32 · 40`, y el mínimo absoluto sube de 12 a 14. La especificación es la
  autoridad; el código la sigue, no al revés.
- Los tokens de tamaño en `@theme`, y las utilidades donde hoy hay tamaños implícitos.
- **La jerarquía la hace el tamaño, no el color:** en una casilla de la cuadrícula el precio manda
  (24 px), el nombre le sigue (17 px) y las existencias son la nota (14 px).
- Recoger `tabular-nums` en `cifras.tsx`. Hoy está suelto en tres sitios fuera de su componente, que
  es exactamente como se pierde una regla.

## Out of Scope

- Cargar una fuente web. Sigue en pie el argumento de bytes de `design-handoff.md` § Typography, y
  el lienzo demostró que la jerarquía sale del tamaño y el peso sin gastar 40-100 kB.
- Cambiar color, cabecera, iconos o disposición. Eso es `T-020` y `T-023`; aquí solo cambian los
  tamaños.
- Tamaños específicos por pantalla. Si una pantalla necesita una excepción, es una tarea con su
  motivo escrito, no una decisión tomada de paso.

## Acceptance Criteria

- [ ] Ningún texto de la aplicación se renderiza por debajo de 14 px, en ninguna pantalla ni tema.
- [ ] CUANDO se abre la cuadrícula de venta EL SISTEMA DEBE mostrar el precio más grande que el
      nombre del producto, y el nombre más grande que las existencias.
- [ ] Toda cifra que se muestra al dueño pasa por `cifras.tsx`: `tabular-nums` no aparece suelto en
      ningún otro archivo.
- [ ] A 360 px las seis casillas de la cuadrícula siguen cabiendo sin desplazar, y el total sigue
      visible (`AC-X01`).
- [ ] Los campos de entrada siguen en 16 px o más, para que iOS no haga zoom al enfocar.
- [ ] `design-handoff.md` § Typography describe la escala nueva, y ninguna pantalla usa un tamaño
      que la tabla no liste.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: una prueba que recorra las pantallas a 360 px y falle si algún texto visible mide
  menos de 14 px. Es la única forma de que el mínimo siga siendo verdad dentro de seis meses; leerlo
  en el handoff no lo garantiza.

## Assumptions

- **Asunción** — 14 px es el suelo razonable para texto secundario en un celular a distancia de
  brazo. No sale de una medición con usuarios reales: sale del lienzo y de la guía de contraste de
  la WCAG. Si un dueño de verdad sigue acercándose el teléfono, hay que volver a subirlo.

## Risks

- Subir la escala descoloca composiciones que hoy encajan justo. La cuadrícula se comprobó en el
  lienzo —seis casillas de 142 px siguen cabiendo—, pero catálogo, ficha e historial **no están
  maquetados** y pueden romper. Es el motivo de que la prueba de aspecto sea obligatoria aquí.
- El texto más grande trunca nombres largos donde antes cabían. Truncar es un defecto, no un efecto
  secundario: si aparece, se arregla en esta tarea.

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

- `docs/traces/<fecha>_T-021_implementer.md`
