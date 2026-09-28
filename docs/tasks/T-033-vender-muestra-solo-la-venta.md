---
id: T-033
title: Vender muestra solo la venta
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que la pantalla de venta deje de proponer productos. Se abre vacía y en ella se ve solo la venta que se arma escaneando o buscando, con su cantidad a mano y Cobrar abajo.
decisions: [D-009]
implements: [FR-017, FR-015, AC-023, AC-028]
---

## Sources

- `.diseno/codigos/Vender` y `.diseno/codigos/README.md` § Lo que se decidió, puntos 6 y 7
- `.diseno/cobalto/README.md` § Los catorce puntos (1, 4, 5, 8, 11, 13, 14 siguen en pie)

## Scope

- Quitar la cuadrícula de «Más vendidos» y la consulta que la llena (`cuadricula`, `CASILLAS`).
- La venta en curso pasa a ser el contenido de la pantalla en celular: la lista de líneas con − y +,
  la cantidad tocable, y abajo Escanear y Cobrar. Deja de recogerse en una línea.
- Vacía: «Escanea para empezar» y la ayuda para buscar lo que no trae código. Cobrar apagado.
- Buscar sigue arriba: los resultados sustituyen a la lista mientras se busca; elegir uno lo añade y
  vuelve a la venta.
- «Vaciar» arriba, en rojo, sin preguntar, con «Deshacer» diez segundos, como hoy.
- En computador, la misma regla: sin cuadrícula; la venta y su total en la columna.
- Reescribir las pruebas que añadían productos tocando la cuadrícula.

## Out of Scope

- Cambiar cómo se cobra, se deshace el cobro o se guarda la venta en el dispositivo.
- Inicio: «por reponer» y las últimas ventas se quedan como están.

## Acceptance Criteria

- [x] CUANDO se abre Vender sin venta en curso EL SISTEMA DEBE mostrarla vacía, sin productos
      sugeridos, con Escanear y la búsqueda a la vista (`AC-028`).
- [x] CUANDO se escanea o se elige un resultado EL SISTEMA DEBE añadirlo a la lista visible, y
      volver a hacerlo DEBE sumar uno a esa línea.
- [x] CUANDO se busca EL SISTEMA DEBE mostrar los resultados sin perder la venta en curso (`AC-023`).
- [x] CUANDO se toca «Vaciar» EL SISTEMA DEBE vaciar sin preguntar y ofrecer «Deshacer».
- [x] A 360 px nada se sale de lado y Cobrar sigue a la vista con la venta larga (`T-025`–`T-027`).

## Verification

- Baseline: la de `T-032`, corrida el mismo día contra el mismo Postgres local.
- Final: `npm test && node scripts/harness-status.mjs && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Task-specific: recorrer una venta de tres productos a 360 px en el navegador, escaneando y
  buscando, y tomar capturas en claro y oscuro.

## Assumptions

- **Asunción** — en computador tampoco se quiere la cuadrícula. El cliente lo pidió mirando el
  celular; se aplica igual para no tener dos pantallas de venta distintas.

## Risks

- Sin cuadrícula, lo que no trae código cuesta escribir su nombre. Es lo que el cliente pidió; si
  estorba, la vuelta atrás es una tarea, no un arreglo.

## Outcome

- Changes: Vender sin cuadrícula ni `cuadricula()`: abre vacía («Escanea para empezar»), la venta
  es la pantalla con su total y cada línea con su código y − / +; los resultados ocupan su sitio
  mientras se busca y elegir uno vacía el campo; «Vaciar» arriba en rojo con «Deshacer»; en
  computador, la misma columna con Cobrar pegado al pie.
- Files: `src/app/(protegido)/{venta.tsx,vender/page.tsx}`, `src/domain/{venta,carrito}.ts`,
  `src/app/globals.css`, `e2e/{venta,busqueda-en-venta,historial,aspecto,tipografia,iconos}.spec.ts`,
  `docs/project/{design-handoff.md,architecture.md,data-model.md,requirements.json}`
- Baseline result: la de `T-032`, el mismo día y contra el mismo Postgres local.
- Final result: la de `T-032`. Recorrido a 360 px y a 1280 px, en claro y oscuro, con capturas.
- Decisions recorded: ninguna. `FR-017` recoge el pedido; `brief.md` y `user-stories.json` siguen
  nombrando la cuadrícula como historia del proyecto.
- Follow-up: las capturas del README (`docs/capturas/`) enseñan la venta vieja; regenerarlas con
  `readme.local.spec.ts`, ya adaptada.

## Review

- Media · `src/app/(protegido)/venta.tsx` · a 360 × 740 el «−» de la primera línea quedaba 2 px
  dentro del tercio superior (`NFR-003`). `mt-6` lo baja; en pantallas más cortas sube otra vez.
- Baja · el campo se vacía al elegir un resultado montándolo de nuevo (`key`): el objetivo de
  escaneo no expone otra forma de vaciarlo desde fuera.
