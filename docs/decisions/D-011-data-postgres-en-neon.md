# D-011 — PostgreSQL en Neon, una base por negocio

- Status: accepted
- Date: 2026-09-27
- Supersedes: none
- Tasks: T-031, T-036

## Context

`D-002` pidió una base relacional gestionada y dejó el motor sin decidir. `architecture.md` puso
Neon sin escribir por qué ni contra qué, y el estudio lo preguntó el 2026-09-27. Se escribe ahora
para que la elección tenga razones y no solo un nombre.

## Decision

PostgreSQL gestionado en Neon, un proyecto por negocio (`D-005`), detrás de Hyperdrive en Workers.
**Con la caché de Hyperdrive apagada**: con el volumen de una tienda no hace falta, y encendida
devolvía lecturas de hasta 75 s atrás — existencias tras vender, la sesión tras salir.

## Consequences

- Postgres: transacciones interactivas para la venta (`AC-008`), restricciones y enums en la base.
  D1 y Turso son SQLite; D1 no admite esas transacciones desde un Worker.
- Se apaga sola sin uso: una base por negocio no paga las horas en que la tienda está cerrada.
- Ramas instantáneas: respaldo y ensayo antes de cada migración, sin copiar datos.
- Se paga por tiempo encendida y espacio, no por consulta: una consulta de más cuesta latencia.
- Dos tableros por cliente, Cloudflare y Neon; el plan de Neon se revisa antes del quinto negocio.
- Alternativa que también serviría: Supabase (Postgres), con mucho más de lo que se usa.

## References

- Caché de Hyperdrive: https://developers.cloudflare.com/hyperdrive/concepts/query-caching/
- `docs/project/architecture.md` § Stack, § Deployment · `T-036` § Review
