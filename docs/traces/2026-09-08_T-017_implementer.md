## Trace

- 2026-09-08 — role: Implementer
  - read: `T-017`, `FR-015`, `AC-023`, `src/domain/venta.ts`, `src/app/(protegido)/venta.tsx`
  - did: `resolverEntradaDeVenta` en el dominio; el campo del objetivo acepta nombre o código en la
    venta; los resultados sustituyen a la cuadrícula; prueba de recorrido con la medida de `NFR-002`
  - files: `src/domain/venta.ts`, `src/app/(protegido)/{acciones.ts,venta.tsx}`,
    `src/ui/objetivo-de-escaneo.tsx`, `e2e/busqueda-en-venta.spec.ts`, `e2e/escaneo.spec.ts`
  - checks: baseline verde; final `npm test` 65/65, typecheck, lint, build, harness-lint limpios,
    `test:e2e` 84 pasan y 2 fallan
  - assumptions: buscar por trozo del nombre alcanza para un catálogo de tienda de barrio
  - blockers: los 2 fallos son un defecto de zona horaria ajeno a esta tarea — `ventasPorDia` agrupa
    con `to_char` en la zona de la base (GMT) y filtra parseando en la del servidor. Verificado
    preexistente corriendo esas mismas pruebas sobre `HEAD`. Necesita tarea propia.
