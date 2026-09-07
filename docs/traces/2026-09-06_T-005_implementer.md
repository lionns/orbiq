## Trace

- 2026-09-06 — role: Implementer
  - read: `T-005`, `data-model.md` § product/Indexes, `design-handoff.md` § Responsive Behavior
  - did: registró `FR-011`, `US-012` y `AC-016`…`AC-018`, que el brief no traía — los pidió el
    estudio hoy; baseline verde antes de tocar código
  - checks: `npm test` 30/30 · `typecheck` clean · `lint` clean · `harness-lint` clean
  - assumptions: el tamaño de la tanda se fija en código
  - blockers: ninguno

- 2026-09-06 — role: Implementer
  - read: `design-handoff.md` § Responsive Behavior, estilo de fábrica de `fieldset`
  - did: filtros por categoría, existencias y precio, combinables; «Ver más» como enlace que suma y
    conserva los filtros; todo el estado en la dirección; índices sobre `name` y `category_id`
  - files: `src/domain/filtros*.ts`, `src/domain/catalogo.ts`, `src/db/schema.ts`,
    `drizzle/0002_spotty_hercules.sql`, `src/app/(protegido)/catalogo/**`, `e2e/catalogo.spec.ts`,
    `docs/project/{requirements,user-stories,acceptance-criteria}.json`
  - checks: `npm test` 42/42 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 34/34 en
    tres corridas seguidas · `db:verify` 5/5 · migración aplicada sobre datos reales sin pérdida
  - assumptions: la tanda de 24 se fija en código
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano
