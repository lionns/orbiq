---
id: T-019
title: El día de una venta lo decide el negocio, no el servidor
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que una venta de las nueve de la noche aparezca en el cierre de caja de ese día y no en el del siguiente. Hoy el corte del día lo pone la zona de la base (UTC) mientras la hora de cada venta se escribe en la del servidor, así que las últimas cinco horas de cada jornada se listan bajo el día equivocado con su hora correcta al lado.
decisions: [D-005]
implements: [FR-013, US-013, AC-018, AC-019]
---

## Sources

- `src/domain/venta.ts:238` § `ventasPorDia` — agrupa con `to_char` y acota con `new Date(...)`
- `docs/project/data-model.md:111` § `sale` — `created_at` es `timestamptz`: el instante guardado es correcto
- `docs/project/architecture.md:115` § Moneda — el precedente: un despliegue por negocio es una
  moneda por base, así que vive en un módulo del dominio y no en el esquema (`D-005`)
- `docs/tasks/T-017-buscar-durante-la-venta.md` § Outcome — el defecto quedó anotado ahí como
  trabajo pendiente ajeno a esa tarea

## Scope

- **Una zona horaria del negocio, escrita una sola vez** en el dominio, junto al mismo argumento
  que ya fijó la moneda: un despliegue por negocio es una zona por base (`D-005`).
- `ventasPorDia` agrupa y acota en esa zona, no en la de la sesión de Postgres ni en la del proceso
  que renderiza. Los dos extremos del rango son medianoche y medianoche del negocio.
- Las tres pantallas que escriben una fecha o una hora la escriben en esa zona: el historial de
  ventas, el detalle de una venta y el historial de un producto.
- Una prueba que fija el corte con **un instante concreto**, no con `now()`: tiene que dar lo mismo
  corrida a las nueve de la mañana que a las once de la noche.

## Out of Scope

- Guardar la zona por negocio en la base o en una variable de entorno. Sería inventar un mecanismo
  de configuración que nadie ha pedido, y contradiría el argumento de la moneda (`D-005`). Cuando
  un negocio de otra zona llegue, es cambiar una constante — el mismo trabajo que cambiar de
  moneda.
- Cambiar el tipo de `created_at` o tocar el esquema. `timestamptz` guarda el instante correcto:
  el defecto está en cómo se lee, no en lo que hay guardado.
- Revisar el resto de las pantallas en busca de fechas. Las que escriben una son estas tres, y se
  comprobó con `grep`; si aparece otra, entra por la misma constante.

## Acceptance Criteria

- [x] CUANDO una venta ocurre a las 21:30 del día del negocio —02:30 UTC del día siguiente— EL
      SISTEMA DEBE listarla bajo el día del negocio, no bajo el de UTC.
- [x] CUANDO el dueño acota el rango a ese día EL SISTEMA DEBE incluir esa venta, y EL SISTEMA DEBE
      excluirla cuando acota al día siguiente (`AC-018`).
- [x] CUANDO se muestra la hora de una venta EL SISTEMA DEBE mostrar la del negocio, de modo que el
      encabezado del día y la hora de sus filas no puedan referirse a días distintos.
- [x] El total de un día sigue siendo exactamente la suma de las ventas no anuladas que se listan
      bajo él (`AC-019`).
- [x] La prueba que fija el corte usa un instante fijo, así que su resultado no depende de la hora a
      la que se corra la suite.
- [x] Las pruebas de `T-014` siguen pasando sin tocarlas más que en su noción de «hoy».

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: correr la suite con el proceso en otra zona —`TZ=Asia/Tokyo npm run test:e2e`— y
  obtener el mismo resultado. Es la comprobación que separa «arreglado» de «arreglado en esta
  máquina»: el servidor de producción no corre en la zona del dueño.

## Assumptions

- **Asunción** — el primer cliente y los siguientes operan en `America/Bogota`, que es la zona que
  ya asume la moneda y el `locale` de todas las pantallas. Un negocio en otra zona es cambiar la
  constante; varios negocios en zonas distintas sobre la misma base es multi-tenancy, y eso lo
  gobierna `D-005`.

## Risks

- Acotar el rango con una expresión sobre la columna dejaría fuera al índice `sale_created_at_idx`.
  Se evita convirtiendo los extremos y no la columna: la comparación sigue siendo contra un instante
  y el índice sigue sirviendo.
