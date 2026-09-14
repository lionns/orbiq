## Trace

- 2026-09-13 — role: Implementer
  - read: `T-020`, `src/app/globals.css`, `design-handoff.md` § Design Tokens, documentación de
    Tailwind § Theme variables
  - did: paleta cruda con cada hex una sola vez; los tokens semánticos la referencian por
    `@theme inline`; los dos selectores de tema solo remapean, no repiten valores
  - files: `src/app/globals.css`
  - checks: baseline verde; final `npm test` 69/69, typecheck, lint, build, harness-lint limpios,
    `test:e2e` 87/87. Propagación medida cambiando el acento a fucsia y revirtiendo
  - assumptions: ninguna
  - blockers: ninguno
