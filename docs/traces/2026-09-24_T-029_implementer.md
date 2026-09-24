## Trace

- 2026-09-24 — role: Implementer · bloque 1, base visual: tokens Cobalto, Geist, botón, campo,
  plegable, nombres de existencias, handoff · test 71/71, `tema` e `instalable` en verde.
- 2026-09-24 — role: Implementer · bloque 2, navegación: Inicio en `/`, `/vender`, `/ajustes`,
  pestañas y menú lateral, venta guardada · e2e 92/96, los 4 fallos corregidos (38/38).
- 2026-09-24 — role: Implementer · bloque 3, Vender
  - did: venta recogida sobre la barra y hoja al abrirla; Escanear y «Cobrar $ N» abajo; cantidad
    escrita; Vaciar y Deshacer (cobro y vaciado) sin diálogo; F2 y foco en la búsqueda en
    computador; el campo se vacía tras leer un código. Botón «suave» con borde de acento: sin él
    quedaba a 1.03:1 del fondo (`aspecto.spec`). Cinco pruebas nuevas
  - files: `(protegido)/venta.tsx`, `src/ui/{objetivo-de-escaneo,boton}.tsx`,
    `e2e/{venta,escaneo,escaneo-camara,iconos}.spec.ts`
  - checks: typecheck, lint, `npm test` 71/71; `test:e2e` 100/100 (2 capturas locales saltadas)
  - review: la prueba de orden de la cuadrícula perdía su sitio en los 24 más vendidos frente a las
    vecinas en paralelo; ahora vende 90/60, como resolvió `T-018`. Las de geometría de `T-025`–`T-027`
    abren la venta antes de medir: recogida, el total va dentro de Cobrar
  - blockers: ninguno
