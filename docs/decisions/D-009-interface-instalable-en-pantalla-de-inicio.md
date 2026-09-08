# D-009 — Instalable en la pantalla de inicio, en Android y en iPhone

- Status: accepted
- Date: 2026-09-08
- Supersedes: D-007
- Tasks: T-015, T-016
- Foundation: interface
- Trigger: que reconceder la cámara en cada apertura estorbe, o hardware que el navegador no exponga

## Context

`D-007` dejó la aplicación en pestaña porque en iOS una app en la pantalla de inicio perdía
`getUserMedia`. Ese bug —WebKit 185448— está `RESOLVED FIXED` desde iOS 13.4: su disparador ya se
había cumplido cuando se escribió. Sigue abierto el 215884, cuyo costo es solo reconceder la cámara
en cada apertura. Sin ícono propio el dueño llega por la barra de direcciones, y la comparación que
manda no son otras aplicaciones de inventario: es el cuaderno.

## Decision

Una sola aplicación web responsive, pulgar primero, **declarada instalable en pantalla de inicio en
las dos plataformas** con `display: standalone`. El código de barras sigue entrando por un único
objetivo de escaneo que acepta cámara, lector de teclado y texto tecleado por igual, con detección
nativa del navegador donde exista y respaldo en el cliente donde no.

## Consequences

- El dueño abre por un ícono, a pantalla completa y sin barra de direcciones, en las dos
  plataformas. Cuesta un manifest y unos íconos, no una migración.
- En Android, Chrome instala un WebAPK real y `BarcodeDetector` es nativo. En iPhone la instalación
  es manual —Compartir › Añadir a inicio—, la hace el estudio al entregar, y hace falta un
  decodificador en el cliente, que `T-016` elige y anota en `architecture.md` § Stack.
- Se acepta reconceder la cámara en cada apertura en iPhone (WebKit 215884). Medir ese costo es lo
  que dispara la puerta nativa que `D-001` ya dejó abierta.
- Se sigue desplegando desde `main`: corregir un fallo no depende de que nadie instale nada
  (`D-005`). Distribuir por archivo o por tienda perdería eso.

## References

- WebKit 185448 (cerrado) y 215884 (permiso por apertura): https://bugs.webkit.org/show_bug.cgi?id=185448
- `docs/project/brief.md` § Constraints · `docs/project/design-handoff.md` § Visual References
