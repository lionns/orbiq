## Trace

- 2026-09-06 — role: Implementer
  - read: `T-003`, `data-model.md` § product/category/stock_movement, `requirements.json` FR-001,
    `design-handoff.md` § Responsive Behavior, § Interaction States
  - did: baseline verde antes de tocar código
  - checks: `npm test` 11/11 · `typecheck` clean · `lint` clean · `harness-lint` clean
  - assumptions: el precio se teclea en la unidad corriente y se guarda en la mínima; falta nombrar
    la moneda del primer cliente (`data-model.md` § Open Questions)
  - blockers: ninguno

- 2026-09-06 — role: Implementer
  - read: `design-handoff.md` § Responsive Behavior/Interaction States, `data-model.md` § product
  - did: reglas puras del producto y del precio aparte de las consultas, para que `npm test` siga
    corriendo sin base; alta en una sola transacción que escribe el movimiento `initial` y recalcula
    el saldo desde el libro; listado con búsqueda por nombre o código, estado vacío que ofrece dar
    de alta el primero, y la acción abajo al alcance del pulgar
  - files: `src/domain/moneda.ts`, `src/domain/producto*.ts`, `src/domain/catalogo.ts`,
    `src/app/(protegido)/catalogo/**`, `src/app/(protegido)/page.tsx`, `e2e/catalogo.spec.ts`,
    `docs/project/data-model.md`
  - checks: `npm test` 23/23 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 18/18
    contra Neon · `db:verify` 5/5 · base devuelta a cero productos, movimientos y categorías
  - assumptions: la moneda sigue sin nombre, así que `moneda.ts` no elige ninguna — cero decimales,
    sin símbolo, sin factor de conversión
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano
