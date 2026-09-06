# D-001 — Una aplicación desplegable, con la lógica en funciones de dominio

- Status: accepted
- Date: 2026-09-04
- Supersedes: none
- Tasks: none
- Foundation: runtime

## Context

Orbiq crece hacia más superficies: hoy un panel en el navegador, mañana posiblemente una API
pública, una tienda o una app nativa. Lo que decide si esas superficies se pueden añadir no es
tener una API hoy — es que la lógica de negocio sea invocable desde cualquier entrada. Un contrato
público construido antes de su segundo consumidor hay que sostenerlo y versionarlo desde el primer
día, sin nadie del otro lado que diga qué necesita.

## Decision

Orbiq se construye y despliega como una sola aplicación: la interfaz y el acceso a datos viven en
el mismo desplegable. La lógica de negocio vive en funciones de dominio invocables desde cualquier
entrada — una pantalla, una ruta HTTP, un job — y nunca escrita dentro del manejador de ruta.

## Consequences

- Añadir una API pública, un webhook o una app nativa es envolver funciones que ya existen. La
  misma función sirve a una pantalla, a una ruta HTTP y a un proceso en segundo plano.
- Las reglas de dominio se prueban sin levantar navegador ni servidor, porque son funciones.
- Se difiere el contrato público: hasta que exista un segundo consumidor no hay versiones que
  sostener ni compatibilidad que prometer.
- Lenguaje, framework, gestor de paquetes y herramientas quedan **sin decidir** aquí; se eligen por
  tarea, sobre evidencia, y se documentan en `docs/project/architecture.md` § Stack.

## References

- `docs/project/brief.md` § Objective
