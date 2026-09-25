## Trace

- 2026-09-24 — role: Implementer · bloque 1, base visual: tokens Cobalto, Geist, botón, campo,
  plegable, nombres de existencias, handoff · test 71/71, `tema` e `instalable` en verde.
- 2026-09-24 — role: Implementer · bloque 2, navegación: Inicio en `/`, `/vender`, `/ajustes`,
  pestañas y menú lateral, venta guardada · e2e 92/96, los 4 fallos corregidos (38/38).
- 2026-09-24 — role: Implementer · bloque 3, Vender: venta recogida, Deshacer, Vaciar, cantidad
  escrita, F2 y lector; botón «suave» con borde (1.03:1 sin él) · e2e 100/100.
- 2026-09-24 — role: Implementer · bloques 4 y 5, resto de pantallas y formularios
  - did: Productos con filtros en hoja/panel (radios en píldora, interruptor, «$» dentro); ficha y
    alta como panel en computador (`?ficha=`, `?nuevo=1`) y pantalla propia en celular; Corregir el
    conteo en hoja con motivos de un toque; categoría que sugiere; Ventas con atajos, rango y su
    suma; detalle y acceso. Reglas globales de campo y foco a `@layer base`
  - files: `catalogo/{page,lista,filtros}`, `catalogo/[id]/{page,ficha,ajuste,edicion}`,
    `catalogo/nuevo/*`, `ventas/*`, `acceso/*`, `src/ui/{campo,campo-categoria,opciones,…}`
  - checks: test 71/71, typecheck, lint; e2e 104/104 (3 capturas locales saltadas)
  - review: la ficha deja el historial antes que las acciones, como pide `T-013`, aunque
    `U-M-Ficha` las dibujó al revés. `aspecto.spec` mide el contenedor de un campo compuesto
  - blockers: ninguno
- 2026-09-24 — role: Implementer · verificación: capturas de 20 pantallas en dos temas junto a su
  artboard; arreglado Ventas a 360 px con una anulada (prueba nueva); e2e 104/104 en producción.
