---
id: T-036
title: «Volver» vuelve a donde se estaba, y menos consultas repetidas
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que «volver» lleve a la pantalla de donde se vino —la ficha, Inicio, Ventas con sus fechas— y que ninguna pantalla consulte la base dos veces por lo mismo.
decisions: [D-011]
implements: [FR-008, FR-012, NFR-001]
---

## Sources

- Reporte del estudio el 2026-09-27: de la ficha a una venta de su historial, «volver» dejaba en
  Ventas. Pedido de medir las consultas a la base en todo el proyecto.

## Scope

- `src/domain/volver.ts`: el origen viaja en `?desde=`, solo rutas propias, y el enlace dice adónde
  vuelve («Producto», «Inicio», «Ventas»). Detalle de venta, ficha, lista de Ventas e Inicio.
- La sesión se lee una vez por petición (`cache` de React) en el marco, Inicio y Ajustes.
- Vender deja de refrescar la pantalla tras cobrar y deshacer: no pinta nada del servidor.
- `D-011`: por qué Neon, y la caché de Hyperdrive apagada.

## Out of Scope

- Apagar la caché de Hyperdrive en producción: se hace en el despliegue, con confirmación.

## Acceptance Criteria

- [x] CUANDO se vuelve desde una venta abierta en la ficha, en Inicio o en Ventas con fechas EL
      SISTEMA DEBE llevar a esa pantalla (`e2e/navegacion.spec.ts`).
- [x] CUANDO `desde` apunta a otro sitio EL SISTEMA DEBE ignorarlo y volver a Ventas.
- [x] Inicio y Ajustes leen la sesión una vez; cobrar y deshacer no refrescan de más (medido).

## Verification

- Final: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs` y
  `test:e2e` completo, en el puerto 3100 contra Postgres local.
- Task-specific: medición de consultas por paso con `log_min_duration_statement = 0` en el
  Postgres local, antes y después.

## Assumptions

- None

## Risks

- None

## Outcome

- Changes: «volver» por origen en detalle de venta, ficha, Ventas e Inicio; sesión cacheada por
  petición; sin `router.refresh()` en Vender; `D-011`.
- Files: `src/domain/{volver,volver.test}.ts`, `src/app/(protegido)/{sesion.ts,layout.tsx,page.tsx,venta.tsx}`,
  `src/app/(protegido)/{ajustes,ventas,ventas/[id],catalogo/[id]}/*`, `e2e/{navegacion,venta,ventas}.spec.ts`,
  `docs/decisions/D-011-data-postgres-en-neon.md`
- Baseline result: navegación 1/6 (5 caminos rotos); consumo 172 consultas en 22 pasos.
- Final result: `npm test` 103/103 · `typecheck`, `lint`, `harness-lint` limpios · `test:e2e`
  123/123 · consultas: Inicio 7→5, Ajustes 4→2, cobrar 14→12, deshacer 13→11.
- Decisions recorded: `D-011`.
- Follow-up: apagar la caché de Hyperdrive de `tienda-miriam` al desplegar.

## Review

- Alta · Hyperdrive de `tienda-miriam` · caché activa por defecto: lecturas de hasta 75 s atrás en
  producción (existencias, ventas, sesión). No se ve en local, que no pasa por Hyperdrive.
- Baja · la ficha carga las categorías aunque no se abra «Editar»; se deja, es una consulta.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-27
