---
id: T-005
title: Filtros y recorrido por partes del catálogo
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño acota el catálogo por categoría, estado de existencias y rango de precio, y lo recorre por partes con «Ver más» sin perder lo que ya vio. Todo el estado vive en la dirección, así que el enlace se comparte y la pantalla funciona sin JavaScript.
decisions: [D-001, D-003, D-007]
implements: [FR-011, US-012, AC-016, AC-017, AC-018, AC-X01]
---

## Sources

- `docs/project/requirements.json` FR-011, FR-010
- `docs/project/user-stories.json` US-012
- `docs/project/design-handoff.md` § Responsive Behavior, § Interaction States
- `docs/project/data-model.md` § product, § category, § Indexes

## Scope

- Filtros combinables por categoría, estado de existencias (agotado o negativo) y rango de precio.
- Recorrido por partes con «Ver más», que **suma** a lo ya visto en vez de reemplazarlo.
- Todo el estado en la dirección (`?q=`, `?categoria=`, `?existencias=`, `?desde=`, `?hasta=`,
  `?ver=`): el enlace se guarda, se comparte y sobrevive a una recarga (`AC-018`).
- Conteo de resultados, para que acotar diga cuánto acotó (`AC-016`).
- Índice sobre `product(name)`, que es por donde se ordena y se pagina siempre.
- Las reglas de lectura de los filtros, puras y probadas aparte del navegador (`D-001`).

## Out of Scope

- Ordenar por otra cosa que no sea el nombre. Entra cuando alguien lo pida.
- Guardar filtros favoritos o recordar el último usado.
- Filtrar por ausencia de código de barras: el estudio lo descartó para esta tanda; entra con el
  escaneo, que es cuando sirve para saber qué falta por codificar.
- Desplazamiento infinito. Se descartó: sin JavaScript no funciona y pierde el sitio al volver.

## Acceptance Criteria

- [x] CUANDO se combinan categoría, existencias y precio EL SISTEMA DEBE mostrar solo lo que cumple
      los tres a la vez y decir cuántos productos quedaron (`AC-016`).
- [x] CUANDO hay más productos de los que caben EL SISTEMA DEBE mostrar una parte y ofrecer ver
      más, sumando a lo ya visto sin perder filtros ni búsqueda (`AC-017`).
- [x] CUANDO ya no queda nada por mostrar EL SISTEMA DEBE dejar de ofrecer «Ver más».
- [x] CUANDO se recarga o se comparte la dirección EL SISTEMA DEBE mostrar exactamente lo mismo
      (`AC-018`).
- [x] CUANDO un filtro llega con un valor imposible EL SISTEMA DEBE ignorarlo en vez de fallar: una
      dirección escrita a mano no puede tumbar la pantalla.
- [x] La pantalla sigue siendo operable a 360 px con una mano, y los filtros no empujan la lista
      fuera del alcance del pulgar (`AC-X01`).
- [x] Una prueba de Playwright acota, recorre con «Ver más» y comprueba que lo ya visto sigue ahí.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: `npm run db:verify` sigue en verde, y la migración del índice se aplica sobre la
  base real con datos ya dentro — es la primera que no corre sobre una base vacía.

## Assumptions

- **Decidido con el estudio el 2026-09-06** — los filtros son categoría, estado de existencias y
  rango de precio; el recorrido es «Ver más» acumulando, no páginas numeradas ni infinito.
- **Asunción** — el tamaño de la tanda se fija en código; queda pendiente de validar con un dueño
  que tenga un catálogo largo de verdad.

## Risks

- ~~«Ver más» acumulando vuelve a consultar desde el principio en cada toque.~~ **Medido el
  2026-09-06, y el riesgo era menor de lo que parecía.** Con 5.017 productos en la base real: la
  primera tanda tarda 100 ms y el tope de 480 filas, 284 ms. El coste no crece con los toques
  porque el tope lo acota; lo único que recorre todo es el conteo, y a esa escala es barato. Con un
  catálogo de tienda de barrio no se nota. El cursor entra el día que alguien tenga decenas de
  miles de productos, no antes.
- Un `?ver=` escrito a mano puede pedir el catálogo entero. Se acota por arriba en `VER_MAXIMO`.

## Outcome

- Changes: lectura de filtros pura y tolerante en `filtros.ts`; `listarCatalogo` pasa a devolver
  página, total y si queda más; pantalla con filtros plegables y «Ver más»; índices sobre
  `product(name)` y `product(category_id)`.
- Files: `src/domain/filtros.ts`, `src/domain/filtros.test.ts`, `src/domain/catalogo.ts`,
  `src/db/schema.ts`, `drizzle/0002_spotty_hercules.sql`,
  `src/app/(protegido)/catalogo/page.tsx`, `src/app/(protegido)/catalogo/filtros.tsx`,
  `e2e/catalogo.spec.ts`, `docs/project/requirements.json`, `docs/project/user-stories.json`,
  `docs/project/acceptance-criteria.json`
- Baseline result: `npm test` 30/30 · `typecheck` clean · `lint` clean · `harness-lint` clean.
- Final result: `npm test` 42/42 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  34/34 contra Neon en tres corridas seguidas · `db:verify` 5/5. La migración `0002` se aplicó
  sobre la base real **con datos dentro** — la primera que no corre sobre una base vacía — y los
  17 productos quedaron intactos.
- Decisions recorded: ninguna nueva; ni los filtros ni el estilo de paginación son puertas —
  revertir cualquiera cuesta una tarde. Sí se registraron `FR-011`, `US-012` y `AC-016`…`AC-018`,
  que el brief no traía: los pidió el estudio hoy, y sin ellos el código no trazaría a nada.
- Follow-up: la tanda de 24 sigue siendo un valor fijado en código, pendiente de validar con un
  dueño que tenga un catálogo largo de verdad.

## Review

- Todo el estado vive en la dirección. Eso no es una preferencia estética: hace que el enlace se
  pueda guardar y compartir, que recargar no pierda nada, y que «Ver más» funcione sin JavaScript
  — es un enlace, no un botón. Hay una prueba de que lo que se escribe en la dirección se vuelve a
  leer idéntico.
- La lectura de filtros no lanza nunca. Una dirección la puede escribir cualquiera, y un catálogo
  que revienta con `?desde=hola` es un catálogo roto; un rango al revés se endereza en silencio en
  vez de devolver cero resultados sin explicación.
- Los filtros se traducen a SQL en una sola función, que usan tanto la lista como el conteo. Si
  estuvieran en dos sitios, el número de arriba y las filas de abajo podrían discrepar sin que
  nadie lo note.
- Hallazgo propio, corregido: el bloque de precio desbordaba la pantalla a 360 px — 426 px de
  ancho. La causa es el estilo de fábrica de `fieldset`, `min-inline-size: min-content`, que le
  impide encoger. Lo encontré midiendo cada elemento del DOM, no mirando el diseño.
- Hallazgo propio, corregido: la primera prueba de «Ver más» leía el conteo antes de que terminara
  la navegación y fallaba. El defecto era de la prueba, no del código.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-08
- Pendiente de tu firma, junto con `T-004`.

## Trace

- `docs/traces/2026-09-06_T-005_implementer.md`
