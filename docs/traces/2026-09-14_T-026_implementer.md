## Trace

- 2026-09-14 — role: Implementer
  - read: reporte del estudio con captura, `T-025` § Outcome, `venta.tsx`, `AC-X01`
  - did: reproducida la medida del desborde a cinco anchos antes de tocar nada
  - files: —
  - checks: baseline en verde — `npm test` 69/69, harness-lint, typecheck, lint y build limpios
  - assumptions: ninguna
  - blockers: ninguno
  - verificado, no deducido: el botón sale 29 px de la columna a 1024/1280/1440 y 20 px a 360; a
    412 px —el ancho del Pixel 7 con el que corre toda la suite— entra por 16, que es por qué las
    92 pruebas estaban en verde
  - did: la fila del total pasa a columna; `Confirmar` a todo el ancho de la barra
  - files: `src/app/(protegido)/venta.tsx`, `e2e/venta.spec.ts`
  - checks: `npm test` 69/69, typecheck, lint, build y harness-lint limpios, `test:e2e` 93/93
  - verificado, no deducido: desborde de +29/+20 px a -17/-16 px en los cinco anchos; `scrollWidth`
    a 1024 de 1053 a 1024; la prueba nueva cae sobre el código anterior; capturas de la barra en
    los dos temas a 360 y 1280 px
