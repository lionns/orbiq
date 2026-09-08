# Quality Gates

Commands run from the repo root. Name the real commands — the harness gates invoke these verbatim.

## Baseline Checks

Run these before starting new implementation. Any required failure blocks the task.

| Check | Command or Procedure | Required | Notes |
| --- | --- | --- | --- |
| Tests | `npm test` | yes | Vitest sobre las funciones de dominio (`D-006`) |
| Harness records | `node scripts/harness-lint.mjs` | yes | Presupuestos de `harness.json` § budgets y forma de los registros de `docs/sdd/TEMPLATES.md` |
| Type check | `npm run typecheck` | yes | `tsc --noEmit`, modo estricto |
| Lint | `npm run lint` | yes | |
| Build | `npm run build` | | Lo cubre el despliegue; aquí es señal temprana |

## Final Acceptance Checks

Run these before requesting review or human validation. Both tables must be green. Weakening,
skipping, or narrowing any of them to reach green is a defect, not a fix (`ROLES.md`).

### Checks the agent iterates against

| Check | Command or Procedure | Required | Notes |
| --- | --- | --- | --- |
| Tests | `npm test` | yes | New behavior needs a test with it |
| Harness records | `node scripts/harness-status.mjs && node scripts/harness-lint.mjs` | yes | Regenerate before linting: `harness-lint` fails on a stale `STATUS.md` |
| Type check | `npm run typecheck` | yes | |
| Lint | `npm run lint` | yes | |
| Build | `npm run build` | yes | Una rebanada que no compila no se despliega |

### Checks that exercise the change in composition

At least one. A change can be made to pass the table above by narrowing it; it cannot be made to
pass a check that runs it together with what already exists.

| Check | Command or Procedure | Required | Notes |
| --- | --- | --- | --- |
| Integration | `npm run test:e2e` | yes | Playwright: pantalla, servidor y base con datos reales. Ninguna rebanada cierra sin la suya (`D-006`) |
| End-to-end | — | | Lo cubre la fila anterior: en este stack son la misma prueba (`D-001`) |

## Manual Validation

Profile `team`: la validación es un acto explícito, no la ausencia de objeción.

- **Validador:** Juan Sebastián León Velásquez.
- **Recibe, en un solo mensaje:** id y título de la tarea, qué cambió, archivos tocados, resultado
  de baseline / final / review, ruta de la traza, decisiones registradas, riesgos y trabajo
  pendiente.
- **Además, para toda rebanada con interfaz:** cómo operarla desde un celular, porque el criterio de
  `brief.md` § Success Measures se mide con el pulgar, no leyendo el diff.

## Known Exceptions

- **Los comandos `npm` de las dos tablas no existen todavía.** El repositorio hoy solo contiene el
  harness: no hay `package.json`. La tarea de andamiaje es la que establece esta línea base, que es
  el caso que `HARNESS.md` § Exceptions contempla. Aprobado por Juan Sebastián León Velásquez el
  2026-09-06. **Expira** cuando esa tarea cierre: desde la siguiente, un comando que falle bloquea.
