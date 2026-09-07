## Trace

- 2026-09-07 — role: Implementer · ronda 1, comprimida
  - did: calculó el contraste WCAG de cada par real de las dos paletas antes de escribir CSS.
    Baseline verde: `npm test` 42/42, `test:e2e` 35/35
  - assumptions: la preferencia va en cookie, para que el servidor pinte ya con el tema correcto

- 2026-09-07 — role: Implementer
  - did: paleta oscura con los once pares reales medidos; tema decidido en el servidor por cookie
    para que no haya destello; selector de tres opciones en cabecera y acceso; `color-scheme` en
    el `<html>`
  - files: `src/domain/tema*.ts`, `src/app/acciones-tema.ts`, `src/ui/selector-tema.tsx`,
    `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(protegido)/layout.tsx`,
    `src/app/acceso/page.tsx`, `e2e/tema.spec.ts`, `docs/project/design-handoff.md`
  - checks: `npm test` 48/48 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 42/42 en
    tres corridas · once pares de contraste medidos en los dos temas, todos por encima del mínimo
  - assumptions: ninguna
  - blockers: ninguno. Queda `review` a la espera de la firma del validador humano

- 2026-09-07 — role: Implementer
  - did: quitó la dependencia invertida de `src/ui/` hacia `src/app/` — la acción pasa por
    parámetro — y la fijó con una regla de ESLint que se probó que muerde
  - files: `src/ui/selector-tema.tsx`, los dos que lo usan, `eslint.config.mjs`
  - checks: `npm test` 48/48 · `lint` clean · `build` ok · `test:e2e` 42/42
