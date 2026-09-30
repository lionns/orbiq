## Trace

- 2026-09-29 — role: Implementer
  - read: `STATUS.md`, `.diseno/etiquetas/`, `D-002`, `D-010`, `data-model.md`, `catalogo.ts`,
    `movimientos.ts`, `codigos.ts`, `ficha.tsx`
  - did: vistas validadas con el estudio; `D-012`; tarea escrita; línea base contra Postgres local
  - checks: baseline `npm test` 103/103, `harness-lint`, `typecheck`, `lint` limpios; `test:e2e`
    130/130
  - assumptions: once dígitos al azar bastan; si chocan, se reintenta
  - blockers: ninguno
- 2026-09-29 — role: Implementer
  - did: enum `relabel`, codificador EAN-13 en el dominio, generar código con el par, etiquetas
    (buscar, marcar, cuántas, hoja carta), historial; contraste en los dos temas; hoja a PDF
  - checks: `npm test` 122/122, `harness-lint`, `typecheck`, `lint` limpios, `build` ok,
    `db:verify` ok, `test:e2e` 133/133 en 5 de 7 corridas (intermitente previa en las otras)
  - assumptions: las de la tarea
  - blockers: ninguno
