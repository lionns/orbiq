## Trace

- 2026-09-07 — role: Implementer
  - read: reporte del estudio; auditó las cuatro pantallas en los dos temas midiendo borde, fondo y
    radio de cada control
  - did: descartó que `T-008` hubiera cambiado un color —todo medía correcto— y encontró la causa
    real: `surface` está a 1.09:1 del fondo en claro y 1.15:1 en oscuro, y varios controles no
    tienen relleno ninguno
  - checks: auditoría de 4 pantallas × 2 temas; búsqueda en rejilla de `surface` × `border-strong`
  - blockers: ninguno

- 2026-09-07 — role: Implementer
  - did: subió `surface` y `border-strong` a la vez —están acoplados—, dio relleno a botones
    secundarios, campos, tarjetas y casillas, y añadió el contrato visual `e2e/aspecto.spec.ts`,
    comprobando primero que falla con los valores viejos
  - files: `globals.css`, `src/ui/boton.tsx`, `src/ui/campo.tsx`, `venta.tsx`, `catalogo/page.tsx`,
    `e2e/aspecto.spec.ts`, `e2e/tema.spec.ts`, `design-handoff.md`
  - checks: `npm test` 48/48 · `lint` clean · `build` ok · `test:e2e` 46/46 · 24 pares medidos en
    los dos temas sin fallos
  - blockers: ninguno

- 2026-09-07 — role: Implementer
  - did: segundo reporte, la cuadrícula sin simetría. Medida antes de tocar: el botón no llenaba su
    celda y las filas no medían igual. `auto-rows-fr` + `h-full`, y una prueba de tamaño que se
    comprobó al revés
  - checks: `test:e2e` 47/47 · casillas todas de 158×122 a 360 px
  - blockers: ninguno
