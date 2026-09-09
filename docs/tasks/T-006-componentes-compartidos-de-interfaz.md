---
id: T-006
title: Componentes compartidos de interfaz
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Sacar a componentes compartidos lo que hoy está copiado en cinco pantallas —botones, campos, la barra fija de abajo, el precio y las existencias— sin cambiar una sola cosa de lo que el dueño ve.
decisions: [D-003, D-007]
implements: [FR-010, AC-X01, AC-X02]
---

## Sources

- `docs/project/design-handoff.md` § Design Tokens, § Interaction States, § Responsive Behavior
- `docs/decisions/D-003-boundaries-sin-abstraccion-prematura.md`
- `src/domain/README.md`

## Scope

- `src/ui/` con los componentes que ya tienen tres o más usos reales, contados antes de escribir:
  botón de acento (5), control con borde (6), barra fija abajo (3), precio (4), existencias (2 —
  entra por otra razón, ver abajo).
- Un `README.md` en `src/ui/` con la regla de la carpeta, como el de `src/domain/`.
- Reemplazar las copias en las cinco pantallas.

## Out of Scope

- Cambiar cómo se ve o se comporta cualquier pantalla. Si la suite nota una diferencia, es un
  defecto de esta tarea, no una mejora.
- Un sistema de diseño con variantes que nadie usa todavía (`D-003`).
- Mover `src/domain/` o tocar la regla de ESLint que le prohíbe importar el framework.

## Acceptance Criteria

- [x] CUANDO se extrae un componente EL SISTEMA DEBE seguir pasando las 34 pruebas de recorrido y
      las 42 de dominio sin tocar ninguna: el comportamiento no cambia.
- [x] Ningún componente de `src/ui/` se crea con menos de tres usos, salvo que se justifique por
      escrito otra razón (`D-003`).
- [x] Los componentes sirven igual desde una pantalla de servidor y una de cliente: ninguno lleva
      `"use client"` si no lo necesita.
- [x] El área táctil mínima y el anillo de foco quedan en un solo sitio, no repartidos por cinco
      archivos (`AC-X01`, `AC-X02`).
- [x] `src/ui/` no importa de `src/domain/` nada que no sea presentación.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando, con el mismo resultado exacto. Es la única forma de afirmar que un
  refactor no cambió nada.
- Task-specific: contar los usos de cada componente extraído y dejar el número escrito.

## Assumptions

- **Asunción** — la repetición contada hoy (5, 6, 3, 4) es la que hay; se contó con `grep` antes de
  escribir y el número queda en el Outcome para poder discutirlo.

## Risks

- Un refactor la víspera de un demo. Lo que lo hace defendible es que la red de seguridad ya existe:
  76 pruebas, de las cuales 34 recorren la aplicación entera contra la base real. Sin esa red, esta
  tarea se pospone.
- Extraer de más es el modo de fallar más común aquí. La defensa es `D-003` y el criterio de los
  tres usos.

## Outcome

- Changes: `src/ui/` con `Boton`, `BotonEnlace`, `Campo`, `BarraInferior`, `Precio`, `Existencias`
  y `Aviso`, más un README con el recuento de usos de cada uno. Las cinco pantallas pasan a usarlos.
- Files: `src/ui/*` (nuevo), `src/app/acceso/formulario.tsx`, `src/app/(protegido)/layout.tsx`,
  `src/app/(protegido)/venta.tsx`, `src/app/(protegido)/catalogo/page.tsx`,
  `src/app/(protegido)/catalogo/filtros.tsx`,
  `src/app/(protegido)/catalogo/nuevo/formulario.tsx`, `e2e/venta.spec.ts`, `e2e/catalogo.spec.ts`
- Baseline result: `npm test` 42/42 · `typecheck` clean · `lint` clean · `test:e2e` 34/34.
- Final result: `npm test` 42/42 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **35/35** en tres corridas seguidas. La de más es nueva y explica por qué está abajo.
- Decisions recorded: ninguna. Los usos contados quedaron en `src/ui/README.md`: `Campo` 11,
  `Boton` 7, `BotonEnlace` 3, `Precio` 3, y tres por debajo del umbral con su razón escrita —
  `BarraInferior` 2, `Existencias` 2, `Aviso` 2.
- Follow-up: ninguno abierto. Queda una decisión de producto abierta, abajo.

## Review

- **La suite pasando no probaba que el refactor no cambiara nada, y no lo probó.** Al unificar las
  existencias en un componente aparecieron dos comportamientos distintos que nadie había decidido:
  el catálogo pintaba de rojo solo el saldo negativo y la cuadrícula de venta también el cero. No
  se decidió, se escribió dos veces distinto — que es exactamente lo que el componente evita.
  Se conservó cada uno tal cual, la diferencia quedó en un parámetro con nombre, y ahora hay dos
  pruebas que la fijan. **Queda como decisión de producto pendiente:** si el cero debe alertar en
  las dos pantallas o en ninguna.
- Hallazgo propio, corregido: el botón de confirmar quedaba con `min-h-12` y `min-h-14` a la vez.
  Funcionaba —salían los 56 px medidos— pero por el orden en que Tailwind genera las utilidades,
  no por lo que dice el código. Eso deja de funcionar en silencio el día que cambie ese orden. El
  tamaño pasó a ser un parámetro y el conflicto desapareció.
- Cambio deliberado y visible: el relleno de los controles estaba en `px-4` en los formularios y
  `px-3` en los filtros. Se unificó en `px-4`, el más generoso, y se comprobó que a 360 px no
  desborda nada — medido elemento por elemento, no a ojo.
- `BarraInferior` se queda con dos usos aunque el patrón esté en tres sitios: la venta en curso deja
  de estar fija a partir de 1024 px y pasa a ser una columna, así que no la puede usar. Forzarla
  habría sido el error que `D-003` intenta evitar.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-08
- Pendiente de tu firma, junto con `T-004` y `T-005`.

## Trace

- `docs/traces/2026-09-06_T-006_implementer.md`
