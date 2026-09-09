---
id: T-017
title: Buscar un producto por nombre durante la venta
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que el dueño cobre algo que no está en la cuadrícula y no trae código —granel, pan, huevos— sin salir de la venta. Hoy tiene que irse al catálogo, y al volver ha perdido lo que llevaba.
decisions: [D-001, D-009]
implements: [FR-015, US-016, AC-023, NFR-002]
---

## Sources

- `docs/project/requirements.json` — `FR-015`, `NFR-002`
- `docs/project/user-stories.json` — `US-016`
- `docs/project/acceptance-criteria.json` — `AC-023`
- `docs/project/brief.md` § Constraints — «una parte de lo que vende un negocio puede no tener
  código de barras — granel, pan, huevos»

## Scope

- Una función de dominio que resuelve **lo que el dueño escribe**, sea lo que sea: si es un código
  lo busca como código; si no, busca por nombre. Devuelve una de tres cosas —el producto, un código
  que nadie tiene, o una lista de resultados— y decide ella, no la pantalla (`D-001`).
- **El campo que ya existe**, no uno nuevo. La pantalla de venta tiene el del objetivo de escaneo;
  pasa a aceptar nombre o código, como el del catálogo. Dos cuadros que aceptan lo mismo en la
  misma pantalla no son una entrada más: son una duda, y eso ya costó una regresión en `T-016`.
- Los resultados salen **en lugar de** la cuadrícula de frecuentes, no encima: en un celular,
  añadirlos empujaría la cuadrícula fuera del pliegue. Se vuelve a los frecuentes al añadir uno o
  al vaciar el campo.
- Un resultado se toca y entra en la venta, igual que una casilla de la cuadrícula.
- Solo productos activos: un producto retirado no se vende (`T-012`).

## Out of Scope

- Buscar por categoría o por precio durante la venta. Para acotar así está el catálogo (`T-005`).
- Sugerencias mientras se teclea. Se busca al confirmar. Una petición por tecla contra datos
  móviles es lo contrario de `NFR-002`, y sin evidencia de que haga falta es adivinar.
- Cambiar la cuadrícula de frecuentes o su orden. Eso es `T-004` y sigue igual.
- Crear un producto desde un resultado vacío. El alta desde código desconocido ya existe
  (`T-016`); darla de alta desde un nombre es otra decisión.

## Acceptance Criteria

- [x] CUANDO el dueño escribe un nombre y confirma EL SISTEMA DEBE mostrar los productos que lo
      contienen sin recargar la pantalla y sin perder la venta en curso (`AC-023`).
- [x] CUANDO toca un resultado EL SISTEMA DEBE añadirlo a la venta y volver a mostrar la cuadrícula
      de frecuentes.
- [x] CUANDO lo que escribe es un código de barras válido EL SISTEMA DEBE seguir resolviéndolo como
      código, no buscarlo como nombre: las tres entradas de `AC-006` no cambian.
- [x] CUANDO no hay ningún producto que coincida EL SISTEMA DEBE decirlo, y la venta en curso sigue
      intacta.
- [x] Un producto desactivado no aparece entre los resultados.
- [x] A 360 px la cuadrícula no baja de sitio por existir la búsqueda, y el total sigue visible.
- [x] Las pruebas de `T-004` y `T-016` siguen pasando: escanear, tocar la cuadrícula y confirmar no
      cambian.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: registrar una venta de tres artículos, **uno de ellos encontrado por nombre**, y
  comprobar que cabe en los veinte segundos de `NFR-002`. Es el caso que la tarea existe para
  arreglar, y el que decide si buscar por nombre es un atajo o un desvío.

## Assumptions

- **Asunción** — buscar por trozo del nombre, sin acentos ni orden de palabras, alcanza para un
  catálogo de tienda de barrio. Si un negocio real llega con miles de productos y nombres parecidos,
  hará falta un índice de texto y eso es otra tarea.

## Risks

- El campo pasa a hacer dos cosas. Si al escribir un nombre el dueño espera escanear, o al revés, la
  pantalla se vuelve ambigua. La defensa es que la etiqueta lo diga —«Nombre o código»— y que el
  comportamiento sea el mismo que ya tiene el catálogo, no una convención nueva.
- Una búsqueda que devuelve medio catálogo es peor que ninguna. Se acota el número de resultados y
  se dice cuántos hay.

## Outcome

- Changes: `resolverEntradaDeVenta` decide en el dominio si lo escrito era código o nombre y
  resuelve las dos cosas en un solo viaje. El campo del objetivo de escaneo pasa a aceptar nombre o
  código en la venta, y los resultados sustituyen a la cuadrícula mientras duran.
- Files: `src/domain/venta.ts`, `src/app/(protegido)/acciones.ts`, `src/app/(protegido)/venta.tsx`,
  `src/ui/objetivo-de-escaneo.tsx`, `e2e/busqueda-en-venta.spec.ts`, `e2e/escaneo.spec.ts`
- Baseline result: `npm test` 65/65 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 65/65 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **84 pasan, 2 fallan**. Los dos son de `ventas.spec.ts` y **no son de esta
  tarea**: se comprobó guardando los cambios y corriéndolos sobre `HEAD`, donde fallan igual. Ver
  `## Review`.
- Decisions recorded: ninguna nueva.
- Follow-up: la tarea queda en `review` y no en `done` porque `test:e2e` es un control final y está
  en rojo. Lo que lo pone rojo es un defecto de zona horaria ajeno, que necesita su propia tarea.

## Review

- **La venta ya tenía un campo de texto, así que no se añadió otro.** `FR-015` pide «por nombre o
  código», y eso es un solo campo que acepta las dos cosas — como el del catálogo. Un segundo cuadro
  habría repetido el error que `T-016` ya pagó con una regresión de 64 px.
- **Un viaje al servidor, no dos.** Decidir en la pantalla si lo escrito era código obligaba a
  preguntar dos veces. `NFR-002` cuenta segundos, y la decisión es una regla de negocio: vive en el
  dominio (`D-001`).
- **El campo dejó de vaciarse solo al pulsar Enter.** Se descubrió escribiendo la prueba: «volver a
  los frecuentes vaciando el campo» era imposible porque no había nada que vaciar. Ahora el texto se
  queda, que además deja ver qué se buscó.
- **Tocar una casilla no muestra «Añadido».** Se intentó unificar los dos caminos del todo y el
  aviso empezó a salir también al tocar la cuadrícula, desplazándola bajo el dedo entre un toque y
  el siguiente. El aviso es para quien llega a ciegas —el que escanea—, no para quien ya vio qué
  tocó. Lo destaparon tres pruebas de `T-014`, no una revisión.
- **`T-016` fijaba que un código ilegible era un callejón sin salida.** Ese contrato cambió a
  propósito: ahora cae en la búsqueda. La prueba se reescribió para fijar el contrato nuevo, no para
  que dejara de molestar.
- `NFR-002` medido en la prueba, no estimado: la venta de tres artículos, uno encontrado por nombre,
  tarda **2,4 s** de los veinte. Es tiempo de máquina y no de persona, pero acota lo que aporta el
  sistema al presupuesto.

## Validation

- Validated by: 
- Date: 

## Trace

- `docs/traces/2026-09-08_T-017_implementer.md`
