## Trace

- 2026-09-14 — role: Implementer
  - read: reporte del estudio, `T-023` § Outcome, `venta.tsx`, `globals.css`
  - did: token `--alto-barra-venta` proporcional; la barra lo usa de tope y la cuadrícula reserva
    ese valor más 2 rem; la prueba de `T-023` pasa a exigir holgura y a medir en 560 px de alto
  - files: `src/app/globals.css`, `src/app/(protegido)/venta.tsx`, `e2e/venta.spec.ts`
  - checks: `npm test` 69/69, typecheck, lint, build, harness-lint limpios, `test:e2e` 92/92
  - assumptions: ninguna
  - blockers: ninguno
  - verificado, no deducido: holgura de 0 a 32 px a tres alturas; la prueba endurecida cae sobre el
    código anterior con `Received: 0`
  - limpieza: 61 productos y 2 dueños huérfanos que dejaron mis propias reproducciones, borrados
