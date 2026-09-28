## Trace

- 2026-09-28 — role: Implementer
  - read: `AGENTS.md`, `STATUS.md`, `quality-gates.md`, `architecture.md`, `D-005`, `D-011`, `T-037`,
    Better Auth `api/index.mjs`, `integrations/next-js.mjs`, `rate-limiter/index.mjs`
  - did: línea base contra Postgres 16 local; formulario de Acceso atacado 12 veces sin freno
    (`curl` a `/api/auth` sí daba 429); acceso por `auth.handler`; vaciado condicionado del campo de
    escaneo; pruebas de límite, escaneo seguido, cobro sin sesión y cantidades inválidas
  - files: `src/app/acceso/acciones.ts`, `src/ui/objetivo-de-escaneo.tsx`, `e2e/*`
  - checks: `npm test` 103/103, `typecheck`/`lint`/`build`/`harness-lint` limpios, `db:verify` 5/5,
    `test:e2e` 134/134 ×3; acceso comprobado en `npm run preview`
  - assumptions: sin acceso a Cloudflare ni Neon; medición local
  - blockers: la validación del estudio
