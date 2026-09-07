## Trace

- 2026-09-07 — role: Implementer
  - read: `T-012`, `data-model.md` § product/Data Lifecycle, decisiones del estudio del 2026-09-07
  - did: baseline verde antes de tocar código
  - checks: `npm test` 48/48 · `typecheck` clean · `lint` clean · `test:e2e` 53/53
  - assumptions: un producto desactivado no se vende; si hace falta, se reactiva primero
  - blockers: ninguno

- 2026-09-07 — role: Implementer
  - did: `product_event` con tres tipos y su restricción en la base; edición, retirada y reactivación;
    el historial pasa a ser una línea de tiempo única; el catálogo puede incluir los retirados
  - files: `schema.ts`, `drizzle/0003_*`, `catalogo.ts`, `producto.ts`, `filtros.ts`,
    `movimientos.ts`, `catalogo/[id]/*`, `catalogo/{page,filtros}.tsx`, `e2e/*`, `data-model.md`
  - checks: `npm test` 49/49 · `lint` clean · `build` ok · `test:e2e` 58/58 · `db:verify` 5/5 ·
    migración aplicada sobre los datos del demo sin pérdida
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano
