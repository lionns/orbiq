---
id: T-012
title: Editar y desactivar productos, con rastro de lo que cambió
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño corrige los datos de un producto y retira el que ya no vende, y las dos cosas quedan registradas donde ya mira: en el historial del producto, junto a sus movimientos.
decisions: [D-002, D-003]
implements: [FR-001, FR-013, FR-014, US-014, US-015, AC-021, AC-022]
---

## Sources

- `docs/project/data-model.md` § product, § Data Lifecycle
- `docs/project/requirements.json` FR-001, FR-013, FR-014
- Decisiones del estudio, 2026-09-07: desactivar y nunca borrar; registrar los cambios de precio

## Scope

- Tabla `product_event`: un registro inmutable de lo que le pasa a un producto que **no** son
  existencias. Tres tipos hoy — cambio de precio, desactivado, reactivado — y sitio para más sin
  tocar filas viejas, igual que `stock_movement` (`D-002`).
- Editar nombre, precio, categoría y código de barras.
- Desactivar y volver a activar. Nunca borrar (`data-model.md` § Data Lifecycle).
- El historial del producto pasa a ser **una sola línea de tiempo**: movimientos y eventos juntos,
  ordenados por fecha. Es donde el dueño ya mira.
- El catálogo puede mostrar los desactivados; por defecto no.

## Out of Scope

- Registrar cambios de nombre, categoría o código. El estudio eligió el precio: es lo único que
  afecta a la plata, y `sale_line` ya guarda lo que se cobró en cada venta.
- Borrado real. Descartado el 2026-09-07: rompería `D-002` y dejaría ventas apuntando a la nada.
- Editar el precio desde la pantalla de venta. Ahí se cobra, no se administra.

## Acceptance Criteria

- [x] CUANDO se cambia el precio EL SISTEMA DEBE registrar el anterior, el nuevo, quién y cuándo, y
      no tocar lo que ya se cobró (`AC-021`).
- [x] CUANDO se edita sin cambiar el precio EL SISTEMA no DEBE registrar ningún cambio de precio.
- [x] CUANDO se desactiva un producto EL SISTEMA DEBE sacarlo de la cuadrícula y del catálogo
      activo, y DEBE seguir nombrándolo en los movimientos y las ventas anteriores (`AC-022`).
- [x] CUANDO se reactiva EL SISTEMA DEBE devolverlo a la cuadrícula, y las dos cosas quedan en el
      historial.
- [x] CUANDO se edita con un código de barras que ya tiene otro producto EL SISTEMA DEBE rechazarlo
      nombrando al otro, igual que en el alta (`AC-004`).
- [x] El historial muestra movimientos y eventos en una sola línea de tiempo, por fecha.
- [x] Una venta anterior a la desactivación sigue mostrando el nombre del producto.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando, en verde, con las pruebas nuevas.
- Task-specific: la migración se aplica sobre la base **con los datos del demo dentro** y no se
  pierde ninguno.

## Assumptions

- **Asunción** — un producto desactivado no se puede vender ni tocar en la cuadrícula. Si alguien lo
  necesita para una venta atrasada, lo reactiva primero.

## Risks

- `product_event` es la segunda bitácora del esquema. El riesgo es que se convierta en un cajón de
  sastre: se acota a lo que no son existencias, y cada tipo nuevo entra nombrado.

## Outcome

- Changes: tabla `product_event` con tres tipos; `editarProducto` y `cambiarActivacion` en el
  dominio; la ficha del producto pasa a tener edición, retirada y **una sola línea de tiempo** con
  movimientos y eventos juntos; el catálogo puede incluir los retirados y los marca.
- Files: `src/db/schema.ts`, `drizzle/0003_ambiguous_thunderball.sql`, `src/domain/catalogo.ts`,
  `src/domain/producto.ts`, `src/domain/filtros.ts`, `src/domain/movimientos.ts`,
  `src/app/(protegido)/catalogo/[id]/*`, `src/app/(protegido)/catalogo/{page,filtros}.tsx`,
  `e2e/historial.spec.ts`, `e2e/aspecto.spec.ts`, `src/domain/filtros.test.ts`,
  `docs/project/data-model.md`
- Baseline result: `npm test` 48/48 · `typecheck` clean · `lint` clean · `test:e2e` 53/53.
- Final result: `npm test` **49/49** · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **58/58** · `db:verify` 5/5. La migración se aplicó sobre la base con los 17 productos y las 8
  ventas del demo dentro, sin perder nada.
- Decisions recorded: ninguna nueva. `data-model.md` recoge la tabla, su índice y la confirmación
  del estudio de que un producto no se borra nunca.
- Follow-up: ninguno abierto.

## Review

- `product_event` y no una tabla de precios: el estudio pidió registrar el precio, pero también que
  retirar un producto se viera en el historial. Una tabla llamada `price_change` no podría hacerlo,
  y dos tablas para dos bitácoras casi idénticas se acaban desviando. Un registro con tipo —la misma
  forma que `stock_movement`— cubre las tres cosas de hoy y admite más sin tocar filas viejas.
- La restricción que impide guardar un cambio de precio sin los dos precios, o un retiro **con**
  precios, vive en la base. La pantalla puede equivocarse; la tabla no.
- El historial es **una sola línea de tiempo**. El dueño no pregunta «qué dice el libro de
  existencias y qué la otra bitácora»: pregunta qué le pasó a este producto.
- La resolución de categoría estaba escrita dos veces —en el alta y ahora en la edición—. Se sacó a
  una función: dos copias idénticas de una regla acaban divergiendo, y esa divergencia sería un
  producto con la categoría equivocada.
- El contrato visual volvió a hacer su trabajo, esta vez con un falso positivo útil: marcó la casilla
  nueva por no tener borde ni relleno. El marco de una casilla lo dibuja el navegador, así que se
  excluyó del contrato — pero al mirarlo se vio que sí usaba el azul del navegador en vez de nuestro
  acento, que en tema oscuro canta. Eso sí era real y se arregló.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-08
- Pendiente de tu firma, junto con `T-004`…`T-008`, `T-010` y `T-011`.

## Trace

- `docs/traces/2026-09-07_T-012_implementer.md`
