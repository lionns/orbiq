---
id: T-038
title: El límite de intentos alcanza al formulario de Acceso, y escanear seguido no corta el código
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que la cuarta contraseña mala seguida desde una IP se frene también en la pantalla de Acceso, no solo en /api/auth, y que la respuesta de un código no borre lo que el lector o el dueño ya escribió después.
decisions: [D-008, D-009]
implements: [AC-001, AC-006, AC-023]
---

## Sources

- Revisión integral pedida por el estudio el 2026-09-28: matriz de pruebas y costos.
- `T-037` § Acceptance Criteria (límite de intentos), `src/lib/auth.ts`, Better Auth
  `dist/api/index.mjs` (`onRequest` → `onRequestRateLimit`).

## Scope

- `entrar` pasa por `auth.handler` (router de Better Auth, con su límite) y copia la cookie.
- El campo del objetivo de escaneo se vacía solo si sigue diciendo lo que se envió.
- Pruebas: límite por el formulario; escribir mientras se resuelve el código anterior; cobrar sin
  sesión repitiendo la acción; cantidades 0, negativas y decimales. `entrar` de `e2e/apoyo.ts`
  llega con su propia IP.

## Out of Scope

- La precarga de enlaces de Next (hasta 27 peticiones al abrir Inicio): es costo, no defecto, y
  cambiarla toca la navegación que el estudio validó. Se propone aparte.
- Validar cantidades en el dominio con un mensaje propio: hoy la base las rechaza (`500`).

## Acceptance Criteria

- [x] CUANDO una IP falla tres veces por el formulario de Acceso EL SISTEMA DEBE frenar la cuarta con
      «Demasiados intentos», y otra IP no hereda el bloqueo (`e2e/seguridad.spec.ts`).
- [x] CUANDO se entra con la clave correcta por el formulario EL SISTEMA DEBE dejar la cookie de sesión
      y abrir Inicio, en Node y en el runtime de Workers (`e2e/sesion.spec.ts`, `npm run preview`).
- [x] CUANDO se escribe en el campo mientras se resuelve el código anterior EL SISTEMA DEBE conservar
      lo escrito (`e2e/busqueda-en-venta.spec.ts`).
- [x] CUANDO se repite el envío de «Cobrar» sin sesión EL SISTEMA DEBE no registrar nada (`AC-001`).
- [x] CUANDO una venta trae cantidad 0, negativa o decimal EL SISTEMA DEBE rechazarla entera.

## Verification

- Baseline: `npm test`, `harness-lint`, `typecheck`, `lint`, `build`, `test:e2e` (Postgres local).
- Final: los mismos, `test:e2e` tres veces seguidas; `db:verify`.
- Task-specific: cada prueba nueva falla con el código anterior; control positivo del reenvío con
  sesión; acceso con límite y cookie comprobados en `npm run preview`.

## Assumptions

- El entorno de pruebas no tiene acceso a Cloudflare ni a Neon: todo se midió contra Postgres 16
  local y el runtime de Workers local.

## Risks

- Varias personas detrás de la misma IP comparten el cupo de tres intentos cada diez segundos.

## Outcome

- Changes: acceso por el router de Better Auth; vaciado condicionado del campo; cuatro pruebas.
- Files: `src/app/acceso/acciones.ts`, `src/ui/objetivo-de-escaneo.tsx`,
  `e2e/{apoyo,seguridad.spec,busqueda-en-venta.spec,venta.spec}.ts`
- Baseline result: test 103/103, harness/typecheck/lint/build limpios, e2e 128/130 (dos fallos
  intermitentes, uno es este defecto de escaneo) y 130/130 en otras dos pasadas.
- Final result: test 103/103, harness/typecheck/lint/build limpios, db:verify 5/5, e2e 134/134 tres
  veces seguidas.
- Decisions recorded: ninguna nueva.
- Follow-up: reducir la precarga de enlaces; mensaje propio para cantidades inválidas.

## Review

- Alta · `src/app/acceso/acciones.ts:25` · `auth.api.signInEmail` saltaba el límite de intentos ·
  fuerza bruta sin freno y scrypt facturable · corregido.
- Media · `src/ui/objetivo-de-escaneo.tsx:389` · la respuesta vaciaba lo escrito después · código
  cortado al escanear seguido · corregido.

## Validation

- Validated by: pendiente — Juan Sebastián León Velásquez
- Date: pendiente
