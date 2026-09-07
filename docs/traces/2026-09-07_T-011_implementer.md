## Trace

- 2026-09-07 — role: Implementer
  - read: `T-011`, `data-model.md` § stock_movement, `D-002`; el estudio reportó que el libro
    existía y no había forma de verlo
  - did: baseline verde antes de tocar código
  - checks: `npm test` 48/48 · `typecheck` clean · `lint` clean · `test:e2e` 47/47
  - assumptions: historial completo sin paginar, del más reciente al más antiguo
  - blockers: ninguno

- 2026-09-07 — role: Implementer
  - did: historial completo por producto con el aviso de discrepancia entre copia y libro, y ajuste
    con motivo obligatorio que escribe la diferencia **contra el libro**, no contra la copia
  - files: `src/domain/movimientos.ts`, `catalogo/[id]/*`, `catalogo/page.tsx`, `venta.tsx`,
    `e2e/historial.spec.ts`, `e2e/aspecto.spec.ts`
  - checks: `npm test` 48/48 · `lint` clean · `build` ok · `test:e2e` 53/53 · `db:verify` 5/5
  - assumptions: historial sin paginar
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano
