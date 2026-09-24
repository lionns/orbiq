---
id: T-028
title: "Backend: lo que la portada y el deshacer necesitan del dominio"
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: Que el servidor dé en una sola llamada lo que la portada nueva enseña (lo vendido hoy, las últimas ventas y lo que hay que reponer), que la lista de ventas sume su rango, y que una venta recién cobrada se pueda deshacer desde la misma pantalla de venta.
decisions: [D-001, D-002, D-006]
implements: [FR-006, US-007, US-013, AC-011, AC-012]
---

## Sources

- `.diseno/cobalto/README.md` y sus artboards: `U-M-Inicio`, `U-D-Inicio`, `U-M-Cobrada`, `W-Ventas`
- `src/domain/venta.ts` (`ventasPorDia`, `anularVenta`) y `src/domain/catalogo.ts` (`listarCatalogo`)
- `src/domain/filtros.ts` — los estados de existencias que ya entiende la dirección
- Todo lo necesario está en el repositorio: la tarea no depende de nada que se haya dicho fuera de él.

## Scope

Solo dominio, acciones de servidor y sus pruebas. **Ninguna pantalla**: eso es `T-029`.

- **Resumen del día**, una función de dominio para la portada: total cobrado hoy y número de ventas
  (las anuladas no suman), las cuatro últimas ventas con hora, artículos, total y si están anuladas,
  y los productos activos con existencias en cero o por debajo (cuántos y los tres primeros). «Hoy»
  es el día del negocio, con la misma regla que `T-019`.
- **Un estado de existencias nuevo, «por reponer»** (existencias ≤ 0), que la dirección del catálogo
  acepta como los otros. Hoy «agotados» es solo `= 0` y «En negativo» es `< 0`: la tarjeta
  «Agotados» de la portada cuenta los dos, y su enlace tiene que mostrar los mismos productos que
  cuenta.
- **Resumen del rango** en Ventas: total, número de ventas y cuántas anuladas, con el mismo rango
  de fechas que ya lee la página.
- **Acción `deshacerVenta(ventaId)`**, llamable desde el cliente, que reusa `anularVenta` tal cual:
  misma guardia de sesión, mismo registro en el libro, mismas rutas revalidadas. El id ya lo tiene
  el cliente, porque lo genera él para la idempotencia (`FR-005`). No es una anulación distinta:
  es la misma, sin pasar por el historial.

## Out of Scope

- Cualquier cambio de aspecto, de navegación o de texto visible. Todo eso es `T-029`.
- Un plazo para deshacer impuesto por el servidor. El aviso desaparece en la pantalla; después,
  anular sigue funcionando igual que hoy desde el detalle de la venta.
- El carrito que no se pierde: vive en el dispositivo y es de `T-029`.
- Alertas de «se está acabando». No hay umbral decidido y no se inventa uno.

## Acceptance Criteria

- [ ] CUANDO hoy hay cuatro ventas y una está anulada EL SISTEMA DEBE devolver en el resumen del día
      el total y el número de las tres válidas, y las cuatro en las últimas ventas, la anulada marcada.
- [ ] CUANDO una venta se registra a las nueve de la noche en la zona del negocio EL SISTEMA DEBE
      contarla en el resumen de ese día y no en el del siguiente.
- [ ] CUANDO hay un producto en 0, otro en -2 y uno retirado en -1 EL SISTEMA DEBE contar dos por
      reponer, y el filtro «por reponer» del catálogo debe listar esos mismos dos.
- [ ] CUANDO se pide el resumen de un rango EL SISTEMA DEBE devolver la misma suma que dan los días
      de `ventasPorDia` para ese rango, sin contar las anuladas.
- [ ] CUANDO se llama `deshacerVenta` sobre una venta recién registrada EL SISTEMA DEBE dejarla
      anulada, devolver las existencias y registrar el movimiento igual que la anulación del detalle.
- [ ] CUANDO se llama `deshacerVenta` sin sesión, o sobre una venta ya anulada, EL SISTEMA DEBE
      rechazarlo sin tocar el libro.
- [ ] CUANDO se deshace una venta desde la pantalla de venta EL SISTEMA DEBE sacarla del resumen del
      día y de la lista de ventas en la siguiente carga (prueba e2e que registra, deshace y comprueba).

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando, con `node scripts/harness-status.mjs` antes del lint, más `npm run test:e2e`
- Task-specific: las pruebas de dominio corren también con `TZ=Asia/Tokyo` y `TZ=UTC`, como en `T-019`

## Assumptions

- Suposición: «las cuatro últimas» y «los tres primeros» son los números de los artboards. Si
  `T-029` necesita otros, basta con un parámetro, no con otra consulta.

## Risks

- El resumen del día no puede ser una segunda forma de calcular el día. Tiene que salir del mismo
  corte que usa `ventasPorDia`, o un día el Inicio y Ventas dirán totales distintos.

## Outcome

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/` al empezar
