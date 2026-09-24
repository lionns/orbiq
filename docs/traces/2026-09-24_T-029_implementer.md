## Trace

- 2026-09-24 — role: Implementer · bloque 1, base visual
  - read: `T-029`, `.diseno/cobalto/README.md`, guía de fuentes de Next 16, `src/ui/`, specs de tema
  - did: tokens Cobalto, Geist, variantes de botón, campo de 52 px, plegable con glifo, nombres de
    existencias; handoff, manifest e íconos al día
  - files: `globals.css`, `layout.tsx`, `manifest.ts`, `generar-iconos.mjs`, `src/ui/*`, handoff
  - checks: `npm test` 71/71, typecheck y lint limpios, `tema.spec` e `instalable.spec` en verde
  - assumptions: ninguna
  - blockers: ninguno
- 2026-09-24 — role: Implementer · bloque 2, navegación
  - did: Inicio en `/` con `resumenDelDia`, la venta en `/vender`, `/ajustes` con Tema y Salir,
    barra de pestañas (celular) y menú lateral (computador), venta en curso guardada en el
    dispositivo para la insignia; e2e al día con Salir en Ajustes y la venta en `/vender`
  - files: `(protegido)/{layout,page,navegacion,venta-guardada}.tsx`, `vender/`, `ajustes/`,
    `src/ui/marca.tsx`, `e2e/{apoyo,sesion,tema,historial,venta,catalogo,tipografia,iconos}`
  - checks: typecheck y lint limpios; `test:e2e` 92/96, y los 4 fallos (nombres nuevos, ruta de la
    venta) corregidos: `tema`, `venta` y `catalogo` 38/38
  - blockers: ninguno
