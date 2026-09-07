## Trace

- 2026-09-06 — role: Implementer · ronda 1, comprimida
  - did: andamiaje completo, esquema de nueve tablas, migración `0000` generada. Los cinco comandos
    de `quality-gates.md` en verde. Driver de Neon por WebSocket y no HTTP: el HTTP no soporta
    transacciones interactivas y `AC-008` exige que la venta sea una sola
  - blockers: faltaba `DATABASE_URL`; la migración no se había aplicado contra una base real

- 2026-09-06 — role: Implementer
  - read: `T-001`, `data-model.md` § Entities, `.env`, esquema aplicado en Neon
  - did: normalizó `.env` — venían intercambiados el string agrupado y el directo respecto de cómo
    los usa el código; aplicó `0000` sobre una base vacía; comparó el esquema resultante campo por
    campo contra `data-model.md`; añadió cinco índices y los aplicó como `0001`; reemplazó la prueba
    de humo por una que escribe en Neon y espera verlo de vuelta en la pantalla
  - files: `.env.example`, `drizzle.config.ts`, `src/db/schema.ts`, `src/app/page.tsx`,
    `e2e/andamiaje.spec.ts`, `scripts/verificar-esquema.mts`, `package.json`,
    `drizzle/0001_low_jamie_braddock.sql`, `docs/project/data-model.md`
  - checks: `npm test` 7/7 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 2/2 contra
    Neon · `db:verify` 5/5 (AC-004, AC-005, AC-013, NFR-005, venta sin venta)
  - assumptions: la aplicación va por el string agrupado y las migraciones por el directo — el
    agrupador corre en modo transacción y no sostiene la sesión que drizzle-kit necesita
  - blockers: ninguno técnico. La tarea queda `review` a la espera de la firma del validador
    humano; no me corresponde firmarla yo
