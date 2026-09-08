# D-007 — Web responsive, pulgar primero, en pestaña del navegador

- Status: superseded
- Date: 2026-09-04
- Supersedes: none
- Tasks: none
- Foundation: interface
- Trigger: que WebKit corrija el bug 185448 de acceso a cámara en modo standalone

## Context

La aplicación se opera desde computador, tablet o celular, según lo que el negocio tenga a mano. Es
una sola interfaz en varios anchos, no varias construidas por separado, y esa es también la forma
más barata de sumar pantallas después. En
iOS, una aplicación instalada en la pantalla de inicio pierde el acceso a la cámara por
`getUserMedia` y no conserva el permiso — WebKit bug 185448, aún abierto.

## Decision

Una aplicación web responsive diseñada primero para el pulgar, que se ensancha en pantalla grande.
Corre en pestaña del navegador: no se declara instalable en iOS. El código de barras entra por un
único objetivo de escaneo que acepta cámara, teclado y texto tecleado indistintamente, con
detección nativa del navegador donde exista y respaldo en el cliente donde no.

## Consequences

- Una sola base de interfaz sirve a celular, tablet y escritorio, y cada pantalla nueva la hereda.
- El objetivo de escaneo único admite una pistola lectora, un teléfono emparejado como teclado o
  otra librería de cámara sin tocar la pantalla que lo usa.
- Se renuncia a la sensación de aplicación instalada en iPhone a cambio de que la cámara funcione,
  que es el acto central del producto. El `Trigger` dice cuándo revisarlo.
- La librería de lectura, los tokens visuales y los estados de interacción quedan **sin decidir**
  aquí; van en `docs/project/architecture.md` § Frontend y `docs/project/design-handoff.md`.

## References

- WebKit bug 185448 (cámara en standalone): https://bugs.webkit.org/show_bug.cgi?id=185448
- `docs/project/brief.md` § Constraints
