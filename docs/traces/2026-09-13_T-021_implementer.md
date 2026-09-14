## Trace

- 2026-09-13 — role: Implementer
  - read: `T-021`, `design-handoff.md` § Typography, `src/ui/cifras.tsx`, la cuadrícula de
    `venta.tsx`, el lienzo de `.diseno/`
  - did: escala nueva y jerarquía de la casilla en la especificación primero; precio a 24 y nombre
    a 18 en la cuadrícula; `Cantidad` en `cifras.tsx` recoge los tres `tabular-nums` sueltos;
    `e2e/tipografia.spec.ts` fija el suelo y la jerarquía
  - files: `docs/project/design-handoff.md`, `src/ui/cifras.tsx`,
    `src/app/(protegido)/{venta.tsx,catalogo/[id]/page.tsx}`, `e2e/tipografia.spec.ts`
  - checks: baseline verde; final `npm test` 69/69, typecheck, lint, build, harness-lint limpios,
    `test:e2e` 89/89 en dos pasadas
  - assumptions: 14 px como suelo sale del lienzo y de la guía de contraste, no de usuarios reales
  - blockers: ninguno
  - verificado, no deducido: las dos pruebas nuevas se rompieron a propósito una por una — con el
    nombre a 12 px caen ambas; con el precio a 16 cae solo la de jerarquía, que es lo que demuestra
    que mide el precio y no otro elemento
  - hallazgo ajeno: `escaneo-camara.spec.ts:42` falló una vez y pasó aislada y en dos pasadas más.
    Cuarto intermitente de la familia de `T-018`. Merece tarea propia.
