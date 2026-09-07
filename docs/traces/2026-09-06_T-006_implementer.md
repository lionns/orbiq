## Trace

- 2026-09-06 — role: Implementer
  - read: `design-handoff.md` § Design Tokens/Interaction States, `D-003`, `src/domain/README.md`
  - did: contó la repetición con `grep` antes de decidir qué extraer — botón de acento en 5
    archivos, borde de control en 6, barra fija abajo en 3, precio en 4
  - checks: `npm test` 42/42 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 34/34
  - assumptions: ninguna
  - blockers: ninguno

- 2026-09-06 — role: Implementer
  - did: extrajo `src/ui/` y reemplazó las copias en las cinco pantallas; midió alturas y desbordes
    a 360 px antes y después en vez de fiarse de que la suite pasara
  - files: `src/ui/*`, las cinco pantallas, `e2e/venta.spec.ts`, `e2e/catalogo.spec.ts`
  - checks: `npm test` 42/42 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 35/35 en
    tres corridas · alturas 56/48 px y cero desbordes a 360 px, medidos
  - assumptions: ninguna
  - blockers: ninguno. Aparece una decisión de producto: si el cero debe alertar en rojo en las dos
    pantallas o en ninguna. Hoy alerta solo en la de venta, como estaba
