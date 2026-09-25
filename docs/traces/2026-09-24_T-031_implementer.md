## Trace

- 2026-09-24 — role: Implementer · inicio
  - read: `D-005`, `architecture.md` § Deployment, `src/db/index.ts`, `src/lib/auth.ts`, docs de
    Cloudflare (Next.js en Workers, Hyperdrive con Neon, límites y precios)
  - did: tarea escrita; línea base
  - checks: `npm test` 71/71, typecheck, lint y harness-lint limpios; build en una copia aparte
  - assumptions: `negocio-1` y `negocio-2` hasta que haya nombres
  - blockers: ninguno
- 2026-09-24 — role: Implementer · cierre
  - did: `pg` por petición en Workers; OpenNext y un entorno por negocio; `NEGOCIO_NOMBRE`;
    § Deployment; tres pruebas que dependían del orden
  - checks: 71/71 · e2e 106/106 en Node · 105/106 en Workers, la caída arreglada · dry-run ok
  - assumptions: las mismas
  - blockers: ninguno; los pasos de la cuenta quedan en `architecture.md`