- Cambiar el corte mueve ventas ya registradas de un día a otro en la pantalla. Es el arreglo, no un
  efecto secundario, pero conviene decirlo: un cierre de caja impreso antes de este cambio puede no
  cuadrar con el que se vea después.

## Outcome

- Changes: `zona.ts` fija la zona del negocio junto al mismo argumento que ya fijó la moneda.
  `ventasPorDia` agrupa con `timezone(zona, created_at)` y acota entre las dos medianoches del
  negocio —la de `hasta` exclusiva, del día siguiente, que además cierra el hueco del último
  milisegundo que dejaba `23:59:59.999`—. Las tres pantallas que escriben fecha u hora la fijan en
  esa zona; el encabezado del día se ancla a mediodía UTC porque ya es una fecha, no un instante.
- Files: `src/domain/{zona.ts,zona.test.ts,venta.ts}`, `src/app/(protegido)/ventas/page.tsx`,
  `src/app/(protegido)/ventas/[id]/page.tsx`, `src/app/(protegido)/catalogo/[id]/page.tsx`,
  `e2e/ventas.spec.ts`, `docs/project/architecture.md`
- Baseline result: `npm test` 65/65 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 69/69 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **87/87**, y 87/87 otra vez con `TZ=Asia/Tokyo` y con `TZ=UTC`.
- Decisions recorded: ninguna nueva. La zona sigue el precedente escrito de la moneda en
  `architecture.md` § Security, y ahí queda documentada junto a ella.
- Follow-up: `aspecto.spec.ts` falló una vez y no se reprodujo. Ver `## Review`.

## Review

- **Tres relojes en una sola pantalla, y ninguno era el del negocio.** El corte del día lo ponía
  `to_char` en la zona de la sesión de Postgres (UTC en Neon); la hora de cada venta, `Intl` en la
  del proceso; y el rango, `new Date("…T00:00:00")` en la del proceso otra vez. Una venta de las
  21:30 en Bogotá se listaba bajo el día siguiente con «9:30 p. m.» al lado. El defecto no estaba
  en lo guardado: `timestamptz` tiene el instante correcto, y por eso no hizo falta migración.
- **Los `::text` y el `::int` de `medianoche` no son ruido defensivo.** La primera versión sin ellos
  rompía la consulta entera: un parámetro llega a Postgres sin tipo y `$1::date + $2` no resuelve a
  ningún operador. Se descubrió porque cuatro pruebas de `T-014` se pusieron rojas a la vez, y se
  confirmó consultando la base directamente antes de tocar nada más.
- **Se convierten los extremos, no la columna.** Envolver `created_at` en una expresión habría
  dejado fuera a `sale_created_at_idx`. Comprobado con `explain` y `enable_seqscan = off`: el plan
  entra como `Index Cond`, no como filtro posterior. Con once filas el planificador elige recorrido
  secuencial de todas formas, así que lo que la prueba fija es la forma, que es lo que importa el
  día que haya volumen.
- **La prueba es red, no adorno.** Se devolvió `to_char` a su forma anterior y la prueba nueva
  falló; se restauró y volvió a pasar. Sin esa comprobación, «la prueba cubre el caso» habría sido
  una suposición.
- **Instantes fijos y no `now()`.** Una prueba de fechas que dependa de la hora a la que se corra
  reproduce el defecto que vino a quitar: `ventas.spec.ts` usaba `toISOString()` para saber qué día
  era, y por eso se caía sola cada tarde a partir de las siete. Ahora pregunta lo mismo que
  pregunta la pantalla.
- **`aspecto.spec.ts` § tema oscuro falló una vez, en la primera pasada completa tras el cambio.**
  No se reprodujo en ocho pasadas posteriores: cuatro con el cambio, tres sobre `HEAD` sin él, y
  una por cada zona. Esa prueba no abre ninguna pantalla que esta tarea toque. Queda como hallazgo
  abierto sin tarea —la evidencia no alcanza para escribir uno— y es de la misma familia que
  `T-018`: suite en paralelo contra una sola base.
- Lo que este cambio mueve, y conviene decirlo: ventas ya registradas entre las 19:00 y la
  medianoche cambian de día en la pantalla. Es el arreglo, pero un cierre de caja impreso antes de
  hoy puede no cuadrar con el que se vea después.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-13_T-019_implementer.md`
