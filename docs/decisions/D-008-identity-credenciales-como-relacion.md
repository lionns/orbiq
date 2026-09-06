# D-008 — Credenciales como relación propia, con proveedor externo desde el esquema

- Status: accepted
- Date: 2026-09-06
- Supersedes: D-004
- Tasks: T-002
- Foundation: identity
- Trigger: el primer negocio cuyo dueño no use cuenta de Google

## Context

`D-004` puso la tabla de usuarios desde el día uno, pero dejó la credencial dentro de esa fila:
`password_hash` como columna asume una credencial por persona. La deuda que `D-004` admitió por
escrito — el restablecimiento manual deja de servir con varios clientes — solo se paga con un
proveedor externo, y eso obliga a partir la fila.

## Decision

Las credenciales viven en una relación propia, separada del usuario: contraseña, proveedor externo,
o ambos. Better Auth gestiona identidad y sesión, con sesión de servidor y cookie opaca — lo que
`D-004` exigía y esto conserva. Hoy solo se activa contraseña; Google se enciende con configuración.

## Consequences

- Añadir Google, o cualquier proveedor, es configuración y no migración sobre datos de un negocio.
- **Iniciar sesión con un proveedor no es registrarse.** El callback rechaza cuentas que el estudio
  no dio de alta: `D-004` dijo sin registro público y eso no cambia.
- Se acepta scrypt, el algoritmo por defecto de la librería, en vez de Argon2id. Cambiarlo después
  es rehashear en el siguiente inicio de sesión, no migrar.
- El token de sesión se almacena en claro: quien lea la base obtiene sesiones usables. Queda anotado
  en `architecture.md` § Known Constraints en vez de escondido.
- Se cede el esquema de identidad a una dependencia joven, y el identificador de acceso pasa a ser
  el correo en vez de un nombre de usuario.

## References

- `docs/decisions/D-004-identity-sesion-unica-de-dueno.md`
- Deprecación de Arctic y el nivel de abstracción de OAuth: https://pilcrowonpaper.com/blog/18
- Argon2id por defecto, cerrada como no planeada: https://github.com/better-auth/better-auth/issues/6608
