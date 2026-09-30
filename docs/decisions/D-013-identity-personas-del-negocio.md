# D-013 — Personas del negocio: dos roles y los permisos como datos

- Status: accepted
- Date: 2026-09-29
- Supersedes: none
- Tasks: T-039

## Context

A veces atiende la tienda alguien que no es el dueño. `D-008` dejó la puerta —la sesión apunta a
una fila de `user` con rol— y `brief.md` sacaba del MVP los usuarios múltiples hasta que llegara
este pedido. El estudio fijó el 2026-09-29 qué puede y qué no quien atiende, y que lo da de alta el
dueño desde la aplicación, con correo y contraseña.

## Decision

`user.role` toma dos valores, `owner` y `staff` («Empleado»). Lo que cada rol puede hacer vive en una
sola función de dominio, `puede(rol, accion)`, que consultan la pantalla —para no ofrecerlo— y cada
acción de servidor —para rechazarlo—. Una baja escribe `user.disabled_at`, cierra sus sesiones y
Better Auth rechaza crearle otra.

## Consequences

- Un permiso o un rol nuevo es una línea en `permisos.ts`, no una migración.
- Esconder un botón no es seguridad: la acción lo rechaza aunque se la llame directo.
- Nadie se borra: ventas y movimientos siguen nombrando a quien los hizo, y la baja se revierte.
- Sigue sin haber registro público (`D-008`): el alta la hace el dueño, no la persona.
- Deshacer un cobro es anular, así que un empleado no lo tiene.
- El dueño no puede darse de baja: sin él nadie administraría la tienda.

## References

- Prototipo validado el 2026-09-29: `.diseno/personas/`
- `D-008` · `docs/project/data-model.md` § user
