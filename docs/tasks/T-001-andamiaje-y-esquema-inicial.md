---
id: T-001
title: Andamiaje de la aplicación y esquema inicial
status: doing
profile: team
harness: 0.9.0
role: Implementer
goal: Levantar la aplicación Next.js con el stack de architecture.md, crear el esquema de las nueve entidades como primera migración versionada, y dejar corriendo en verde los cinco comandos que quality-gates.md invoca verbatim.
decisions: [D-001, D-002, D-003, D-006, D-008]
implements: [AC-X06]
---

## Sources

- `docs/project/architecture.md` § Stack, § Backend, § Data
- `docs/project/data-model.md` § Entities, § Relationships, § Validation Rules
- `docs/project/quality-gates.md` § Baseline Checks, § Final Acceptance Checks, § Known Exceptions
- `docs/project/design-handoff.md` § Design Tokens

## Scope

- `package.json` con los scripts `test`, `typecheck`, `lint`, `build`, `test:e2e`.
- Next.js con App Router y TypeScript en modo estricto.
- Tailwind configurado con los tokens de `design-handoff.md` § Design Tokens.
- Drizzle + drizzle-kit apuntando a Postgres de Neon, por el string de conexión agrupado.
- Better Auth con adaptador de Drizzle, sin `socialProviders` configurados (`D-008`).
- Esquema de las nueve entidades de `data-model.md` y **una** migración inicial versionada. Las cuatro
  de identidad siguen la forma que exige Better Auth; drizzle-kit produce la migración a partir de ahí.
- `src/domain/` creado y vacío de lógica, con la regla de `D-001` documentada en un README corto.
- Vitest configurado, con una prueba real: el saldo de un producto recomputado desde movimientos.
- Playwright configurado, con una prueba que carga la aplicación contra la base real.
- Generación de UUIDv7 en la aplicación, con prueba de que dos seguidos quedan ordenados.

## Out of Scope

- Cualquier pantalla de producto: sesión, catálogo y venta son T-002, T-003 y T-004.
- Encender Google u otro proveedor: se configura en su momento, no ahora (`D-008`).
- La librería de código de barras — entra en la tarea que la usa (`architecture.md`).
- Despliegue en Vercel. Se hace cuando haya una rebanada que mostrar.
- Datos de ejemplo más allá de lo que las pruebas necesiten.

## Acceptance Criteria

- [x] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y `npm run test:e2e` existen y
      terminan en verde desde la raíz del repositorio.
- [ ] CUANDO se aplica la migración inicial sobre una base vacía EL SISTEMA DEBE crear las siete
      tablas de `data-model.md` con sus claves foráneas y sus restricciones de unicidad.
- [ ] CUANDO se guardan dos productos sin código de barras EL SISTEMA DEBE aceptar ambos, y CUANDO
      se guarda uno con un código ya usado DEBE rechazarlo — el índice parcial de `AC-004`/`AC-005`.
- [ ] CUANDO se insertan movimientos para un producto EL SISTEMA DEBE poder recomputar su saldo desde
      el libro y coincidir con `product.stock` (`NFR-005`).
- [x] CUANDO se generan dos identificadores seguidos EL SISTEMA DEBE producirlos ordenados en el
      tiempo y no consecutivos (`D-002`).
- [x] La migración está versionada como archivo en el repositorio; no se aplicó ningún cambio a mano
      contra la base (`AC-X06`).
- [x] `src/domain/` no importa nada de `next/*` (`AC-X03`).

## Verification

- Baseline: `node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: aplicar la migración sobre una base Neon vacía y confirmar el esquema resultante
  contra la tabla de entidades de `data-model.md`, campo por campo.

## Assumptions

- **Asunción** — los comandos `npm` de `quality-gates.md` no existen al empezar. Es la excepción ya
  registrada en `quality-gates.md` § Known Exceptions, y esta tarea es la que la cierra.
- **Asunción** — hay una base Neon disponible antes de empezar. Sin ella, la prueba de Playwright de
  `D-006` no se puede correr y la tarea queda `blocked`, no `done`.

## Risks

- El CLI de Better Auth genera el esquema de identidad, así que el paso deja de escribirse a mano.
  Hay que comprobar que la migración resultante quede versionada en el repositorio y no aplicada
  directamente contra la base, que es lo que `AC-X06` exige.
- Neon con conexión agrupada más funciones serverless es el punto donde este stack suele fallar
  primero. Se verifica aquí, no en la tarea de la venta.
- Playwright contra una base real es lo más lento de montar de todo el andamiaje. Es también lo que
  `D-006` hace obligatorio, así que no se difiere.

## Outcome

- Changes: andamiaje Next 16 / React 19 / TS 6 estricto / Tailwind 4 con los tokens medidos;
  Drizzle + Neon por WebSocket; Better Auth sin `socialProviders`; Vitest y Playwright con pruebas
  reales; esquema de nueve tablas y migración inicial versionada.
- Files: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`,
  `postcss.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `drizzle.config.ts`,
  `src/db/*`, `src/domain/*`, `src/lib/auth.ts`, `src/app/*`, `e2e/smoke.spec.ts`,
  `drizzle/0000_spooky_blur.sql`, `.env.example`, `.gitignore`
- Baseline result: `harness-lint` clean. Los comandos `npm` no existían — excepción de
  `quality-gates.md`, que esta tarea cierra.
- Final result: `npm test` 7/7 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 1/1.
  **Incompleto**: la migración no se ha aplicado contra una base real.
- Decisions recorded: ninguna nueva. Se registró en `data-model.md` la tabla `verification`, que
  exige Better Auth y este documento no contemplaba.
- Follow-up: aplicar la migración sobre una base Neon vacía y verificar el esquema campo por campo;
  añadir una prueba de extremo a extremo que toque la base, que hoy no existe.

## Review

- 

## Validation

- Validated by: 
- Date: 

## Trace

- 
