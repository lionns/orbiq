## Trace

- 2026-09-29 — role: Implementer
  - read: `.diseno/personas/`, `D-008`, `data-model.md` § user, `lib/auth.ts`, `session.ts`,
    Better Auth 1.7.3 `db/with-hooks.mjs`, `plugins/admin/admin.mjs`, `db/internal-adapter.mjs`
  - did: `D-013`; tarea escrita; línea base la final de `T-038`
  - checks: `npm test` 122/122, `test:e2e` 133/133
  - assumptions: el rol se lee de la fila en cada petición
  - blockers: ninguno
- 2026-09-29 — role: Implementer
  - did: `disabled_at`, permisos, sesión con rol, bloqueo al entrar, acciones protegidas, Personas,
    vistas del empleado, `alta-dueno` sobre el mismo alta; contraste de Personas en los dos temas
  - checks: `npm test` 132/132, `harness-lint`, `typecheck`, `lint` limpios, `build` ok,
    `db:verify` ok, `test:e2e` 138/138 ×3
  - assumptions: ninguna nueva
  - blockers: ninguno
