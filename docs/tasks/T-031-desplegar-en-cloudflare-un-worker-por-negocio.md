---
id: T-031
title: Desplegar en Cloudflare, un Worker por negocio
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que orbiq se despliegue en Cloudflare Workers con un solo comando por negocio —hoy son dos, en Colombia, en `*.workers.dev`— y que cada uno tenga su Worker, su base en Neon y su Hyperdrive, como pide `D-005`. Cada Worker dice el nombre de su tienda.
decisions: [D-001, D-005, D-009]
implements: [FR-010, NFR-004]
---

## Sources

- `docs/decisions/D-005-deploy-un-despliegue-por-negocio.md` — una instancia y una base por negocio
- `docs/project/architecture.md` § Deployment — decía Vercel; se reescribe
- Cloudflare, septiembre de 2026: Next.js en Workers con `@opennextjs/cloudflare` (soporta Next 16;
  vinext es la recomendación por defecto pero está en beta); Neon desde un Worker por Hyperdrive con
  `pg` y un cliente por petición; Workers Paid es por cuenta (USD 5/mes) e incluye Hyperdrive
- Estudio, 2026-09-24: plan Workers Paid aprobado; dos negocios en Colombia, sin nombre todavía;
  `*.workers.dev` por ahora

## Scope

- **Conexión por petición.** Un Worker no puede usar en una petición una conexión abierta en otra.
  Dentro del Worker, `db` sale de Hyperdrive con un cliente nuevo por petición; en Node —desarrollo,
  pruebas, scripts— sigue siendo un grupo compartido sobre `DATABASE_URL`. Un solo driver, `pg`, en
  los dos. Nada del dominio ni de better-auth cambia de firma.
- **OpenNext.** `@opennextjs/cloudflare` y `wrangler`, `wrangler.jsonc` con un entorno por negocio,
  scripts `preview` y `deploy`, `.open-next` ignorado.
- **El nombre de la tienda por despliegue** (`NEGOCIO_NOMBRE`), con «Mi tienda» si falta.
- `architecture.md` § Deployment reescrita, con los pasos que dependen de la cuenta de Cloudflare.

## Out of Scope

- Multi-tenancy (`D-005`: con el quinto negocio). Dominio propio. Observabilidad más allá de los
  logs de Workers.
- Crear la cuenta, el plan, las bases y los Hyperdrive: son de la cuenta del estudio. Quedan como
  pasos exactos en `architecture.md`.

## Acceptance Criteria

- [x] CUANDO la app corre en el runtime de Workers (`npm run preview`) EL SISTEMA DEBE permitir
      entrar, cobrar una venta, anularla y ver el total de hoy en Inicio, contra Neon por Hyperdrive.
- [x] CUANDO dos peticiones seguidas llegan al mismo Worker EL SISTEMA DEBE atender las dos: ninguna
      reusa la conexión de la otra (el error del runtime es «Cannot perform I/O on behalf of a
      different request»).
- [x] CUANDO `NEGOCIO_NOMBRE` vale «La Esquina» EL SISTEMA DEBE mostrarlo en Acceso, Inicio y el menú.
- [x] En Node todo sigue igual: `npm test`, la suite e2e y los scripts (`alta-dueno`, `sembrar-demo`).
- [x] `npm run deploy -- --env <negocio>` despliega ese negocio y solo ese.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando, con `node scripts/harness-status.mjs` antes del lint, más `npm run test:e2e`
- Task-specific: la suite e2e también contra `npm run preview` (runtime de Workers en local)

## Assumptions

- Suposición: los dos negocios se llaman `negocio-1` y `negocio-2` en `wrangler.jsonc` hasta que
  haya nombres; renombrarlos es cambiar dos claves.

## Risks

- Cambiar de driver (`@neondatabase/serverless` → `pg`) toca todas las consultas, incluidas las
  transacciones de la venta. La suite entera es la red.

## Outcome

- Changes: `db` elige por petición: en Workers, un grupo de `pg` propio de la petición contra
  Hyperdrive; en Node, el grupo de siempre sobre `DATABASE_URL`. `pg` reemplaza a
  `@neondatabase/serverless`. OpenNext, `wrangler.jsonc` con `negocio-1` y `negocio-2`, `preview` y
  `deploy`. `NEGOCIO_NOMBRE` por despliegue. § Deployment reescrita, con el alta de un negocio.
- Files: `src/db/index.ts`, `src/domain/{negocio,zona}.ts`, `wrangler.jsonc`, `open-next.config.ts`,
  `next.config.ts`, `package.json`, `public/_headers`, `.gitignore`, `.env.example`,
  `architecture.md`, `e2e/{busqueda-en-venta,historial,sesion}.spec.ts`.
- Baseline result: 71/71, typecheck, lint, harness-lint limpios; build en copia aparte.
- Final result: 71/71 · typecheck, lint, harness-lint limpios · `db:verify` ok · e2e **106/106**
  en Node contra el build de producción · e2e en el runtime de Workers (`wrangler dev`, Neon
  directo): **105/106** a 3 procesos, y la que cayó pasa tras arreglar la prueba · «La Esquina» en
  Acceso, Inicio y el menú · `wrangler deploy --dry-run --env negocio-1`: sus bindings, 1,9 MB gzip.
- Decisions recorded: ninguna. `D-005` ya decía un despliegue por negocio; el proveedor es de
  `architecture.md` y se revierte en una tarde.
- Desplegado: Tienda Miriam en https://orbiq-tienda-miriam.juan-account.workers.dev (2026-09-25),
  con `npm run deploy -- --env tienda-miriam`. Al desplegar salió que OpenNext pide el binding
  local también al compilar: `preview` y `deploy` leen ahora `.env`. Sin direcciones de vista previa.
- Follow-up: ninguno de código. Los pasos 1–8 de § Dar de alta un negocio son de la cuenta del
  estudio.

## Review

- **`maxUses: 1` hacía cada consulta una conexión nueva.** Contra Neon directo son ~450 ms de
  saludo TLS cada una: corregir un conteo encadenaba unas quince y pasaba de los 5 s de la prueba.
  El grupo ya es de la petición, así que reusar dentro de ella es seguro. Con Hyperdrive de verdad
  conectar es barato, pero sigue siendo un viaje por consulta.
- **Tres pruebas dependían del orden, no del runtime.** La panela y el café se tocaban en la
  cuadrícula sin haberse vendido nunca, así que salían o no según lo que vendieran las vecinas;
  ahora se venden 60, como ya hacía `venta.spec`. «Salir» contaba todas las sesiones del dueño y
  la de «vencida» se quedaba; ahora mira la suya. Las tres pasan en Node y en Workers.
- **Sin resolver, anotado:** «Uncaught Error: Network connection lost» 3 veces en ~2000 peticiones,
  siempre en un `GET /` o `/vender` de precarga, sin prueba caída. No sale de `pg` (sus eventos
  `error` ya se escuchan y no se dispararon) y no se reprodujo abandonando peticiones a propósito.
  Se juzga en los logs del Worker desplegado, que usa Hyperdrive y no la conexión local.
- `wrangler dev` murió dos veces por un `ENOTFOUND` del DNS del router ante la ráfaga de
  conexiones; se nota en local, no en producción.

## Validation

- Validated by: Juan Leon
- Date: 25/09/2026

## Trace

- `docs/traces/2026-09-24_T-031_implementer.md`
