---
id: T-002
title: Sesión de dueño con contraseña
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño entra con usuario y contraseña, la sesión vive en el servidor y sigue abierta al día siguiente. Sin sesión válida, ninguna pantalla revela datos del negocio.
decisions: [D-001, D-004]
implements: [FR-009, NFR-007, US-001, US-011, AC-001, AC-002]
---

## Sources

- `docs/project/data-model.md` § user, § session
- `docs/project/architecture.md` § Security
- `docs/decisions/D-004-identity-sesion-unica-de-dueno.md`

## Scope

- Funciones de dominio en `src/domain/`: autenticar, crear sesión, resolver sesión, cerrar sesión.
- Argon2id para la contraseña, con el paquete verificado contra el runtime de Vercel.
- Cookie `httpOnly`, `Secure`, `SameSite=Lax` con identificador **aleatorio criptográfico** — no
  UUIDv7, que es parcialmente adivinable (`data-model.md` § session).
- Pantalla de acceso, responsive, con el campo de entrada a 16 px mínimo (`design-handoff.md`).
- Guardia que protege toda ruta que no sea el acceso.
- Script del estudio para dar de alta un usuario dueño y para restablecer su contraseña (`US-011`).

## Out of Scope

- Registro público, recuperación por correo, segundo factor (`D-004`).
- Roles distintos de `owner` y cualquier verificación de permisos (`D-004`).
- Expiración por inactividad. La sesión dura por tiempo absoluto.

## Acceptance Criteria

- [ ] CUANDO alguien abre cualquier ruta sin sesión válida EL SISTEMA DEBE llevarlo al acceso sin
      revelar ningún dato del negocio (`AC-001`).
- [ ] CUANDO el dueño entra con la contraseña correcta EL SISTEMA DEBE crear una fila en `session` y
      devolver una cookie cuyo valor no contiene información del usuario (`AC-002`).
- [ ] CUANDO se entra con contraseña incorrecta EL SISTEMA DEBE rechazar sin distinguir si el usuario
      existe, y no crear sesión.
- [ ] CUANDO la sesión está vencida EL SISTEMA DEBE tratarla como ausente.
- [ ] La contraseña nunca se almacena ni se registra en claro, y `password_hash` es Argon2id.
- [ ] Una prueba de Playwright entra, recarga la página y sigue dentro (`D-006`).

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: inspeccionar la cookie en el navegador y confirmar que su valor es opaco, y que
  lleva `httpOnly` y `Secure`.

## Assumptions

- **Asunción** — el identificador de acceso es `username`, no correo
  (`data-model.md` § Open Questions). Si cambia, es una migración.

## Risks

- Si el paquete de Argon2id no corre en Vercel, esta tarea queda `blocked` y hay que volver a
  `architecture.md` § Security. Es el riesgo que T-001 dejó abierto a propósito.

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
