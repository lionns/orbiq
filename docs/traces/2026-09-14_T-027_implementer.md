## Trace

- 2026-09-14 — role: Implementer
  - read: pregunta del estudio, `venta.tsx:240-247`, `T-025` § Outcome, `AC-X01`
  - did: medido el defecto antes de tocar nada, con veinte productos en el carrito
  - files: —
  - checks: baseline en verde — `npm test` 69/69, harness-lint, typecheck, lint y build limpios
  - assumptions: ninguna
  - blockers: ninguno
  - verificado, no deducido: la tarjeta mide 1447 px en las tres pantallas probadas; el total cae en
    y=1344 sobre 900 de ventana, y ni el total ni el botón quedan visibles en 1280×900, 1440×800 ni
    1366×768
  - did: tope de alto para la columna de computador; la lista se desplaza por dentro y el total se
    queda abajo; comentario corregido
  - files: `src/app/(protegido)/venta.tsx`, `e2e/venta.spec.ts`
  - checks: `npm test` 69/69, typecheck, lint, build y harness-lint limpios, `test:e2e` 94/94
  - verificado, no deducido: la tarjeta pasa de 1447 px a no exceder la ventana; el total y el
    botón quedan dentro en 1280×900 y 1366×768; la prueba nueva cae sobre el código anterior
