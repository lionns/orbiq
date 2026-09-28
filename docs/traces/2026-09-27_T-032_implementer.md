## Trace

- 2026-09-27 — role: Implementer
  - read: `STATUS.md`, `.diseno/codigos/`, `D-002`, `D-010`, `data-model.md`
  - did: tarea escrita desde el prototipo validado; línea base contra Postgres local en Docker
  - checks: baseline `npm test` 71/71, `harness-lint`, `typecheck`, `lint` limpios; `test:e2e`
    104/107 — `cobalto.spec:139` falla siempre en base vacía (previo), otras dos intermitentes
  - assumptions: las de la tarea
  - blockers: ninguno
- 2026-09-27 — role: Implementer
  - did: esquema, migración con relleno, dominio por código, flujo del código desconocido en venta
    y Productos, ficha «Por código»; migración probada sobre datos del esquema anterior
  - checks: `npm test` 89/89, `typecheck`, `lint`, `harness-lint` limpios, `build` ok, `db:verify`
    5/5, `test:e2e` 108–109/111 en paralelo (intermitentes previas; 13/13 con un proceso)
  - assumptions: sin código es el grupo más antiguo; lo que no cabe sale del código más reciente
  - blockers: ninguno
