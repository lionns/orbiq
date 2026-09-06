# D-004 — Usuarios como tabla desde el día uno, con un solo rol

- Status: superseded
- Date: 2026-09-04
- Supersedes: none
- Tasks: none
- Foundation: identity
- Trigger: un familiar o empleado que también atienda el negocio

## Context

Hoy hay un dueño y un despliegue, y no existe un segundo actor de quien proteger nada. Pero
empleados con permisos distintos son una de las capacidades más probables del producto, y la
diferencia entre añadirla barata o cara se decide ahora: si la sesión apunta a una fila de usuario,
crecer es una fila más; si apunta a una constante, crecer es migrar el esquema y rehacer la sesión.

## Decision

Tabla de usuarios desde la primera migración, con un campo de rol que hoy solo toma el valor
`owner`. Autenticación por contraseña, con sesión de servidor de larga duración — no un token
guardado en el navegador — para no pedir la clave cada mañana. El alta del negocio y el
restablecimiento de contraseña los hace el estudio a mano.

## Consequences

- Añadir un empleado después es una fila y un valor de rol nuevo, no una migración de esquema.
- Los movimientos de inventario pueden atribuirse a un usuario desde el principio, que es lo que
  hace posible el análisis de merma cuando haya más de una persona.
- Superficie mínima hoy: sin registro público, sin recuperación por correo, sin permisos.
- El restablecimiento manual es aceptable con un cliente y deja de serlo con varios; queda visible
  como deuda en vez de escondida.
- El algoritmo de hash y el mecanismo de sesión se documentan en `docs/project/architecture.md`
  § Security.

## References

- `docs/project/brief.md` § Users
