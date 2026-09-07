## Trace

- 2026-09-06 — role: Implementer
  - read: `T-004`, `data-model.md` § sale/sale_line/stock_movement, `requirements.json` FR-004/005,
    `design-handoff.md` § Responsive Behavior/Interaction States/Motion, `D-005`
  - did: baseline verde antes de tocar código; cerradas con el estudio las dos preguntas de
    producto que la tarea traía como supuestos — stock negativo permitido, y la cuadrícula es el
    catálogo mientras no haya historial
  - checks: `npm test` 24/24 · `typecheck` clean · `lint` clean · `harness-lint` clean
  - assumptions: la ventana de «reciente» y el número de casillas se fijan en código
  - blockers: ninguno

- 2026-09-06 — role: Implementer
  - read: `design-handoff.md` § Responsive Behavior/Interaction States, `data-model.md` § sale
  - did: aritmética de la venta en curso pura y aparte; `registrarVenta` transaccional e idempotente
    con el saldo recalculado desde el libro y el precio leído del catálogo en el servidor;
    cuadrícula ordenada por lo más vendido reciente; pantalla de venta como portada, con el total
    siempre a la vista y las acciones fuera del tercio superior; catálogo de demostración
  - files: `src/domain/carrito*.ts`, `src/domain/venta.ts`, `src/app/(protegido)/**`,
    `e2e/venta.spec.ts`, `e2e/apoyo.ts`, `scripts/sembrar-demo.mts`, `docs/project/data-model.md`
  - checks: `npm test` 30/30 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 25/25
    contra Neon en tres corridas seguidas · `db:verify` 5/5
  - assumptions: ventana de 30 días y 24 casillas, fijadas en código
  - blockers: ninguno. `NFR-002` queda sin medir: necesita un celular y un cronómetro
