# D-005 — Un despliegue por negocio, con el camino a multi-tenant abierto

- Status: accepted
- Date: 2026-09-04
- Supersedes: none
- Tasks: none
- Foundation: deploy
- Trigger: el quinto negocio, o el primero que pida dominio propio con su marca

## Context

Una plataforma que sirve a muchos negocios termina siendo multi-tenant: es más barata de operar y
es la única forma de vender autoservicio. Pero el aislamiento que da la multi-tenancy, un despliegue
aparte lo da gratis mientras haya pocos clientes. Lo que decide si el camino queda abierto no es
construirlo ya, es que los datos puedan convivir después.

## Decision

Una instancia de la aplicación y una base por negocio. Ningún identificador de negocio en el
esquema todavía. Sin funcionamiento sin conexión: la aplicación exige conexión y falla de forma
explícita, pero cada venta se registra en una sola operación idempotente.

## Consequences

- Aislamiento total entre negocios sin escribir una línea, y cada cliente puede ir a una versión
  distinta mientras el producto se estabiliza.
- Los identificadores no secuenciales de `D-002` hacen que fusionar bases más adelante sea añadir
  una columna de negocio, no renumerar filas. Ese es el trabajo que compra el camino a multi-tenant.
- El costo crece lineal con los clientes y el despliegue habrá que automatizarlo antes del quinto.
- La idempotencia de la venta se construye ahora porque es la mitad cara del problema sin conexión:
  reintentar tras un fallo de red no puede descontar existencias dos veces.
- El proveedor de hospedaje y su costo se documentan en `docs/project/architecture.md` § Deployment.

## References

- `docs/project/brief.md` § Constraints, § Out of Scope
