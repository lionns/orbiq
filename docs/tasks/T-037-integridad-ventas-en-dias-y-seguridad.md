---
id: T-037
title: Integridad con operaciones simultáneas, Ventas por días, cabeceras y límite de intentos
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que el saldo y las anulaciones resistan operaciones simultáneas, que Ventas no traiga la historia entera, y que la app mande cabeceras de seguridad y cuente los intentos de entrar donde todas las instancias los vean.
decisions: [D-002, D-008, D-011]
implements: [FR-004, FR-006, FR-009, FR-012, AC-008, AC-010, AC-012, NFR-001]
---

## Sources

- Pruebas de rendimiento, seguridad e integridad pedidas por el estudio el 2026-09-27, y los
  cuatro arreglos aprobados ese día.

## Scope

- La venta, el conteo y «añadir código» bloquean la fila del producto (`FOR UPDATE`, en orden de
  id); anular marca y comprueba en una sola sentencia y bloquea igual.
- Ventas abre en hoy y enseña 7 días con «Ver más días»; la suma del rango sale de la base agrupada
  por día y las ventas se piden solo para los días a la vista.
- Cabeceras: `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`; sin `X-Powered-By`.
- Límite de intentos de Better Auth en la base (`rate_limit`, migración `0005`), por
  `cf-connecting-ip`.
- `eslint` ignora `.open-next/` y `.wrangler/`; los correos de prueba no chocan en paralelo.

## Out of Scope

- `Content-Security-Policy` completa: necesita nonces por petición y se decide aparte.
- Regla de límite en el WAF de Cloudflare: exige dominio propio; la tienda está en `workers.dev`.

## Acceptance Criteria

- [x] CUANDO se registran 20 ventas a la vez del mismo producto EL SISTEMA DEBE dejar el saldo igual
      al libro (`e2e/concurrencia.spec.ts`).
- [x] CUANDO se anula la misma venta varias veces a la vez EL SISTEMA DEBE aceptar una sola (`AC-012`).
- [x] CUANDO se abre Ventas sin fechas EL SISTEMA DEBE enseñar hoy; un rango largo, 7 días y «Ver más
      días», con la suma de todo el rango (`e2e/ventas-dias.spec.ts`).
- [x] Toda respuesta trae las cabeceras de seguridad (`e2e/seguridad.spec.ts`).
- [x] CUANDO una IP falla tres veces al entrar EL SISTEMA DEBE responder 429, también con otra
      instancia, sin que `x-forwarded-for` lo evite.

## Verification

- Final: `npm test`, `typecheck`, `lint`, `harness-lint`, `test:e2e` en Node (puerto 3100) y en el
  runtime de Workers (`npm run preview`), contra Postgres local.
- Task-specific: tienda simulada de 3.000 productos y 20.000 ventas (`orbiq_perf`), medida antes y
  después; límite de intentos probado con `curl` contra el servidor de producción local.

## Assumptions

- None

## Risks

- `0005` se aplica en el despliegue junto con `0004`.

## Outcome

- Changes: bloqueos de fila en venta, anulación, conteo y código; anulación atómica; Ventas por
  días; cabeceras; límite de intentos en la base; `eslint` y correos de prueba.
- Files: `src/domain/{venta,movimientos,catalogo}.ts`, `src/app/(protegido)/ventas/page.tsx`,
  `src/db/schema.ts`, `src/lib/auth.ts`, `next.config.ts`, `eslint.config.mjs`,
  `drizzle/0005_limite_de_intentos.sql`, `e2e/{concurrencia,ventas-dias,seguridad,apoyo}.ts*`
- Baseline result: 20 ventas simultáneas dejaban saldo 3 con libro −5; 5 anulaciones simultáneas
  pasaban las 5; Ventas sin fechas, 60 MB y 2 s; ninguna cabecera; límite en memoria.
- Final result: `npm test` 103/103 · `typecheck`, `lint`, `harness-lint` limpios · `test:e2e`
  130/130 en Node y 130/130 en el runtime de Workers (cabeceras y 429 comprobados ahí) · Ventas al abrir 33 ms y 0,77 MB; 10 simultáneos, p95 de 15,8 s a 1,1 s.
- Decisions recorded: ninguna nueva.
- Follow-up: con dominio propio, sumar una regla de límite en el WAF de Cloudflare.

## Review

- Alta · `src/domain/venta.ts` · ambos fallos de simultaneidad eran anteriores a `T-032`; los
  encontró la prueba de integridad, no una revisión.
- Baja · un rango de 7 días con ~220 ventas diarias sigue pesando ~5 MB; una tienda de barrio vende
  bastante menos. Si crece, menos días por página o días plegados.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-27
