## Trace

- 2026-09-07 — role: Implementer
  - read: `T-014`, `data-model.md` § sale/sale_line, `D-002`
  - did: baseline verde antes de tocar código
  - checks: `npm test` 49/49 · `typecheck` clean · `lint` clean · `test:e2e` 61/61
  - assumptions: el día se agrupa por la zona horaria del servidor
  - blockers: ninguno

- 2026-09-07 — role: Implementer
  - did: `/ventas` por día con total y rango en la dirección, `/ventas/[id]` con las líneas al precio
    cobrado y la anulación plegada; corregido un defecto latente desde `T-004` — Drizzle no cualifica
    columnas en una plantilla `sql` dentro de un `select`, así que la cuadrícula nunca ordenó por lo
    más vendido. Se imprimió el SQL de los cuatro sitios con ese patrón para saber cuáles fallaban
  - files: `src/domain/venta.ts`, `app/(protegido)/ventas/**`, `catalogo/[id]/page.tsx`,
    `layout.tsx`, `src/ui/cifras.tsx`, `e2e/{ventas,venta,historial}.spec.ts`
  - checks: `npm test` 49/49 · `lint` clean · `build` ok · `test:e2e` 70/70 en tres corridas ·
    `db:verify` 5/5
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano
