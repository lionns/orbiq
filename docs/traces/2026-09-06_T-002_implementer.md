## Trace

- 2026-09-06 — role: Implementer
  - read: `T-002`, `D-008`, `data-model.md` § user/account/session, `architecture.md` § Security,
    y el código de Better Auth 1.7.3 en `node_modules` — no su documentación
  - did: baseline verde antes de tocar código
  - checks: `npm test` 7/7 · `typecheck` clean · `lint` clean · `harness-lint` clean
  - assumptions: la cookie `secure` se deriva de `isProduction` o de un `baseURL` https
    (`cookies/index.mjs`), así que en local va sin `Secure` y en Vercel con él
  - blockers: ninguno

- 2026-09-06 — role: Implementer
  - read: el código de Better Auth 1.7.3 — `cookies/index.mjs`, `api/routes/sign-in.mjs`,
    `db/internal-adapter.mjs`, `integrations/next-js.mjs`, `@better-auth/utils/random`
  - did: ruta `/api/auth`, sesión de 30 días con renovación diaria, `sesionActual` en el dominio,
    pantalla de acceso, grupo `(protegido)` con la guardia en su layout, script de alta y
    restablecimiento, y `AC-X03` convertida en regla de ESLint que se probó que muerde
  - files: `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/domain/session*.ts`,
    `src/app/acceso/*`, `src/app/(protegido)/layout.tsx`, `scripts/alta-dueno.mts`, `e2e/*`,
    `eslint.config.mjs`, `tsconfig.json`, `docs/project/architecture.md`
  - checks: `npm test` 11/11 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 10/10
    contra Neon · `db:verify` 5/5 · 39 columnas de texto barridas sin contraseña en claro
  - assumptions: ninguna nueva
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano
