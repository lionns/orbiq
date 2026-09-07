## Trace

- 2026-09-06 — role: Implementer
  - read: `T-001`, `architecture.md`, `data-model.md`, `quality-gates.md`, `design-handoff.md`
  - did: baseline verde antes de tocar código; andamiaje completo; esquema de nueve tablas y
    migración inicial generada
  - files: config raíz, `src/db/*`, `src/domain/*`, `src/lib/auth.ts`, `src/app/*`, `e2e/*`,
    `drizzle/0000_spooky_blur.sql`
  - checks: `npm test` 7/7 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 1/1
  - assumptions: driver de Neon por WebSocket, no HTTP: el HTTP no soporta transacciones
    interactivas y `AC-008` exige que la venta sea una sola transacción
  - blockers: falta `DATABASE_URL`. La migración no se ha aplicado contra una base real, así que
    la tarea sigue `doing` — no `done`
