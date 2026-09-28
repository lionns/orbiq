## Trace

- 2026-09-27 — role: Implementer
  - read: `venta.ts`, `movimientos.ts`, `catalogo.ts`, Better Auth `rate-limiter`, `next.config.ts`
  - did: pruebas de seguridad, rendimiento (`orbiq_perf`), integridad y runtime de Workers; bloqueos
    de fila, anulación atómica, Ventas por días, cabeceras, límite de intentos en la base
  - checks: `npm test` 103/103, `test:e2e` 130/130 (Node), harness limpio
  - assumptions: ninguna
  - blockers: ninguno
