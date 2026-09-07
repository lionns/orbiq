---
id: T-011
title: Historial de movimientos por producto y ajuste de existencias
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño abre un producto y ve todos los movimientos que llevaron a sus existencias actuales, y corrige el conteo explicando por qué. Es la pantalla que hace visible el libro de D-002 — hasta hoy el libro existía y nadie podía verlo.
decisions: [D-002, D-001]
implements: [FR-007, FR-008, US-008, US-009, AC-013, AC-014, NFR-005]
---

## Sources

- `docs/project/data-model.md` § stock_movement, § Data Lifecycle
- `docs/project/requirements.json` FR-007, FR-008
- `docs/decisions/D-002-data-libro-inmutable.md`

## Scope

- Pantalla de un producto: sus datos y su historial completo de movimientos.
- Cada movimiento con su tipo, cantidad con signo, motivo, quién y cuándo (`AC-014`).
- El saldo mostrado se recomputa desde el libro y se contrasta con `product.stock` (`NFR-005`).
- Ajuste manual con motivo obligatorio, que escribe un movimiento `adjustment` (`FR-007`, `AC-013`).
- Entrada desde el catálogo: tocar un producto abre su historial.

## Out of Scope

- Editar el producto o desactivarlo. Es `T-012`.
- Anular ventas desde aquí. El movimiento enlaza a su venta, pero anular es `T-013`.
- Paginar el historial. Un producto con miles de movimientos es un problema que todavía no existe;
  se anota el número a partir del cual haría falta.

## Acceptance Criteria

- [x] CUANDO se abre el historial de un producto EL SISTEMA DEBE listar sus movimientos con tipo,
      cantidad, motivo y fecha, y la suma DEBE coincidir con las existencias mostradas (`AC-014`).
- [x] CUANDO el saldo materializado y el libro no coinciden EL SISTEMA DEBE decirlo en la pantalla
      en vez de mostrar un número y callarse (`NFR-005`, `D-002`).
- [x] CUANDO se envía un ajuste sin motivo EL SISTEMA DEBE rechazarlo y no escribir nada (`AC-013`).
- [x] CUANDO se registra un ajuste EL SISTEMA DEBE escribir un movimiento `adjustment` y recalcular
      el saldo desde el libro, no sumar al número anterior.
- [x] Un movimiento de venta enlaza a la venta que lo produjo.
- [x] La pantalla se opera a 360 px y su acción vive fuera del tercio superior (`AC-X01`).
- [x] Una prueba recorre alta → venta → ajuste y comprueba que el historial cuenta esa misma
      historia, en orden y con la suma cuadrando.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando, en verde, con las pruebas nuevas.
- Task-specific: `npm run db:verify`, que ya ejerce `AC-013` contra la base real, sigue en verde.

## Assumptions

- **Asunción** — el historial se muestra entero, del más reciente al más antiguo. Sin paginar hasta
  que un producto real pase de unos cientos de movimientos.

## Risks

- Es la primera pantalla que le enseña el libro al dueño. Si el saldo mostrado y la suma no cuadran,
  la aplicación pierde la credibilidad que `D-002` existe para dar — por eso la discrepancia se
  muestra, no se esconde.

## Outcome

- Changes: `libroDelProducto` y `ajustarExistencias` en el dominio; pantalla `/catalogo/[id]` con el
  historial completo, el aviso de discrepancia y el formulario de ajuste; el catálogo lleva a ella.
  El contrato visual pasa a marcar las tarjetas con `data-tarjeta` en vez de adivinar la etiqueta.
- Files: `src/domain/movimientos.ts`, `src/app/(protegido)/catalogo/[id]/*`,
  `src/app/(protegido)/catalogo/page.tsx`, `src/app/(protegido)/venta.tsx`,
  `e2e/historial.spec.ts`, `e2e/aspecto.spec.ts`
- Baseline result: `npm test` 48/48 · `typecheck` clean · `lint` clean · `test:e2e` 47/47.
- Final result: `npm test` 48/48 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **53/53** · `db:verify` 5/5.
- Decisions recorded: ninguna nueva.
- Follow-up: enlazar cada movimiento de venta con su venta, cuando `T-013` cree esa pantalla.
  Y paginar el historial si algún producto real pasa de unos cientos de movimientos.

## Review

- **La prueba encontró un error de diseño de los caros, y no uno de escritura.** `ajustarExistencias`
  calculaba la diferencia contra `product.stock`, la copia. Mientras copia y libro coinciden da lo
  mismo; deja de darlo justo cuando más importa. Con la copia desviada a 50 y el libro en 8, contar
  8 escribía un movimiento de −42 y dejaba el libro en −34: el ajuste **propagaba** el error en vez
  de corregirlo. Ahora la diferencia se calcula contra el libro, que es lo que `D-002` dice que
  manda.
- Y apareció un tercer caso que no había contemplado: si el conteo ya coincide con el libro pero la
  copia se desvió, no hay nada que registrar —no pasó nada en el mundo— pero sí hay que reparar la
  copia. Rechazarlo dejaba al dueño mirando un aviso que no podía quitar.
- El ajuste pide **lo que se contó**, no la diferencia. El dueño cuenta unidades en el estante;
  hacerle calcular «+3 o −2» es pedirle una resta con alguien esperando.
- La discrepancia entre copia y libro se muestra, no se esconde. Un número que no cuadra y se calla
  es peor que uno que no cuadra y lo avisa: es lo único que hace que `D-002` sirva de garantía.
- El contrato visual de `T-010` cazó una regresión mía a los diez minutos de existir: al mover el
  estilo de la tarjeta del `<li>` al `<a>` de dentro, quedó midiendo un elemento sin estilo. Se
  arregló marcando las tarjetas con `data-tarjeta` en vez de deducirlas del marcado.

## Validation

- Validated by: 
- Date: 
- Pendiente de tu firma, junto con `T-004`…`T-008` y `T-010`.

## Trace

- `docs/traces/2026-09-07_T-011_implementer.md`
