---
id: T-001
title: Andamiaje de la aplicación y esquema inicial
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: Levantar la aplicación Next.js con el stack de architecture.md, crear el esquema de las siete entidades como primera migración versionada, y dejar corriendo en verde los cinco comandos que quality-gates.md invoca verbatim.
decisions: [D-001, D-002, D-003, D-006]
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
- Esquema de las siete entidades de `data-model.md` y **una** migración inicial versionada.
- `src/domain/` creado y vacío de lógica, con la regla de `D-001` documentada en un README corto.
- Vitest configurado, con una prueba real: el saldo de un producto recomputado desde movimientos.
- Playwright configurado, con una prueba que carga la aplicación contra la base real.
- Generación de UUIDv7 en la aplicación, con prueba de que dos seguidos quedan ordenados.

## Out of Scope

- Cualquier pantalla de producto: sesión, catálogo y venta son T-002, T-003 y T-004.
- Argon2id y la librería de código de barras — entran en la tarea que los usa (`architecture.md`).
- Despliegue en Vercel. Se hace cuando haya una rebanada que mostrar.
- Datos de ejemplo más allá de lo que las pruebas necesiten.

## Acceptance Criteria

- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` y `npm run test:e2e` existen y
      terminan en verde desde la raíz del repositorio.
- [ ] CUANDO se aplica la migración inicial sobre una base vacía EL SISTEMA DEBE crear las siete
      tablas de `data-model.md` con sus claves foráneas y sus restricciones de unicidad.
- [ ] CUANDO se guardan dos productos sin código de barras EL SISTEMA DEBE aceptar ambos, y CUANDO
      se guarda uno con un código ya usado DEBE rechazarlo — el índice parcial de `AC-004`/`AC-005`.
- [ ] CUANDO se insertan movimientos para un producto EL SISTEMA DEBE poder recomputar su saldo desde
      el libro y coincidir con `product.stock` (`NFR-005`).
- [ ] CUANDO se generan dos identificadores seguidos EL SISTEMA DEBE producirlos ordenados en el
      tiempo y no consecutivos (`D-002`).
- [ ] La migración está versionada como archivo en el repositorio; no se aplicó ningún cambio a mano
      contra la base (`AC-X06`).
- [ ] `src/domain/` no importa nada de `next/*` (`AC-X03`).

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

- El paquete de Argon2id puede no correr en el runtime de Vercel. No bloquea esta tarea porque la
  contraseña entra en T-002, pero si falla allí obliga a revisar `architecture.md` § Security.
- Neon con conexión agrupada más funciones serverless es el punto donde este stack suele fallar
  primero. Se verifica aquí, no en la tarea de la venta.
- Playwright contra una base real es lo más lento de montar de todo el andamiaje. Es también lo que
  `D-006` hace obligatorio, así que no se difiere.

## Outcome

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- 

## Validation

- Validated by: 
- Date: 

## Trace

- 
