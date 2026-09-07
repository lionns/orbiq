---
id: T-002
title: Sesión de dueño con correo y contraseña
status: done
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

- [x] CUANDO alguien abre cualquier ruta sin sesión válida EL SISTEMA DEBE llevarlo al acceso sin
      revelar ningún dato del negocio (`AC-001`).
- [x] CUANDO el dueño entra con la contraseña correcta EL SISTEMA DEBE crear una fila de sesión y
      devolver una cookie cuyo valor no contiene información del usuario (`AC-002`).
- [x] CUANDO se entra con contraseña incorrecta EL SISTEMA DEBE rechazar sin distinguir si el usuario
      existe, y no crear sesión.
- [x] CUANDO la sesión está vencida EL SISTEMA DEBE tratarla como ausente.
- [x] El hash de la contraseña vive en `account` con `provider_id = 'credential'`, no en `user`. Es
      lo que hace que añadir Google después no sea una migración (`D-008`).
- [x] La contraseña no aparece en claro en la base ni en ningún registro de la aplicación.
- [x] Una prueba de Playwright entra, recarga la página y sigue dentro (`D-006`).

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: los atributos de la cookie se comprueban en `e2e/sesion.spec.ts` — en local
  `httpOnly`, `Lax`, `path: /`, 30 días y sin `Secure`; y con un `baseURL` https, `Secure` y el
  prefijo `__Secure-`. El valor opaco se comprueba contra la fila de sesión. En la base: `account`
  tiene el hash con `provider_id = 'credential'` y `user` no tiene columna de contraseña.

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

- Changes: Better Auth con su ruta `/api/auth`, sesión de 30 días con renovación diaria y
  `nextCookies` de último; `sesionActual` en el dominio; pantalla de acceso; grupo `(protegido)` con
  la guardia en su layout; script de alta y restablecimiento para el estudio; `AC-X03` pasa a ser
  una regla de ESLint.
- Files: `src/lib/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/domain/session.ts`,
  `src/domain/session.test.ts`, `src/app/acceso/*`, `src/app/(protegido)/layout.tsx`,
  `scripts/alta-dueno.mts`, `e2e/apoyo.ts`, `e2e/sesion.spec.ts`, `e2e/andamiaje.spec.ts`,
  `eslint.config.mjs`, `tsconfig.json`, `package.json`, `docs/project/architecture.md`
- Baseline result: `npm test` 7/7 · `typecheck` clean · `lint` clean · `harness-lint` clean.
- Final result: `npm test` 11/11 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 10/10
  contra Neon · `db:verify` 5/5. Barrido de las 39 columnas de texto de la base buscando la
  contraseña en claro: cero.
- Decisions recorded: ninguna nueva. `architecture.md` § Security recoge tres cosas que se
  decidieron al escribir: la sesión de 30 días (el valor de fábrica son 7, que en una tienda es
  teclear la clave cada semana), que la guardia vive donde se leen los datos y no en un middleware,
  y que `AC-X03` ahora la sostiene ESLint.
- Follow-up: ninguno abierto.

## Review

- Revisado por el Implementer, que es el mismo agente — riesgo de `agent-config.md` § Known Risks.
  La compensación es la de siempre: lo que se afirma se ejerce. Las propiedades de seguridad no se
  leyeron de la documentación de Better Auth sino de su código, y las que se pueden ejecutar quedan
  como pruebas que fallan si una actualización las cambia.
- Hallazgo propio, corregido: `npm run typecheck` no miraba los `.mts`. `include` traía `**/*.ts`,
  que no cubre esa extensión, así que `scripts/` llevaba dos archivos sin comprobar — y uno tenía un
  error real de tipos. El comando afirmaba más de lo que hacía.
- Hallazgo propio, corregido: la primera versión del script de alta mostraba la contraseña en
  pantalla mientras se tecleaba y se colgaba en la segunda pregunta.
- Nota de diseño: `sesionActual` importa `auth` de forma diferida. Cargarlo abre el pool contra
  Neon, y `npm test` corre el dominio sin base ni variables de entorno (`D-006`).

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-06

## Trace

- `docs/traces/2026-09-06_T-002_implementer.md` 
