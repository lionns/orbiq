## Trace

- 2026-09-13 — role: Implementer
  - read: `T-018`, `e2e/venta.spec.ts`, `src/domain/venta.ts` § `cuadricula`, `T-014` § Outcome
  - did: la prueba del saldo negativo entra en la cuadrícula vendiendo, no confiando en que un
    producto sin ventas quepa en las 24 casillas; comprobación de presencia antes del clic
  - files: `e2e/venta.spec.ts`
  - checks: baseline verde (`npm test` 65/65, typecheck, lint, build); `test:e2e` corrido dos veces
  - assumptions: ninguna
  - blockers: ninguno
