## Trace

- 2026-09-08 — role: Implementer
  - read: `T-015`, `D-009`, `design-handoff.md` § Color, `src/app/layout.tsx`
  - did: manifest `standalone`, íconos generados de los tokens (192, 512, maskable, apple),
    `theme-color` por tema, y el comentario de `layout.tsx` que citaba la decisión superseded
  - files: `src/app/manifest.ts`, `src/app/layout.tsx`, `scripts/generar-iconos.mjs`,
    `e2e/instalable.spec.ts`, `package.json`, `.gitignore`
  - checks: baseline 65/65 y build en verde; final `test:e2e` 78/78, `harness-lint` clean.
    Las dos pruebas del manifest se verificaron rompiéndolo antes de darlas por buenas.
  - assumptions: la instalación la hace el estudio al entregar el equipo, en ambas plataformas
  - blockers: ninguno. Queda la comprobación en teléfono real, que es de `## Verification`.
