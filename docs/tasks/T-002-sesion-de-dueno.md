---
id: T-002
title: Sesión de dueño con correo y contraseña
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño entra con correo y contraseña, la sesión vive en el servidor y sigue abierta al día siguiente. Sin sesión válida, ninguna pantalla revela datos del negocio.
decisions: [D-001, D-008]
implements: [FR-009, NFR-007, US-001, US-011, AC-001, AC-002]
---

## Sources

- `docs/project/data-model.md` § user, § account, § session
- `docs/project/architecture.md` § Security
- `docs/decisions/D-008-identity-credenciales-como-relacion.md`

## Scope

- Better Auth con `emailAndPassword` activado y **sin** `socialProviders`: Google se enciende
  después con configuración, no con migración (`D-008`).
- Envoltura fina en `src/domain/` para resolver la sesión actual, de modo que una pantalla, una ruta
  HTTP o un job pregunten por ella igual (`D-001`, `AC-X03`).
- Pantalla de acceso, responsive, con el campo de entrada a 16 px mínimo (`design-handoff.md`).
- Guardia que protege toda ruta que no sea el acceso.
- Script del estudio para dar de alta un usuario dueño y para restablecer su contraseña (`US-011`).

## Out of Scope

- Encender Google. La puerta queda abierta por esquema; cruzarla es su propia tarea (`D-008`).
- Registro público, recuperación por correo, segundo factor (`D-008`).
- Roles distintos de `owner` y cualquier verificación de permisos (`D-008`).
- Sustituir scrypt por Argon2id. Está aceptado y anotado en `architecture.md` § Security.

## Acceptance Criteria

- [ ] CUANDO alguien abre cualquier ruta sin sesión válida EL SISTEMA DEBE llevarlo al acceso sin
      revelar ningún dato del negocio (`AC-001`).
- [ ] CUANDO el dueño entra con la contraseña correcta EL SISTEMA DEBE crear una fila de sesión y
      devolver una cookie cuyo valor no contiene información del usuario (`AC-002`).
- [ ] CUANDO se entra con contraseña incorrecta EL SISTEMA DEBE rechazar sin distinguir si el usuario
      existe, y no crear sesión.
- [ ] CUANDO la sesión está vencida EL SISTEMA DEBE tratarla como ausente.
- [ ] El hash de la contraseña vive en `account` con `provider_id = 'credential'`, no en `user`. Es
      lo que hace que añadir Google después no sea una migración (`D-008`).
- [ ] La contraseña no aparece en claro en la base ni en ningún registro de la aplicación.
- [ ] Una prueba de Playwright entra, recarga la página y sigue dentro (`D-006`).

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: inspeccionar la cookie en el navegador y confirmar `httpOnly`, `Secure` y que su
  valor es opaco. Y confirmar en la base que la fila de `account` tiene el hash y `user` no.

## Assumptions

- **Asunción** — el primer dueño tiene un correo utilizable. `D-008` lo hizo el identificador de
  acceso, y `data-model.md` § Open Questions deja la pregunta de producto abierta.

## Risks

- El riesgo del paquete de Argon2id desapareció al aceptar scrypt. A cambio entra otro: el esquema
  de identidad lo define una dependencia joven, y cambiar de librería costaría una migración. Está
  anotado en `architecture.md` § Known Constraints.
- Verificado el 2026-09-06 contra el código, no la documentación: token de sesión aleatorio de ~190
  bits y cookie `httpOnly`/`SameSite=Lax`/`Secure`. Si una actualización cambia eso, este criterio
  deja de cumplirse en silencio — conviene fijar la versión.

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
