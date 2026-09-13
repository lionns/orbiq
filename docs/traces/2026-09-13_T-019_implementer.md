## Trace

- 2026-09-13 — role: Implementer
  - read: `T-019`, `src/domain/venta.ts` § `ventasPorDia`, `architecture.md` § Moneda,
    `data-model.md` § `sale`, `T-017` § Outcome
  - did: `zona.ts` con la zona del negocio y `diaDelNegocio`; `ventasPorDia` agrupa y acota en esa
    zona; las tres pantallas que escriben fecha u hora la fijan; prueba de unidad con instantes
    fijos y prueba de recorrido con la venta de las 21:30 y la medianoche exacta
  - files: `src/domain/{zona.ts,zona.test.ts,venta.ts}`, `src/app/(protegido)/ventas/page.tsx`,
    `src/app/(protegido)/ventas/[id]/page.tsx`, `src/app/(protegido)/catalogo/[id]/page.tsx`,
    `e2e/ventas.spec.ts`, `docs/project/architecture.md`
  - checks: `npm test` 69/69, typecheck, lint, build, harness-lint limpios; `test:e2e` 87/87, y
    87/87 otra vez con `TZ=Asia/Tokyo` y con `TZ=UTC`
  - assumptions: el negocio opera en `America/Bogota`, la misma zona que ya asumen la moneda y el
    `locale` de todas las pantallas
  - blockers: ninguno
  - verificado, no deducido: (1) los parámetros sin tipo rompían `timezone(...)` — se probó contra
    la base antes de dar por buena la expresión; (2) el índice `sale_created_at_idx` sigue entrando
    como `Index Cond` y no como filtro posterior, con `enable_seqscan = off` para forzar el plan;
    (3) la prueba nueva falla al devolver `to_char` a su forma anterior, así que es red y no adorno
  - abierto: `aspecto.spec.ts` § tema oscuro falló una vez en la primera pasada completa y no se
    reprodujo en ocho pasadas posteriores —cuatro con el cambio, tres sobre `HEAD` sin él, una por
    zona—. No toca ninguna pantalla de esta tarea. Queda anotado como hallazgo sin tarea.
