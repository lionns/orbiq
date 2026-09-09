---
id: T-014
title: Historial de ventas, con detalle y anulación
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño ve las ventas de un día con su total, abre una para ver qué llevaba y a cuánto, busca por rango de fechas y anula la que registró por error. Es lo que se mira al cerrar la caja.
decisions: [D-002, D-001]
implements: [FR-006, FR-012, US-007, US-013, AC-011, AC-012, AC-019, AC-020, AC-024]
---

## Sources

- `docs/project/data-model.md` § sale, § sale_line, § stock_movement, § Data Lifecycle
- `docs/project/requirements.json` FR-006, FR-012
- Decisiones del estudio, 2026-09-07

## Scope

- `/ventas`: las ventas agrupadas por día, cada una con su hora y su total, y el total del día.
- Rango de fechas en la dirección, como los filtros del catálogo (`AC-018`).
- `/ventas/[id]`: las líneas con la cantidad y el precio que se cobró.
- Anular desde el detalle: marca la venta, escribe movimientos `sale_void` que devuelven exactamente
  lo vendido, y no toca ni borra los movimientos originales (`AC-011`, `D-002`).
- Una venta anulada no suma al total del día y se ve como anulada (`AC-019`).
- El historial del producto pasa a enlazar cada movimiento de venta con su venta.

## Out of Scope

- Anular una línea suelta. Se anula la venta entera; media anulación es un ajuste.
- Exportar o imprimir. Entra cuando alguien lo pida.
- Reimprimir un recibo: no hay recibos (`brief.md` § Out of Scope).

## Acceptance Criteria

- [x] CUANDO se abre el historial de ventas EL SISTEMA DEBE agrupar por día con el total del día, y
      una venta anulada DEBE verse como anulada y no sumar (`AC-019`).
- [x] CUANDO se abre una venta EL SISTEMA DEBE mostrar sus líneas con la cantidad y el precio que se
      cobró, aunque el precio del producto haya cambiado después (`AC-020`).
- [x] CUANDO se anula una venta EL SISTEMA DEBE escribir movimientos `sale_void` por exactamente las
      cantidades vendidas, sin borrar ni editar los originales (`AC-011`).
- [x] CUANDO se intenta anular una venta ya anulada EL SISTEMA DEBE rechazarlo y dejar las
      existencias intactas (`AC-012`).
- [x] CUANDO se anula EL SISTEMA DEBE recalcular las existencias desde el libro, no sumar al número
      anterior.
- [x] El rango de fechas vive en la dirección: recargar o compartir el enlace muestra lo mismo.
- [x] Desde el historial de un producto se llega a la venta que produjo cada movimiento.
- [x] La pantalla se opera a 360 px y la acción de anular no está en el tercio superior.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando en verde.
- Task-specific: `npm run db:verify` sigue en verde; su comprobación de que un movimiento de venta
  exige su venta cubre también los de anulación.

## Assumptions

- **Asunción** — el día se agrupa por la zona horaria del servidor. Con un despliegue por negocio
  (`D-005`) eso es el día del negocio; con varios husos habría que nombrarlo.

## Risks

- Anular es la primera operación que **deshace** algo. La garantía es que no deshace escribiendo
  encima: escribe movimientos nuevos que compensan, y los viejos siguen ahí (`D-002`).

## Outcome

- Changes: `/ventas` con las ventas agrupadas por día y su total, rango de fechas en la dirección;
  `/ventas/[id]` con las líneas al precio cobrado y la anulación plegada; `anularVenta` en el
  dominio; el historial del producto vuelve a enlazar cada movimiento con su venta; «Ventas» entra
  en la navegación. **Y se corrigió un defecto latente en la cuadrícula de venta** (ver Review).
- Files: `src/domain/venta.ts`, `src/app/(protegido)/ventas/**`,
  `src/app/(protegido)/catalogo/[id]/page.tsx`, `src/app/(protegido)/layout.tsx`,
  `src/ui/cifras.tsx`, `e2e/ventas.spec.ts`, `e2e/venta.spec.ts`, `e2e/historial.spec.ts`
- Baseline result: `npm test` 49/49 · `typecheck` clean · `lint` clean · `test:e2e` 61/61.
- Final result: `npm test` 49/49 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **70/70** en tres corridas seguidas · `db:verify` 5/5.
- Decisions recorded: ninguna nueva.
- Follow-up: ninguno abierto.

## Review

- **La cuadrícula de venta nunca ordenó por lo más vendido, desde `T-004`.** Salió al escribir la
  consulta del historial, que usaba el mismo patrón. Drizzle **no cualifica** los nombres de columna
  dentro de una plantilla `sql` en un `select`: emitía `where "product_id" = "id"`, y ahí `"id"` se
  ata a `sale_line.id`, no a `product.id`. La comparación no acertaba nunca, así que la cuadrícula
  ordenaba todo por cero y luego por nombre. Con el catálogo sembrado en orden alfabético el
  resultado parecía razonable — por eso pasó desapercibido durante cuatro tareas.
- En un `update` **sí** cualifica (`"stock_movement"."product_id" = "product"."id"`), que es la
  razón de que el saldo del libro siempre estuviera bien. Se comprobó imprimiendo el SQL de los
  cuatro sitios donde uso ese patrón, no razonando sobre cuál estaría bien.
- Las dos consultas pasan a usar uniones de verdad con `groupBy`. Ya no hay correlación escrita a
  mano en ningún `select`, que es el patrón que se prestaba al error.
- Anular no deshace: compensa. Escribe movimientos `sale_void` por exactamente lo vendido y deja
  los originales donde estaban. El registro de que se vendió y se anuló es parte de la historia
  (`D-002`).
- Dos pruebas mías comparaban el total del día antes y después de anular. La base es una sola y
  otras pruebas registran ventas del mismo día en paralelo, así que la resta estaba condenada a
  fallar sin que nada estuviera mal. Ahora comprueban la **invariante** —el total del día es la suma
  de sus ventas no anuladas—, que además es la propiedad que de verdad importa.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-08
- Pendiente de tu firma, junto con `T-004`…`T-008` y `T-010`…`T-013`.

## Trace

- `docs/traces/2026-09-07_T-014_implementer.md`
