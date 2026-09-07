## Trace

- 2026-09-07 — role: Implementer
  - read: reporte del estudio sobre la ficha; `design-handoff.md` § Interaction States
  - did: baseline verde antes de tocar código
  - checks: `npm test` 49/49 · `typecheck` clean · `lint` clean · `test:e2e` 58/58
  - assumptions: en la ficha se mira más de lo que se cambia
  - blockers: ninguno

- 2026-09-07 — role: Implementer
  - did: la ficha pasa a informar primero; las tres acciones a `SeccionPlegable` con su nombre a la
    vista; la tarjeta del catálogo gana la marca de que abre algo
  - files: `src/ui/seccion-plegable.tsx`, `catalogo/[id]/page.tsx`, `catalogo/page.tsx`,
    `e2e/historial.spec.ts`
  - checks: `npm test` 49/49 · `lint` clean · `build` ok · `test:e2e` 61/61 · historial a 293 px y
    acciones a 629 px en una pantalla de 740, con cero formularios desplegados
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano
