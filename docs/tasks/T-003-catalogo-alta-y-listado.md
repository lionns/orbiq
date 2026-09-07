---
id: T-003
title: Catálogo — alta y listado de productos
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño da de alta un producto con nombre, precio, categoría opcional, existencias iniciales y código de barras opcional, y ve su catálogo. El alta con existencias escribe un movimiento en el libro.
decisions: [D-002, D-003]
implements: [FR-001, US-002, AC-003, AC-004, AC-005]
---

## Sources

- `docs/project/data-model.md` § product, § category, § stock_movement
- `docs/project/requirements.json` FR-001
- `docs/project/design-handoff.md` § Responsive Behavior, § Interaction States

## Scope

- Funciones de dominio: crear producto, editar producto, listar catálogo.
- El alta con existencias iniciales escribe un movimiento `initial`; el saldo nunca se escribe suelto.
- Pantalla de catálogo con búsqueda por nombre, y pantalla de alta.
- Estado vacío que ofrece dar de alta el primer producto, no una ilustración
  (`design-handoff.md` § Interaction States).
- Índice parcial de unicidad sobre `barcode`, si T-001 no lo dejó puesto.

## Out of Scope

- Escaneo de código de barras: el campo se teclea. El objetivo de escaneo es su propia tarea
  (`FR-002`, `FR-003`).
- Ajuste de existencias e historial (`FR-007`, `FR-008`).
- Carga masiva de catálogo (`brief.md` § Out of Scope).
- Administración de categorías: se eligen de las que existan, se crean con el producto.

## Acceptance Criteria

- [x] CUANDO se da de alta un producto con existencias iniciales EL SISTEMA DEBE escribir un
      movimiento `initial` por esa cantidad y dejar `product.stock` igual a la suma del libro (`AC-003`).
- [x] CUANDO se guarda un producto con un código de barras que ya tiene otro EL SISTEMA DEBE
      rechazarlo nombrando el producto existente (`AC-004`).
- [x] CUANDO se guardan dos productos sin código de barras EL SISTEMA DEBE aceptar ambos (`AC-005`).
- [x] CUANDO se guarda un producto con precio negativo EL SISTEMA DEBE rechazarlo
      (`data-model.md` § Validation Rules).
- [x] La pantalla de catálogo es operable a 360 px con una mano (`AC-X01`).
- [x] Una prueba de Playwright da de alta un producto y lo encuentra en el listado (`D-006`).

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: `e2e/catalogo.spec.ts` comprueba a 360 px que nada desborda de lado y que la
  acción vive fuera del tercio superior, con 48 px de alto. Queda **pendiente en un celular real**
  que el teclado no tape el campo activo: eso el emulador no lo puede decir.

## Assumptions

- **Asunción** — el precio se guarda como entero en la unidad mínima de la moneda. La moneda del
  primer cliente sigue sin nombrar (`data-model.md` § Open Questions).

## Risks

- Ninguno conocido. Es la rebanada más simple de la noche y por eso va antes que la venta.

## Outcome

- Changes: reglas puras del producto y del precio en `producto.ts` y `moneda.ts`; catálogo contra
  la base en `catalogo.ts`; pantallas de listado con búsqueda, estado vacío y alta; la portada pasa
  a usar las funciones de dominio y lleva al catálogo.
- Files: `src/domain/moneda.ts`, `src/domain/producto.ts`, `src/domain/producto.test.ts`,
  `src/domain/catalogo.ts`, `src/app/(protegido)/catalogo/**`, `src/app/(protegido)/page.tsx`,
  `e2e/catalogo.spec.ts`, `docs/project/data-model.md`
- Baseline result: `npm test` 11/11 · `typecheck` clean · `lint` clean · `harness-lint` clean.
- Final result: `npm test` 23/23 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e` 18/18
  contra Neon · `db:verify` 5/5. La base queda como estaba: cero productos, cero movimientos, cero
  categorías.
- Decisions recorded: ninguna nueva. `data-model.md` § Open Questions ahora dice qué se hizo
  mientras la moneda no tenga nombre — cero decimales, sin símbolo, sin factor — y cuál es la única
  parte de esa pregunta que costaría una migración.
- Follow-up: probar el alta en un celular real, que el emulador no cubre. Y nombrar la moneda.

## Review

- El saldo nunca se escribe suelto. El alta inserta el producto en cero, escribe el movimiento
  `initial` y recalcula `product.stock` con una subconsulta sobre el libro — el número no sale del
  formulario ni de la memoria del servidor, sale de `stock_movement` (`D-002`, `AC-003`).
- Hallazgo propio, corregido: `Intl` en español no agrupa los números de cuatro cifras, así que
  3500 salía «3500» y 12500 «12.500». En una lista de precios eso se lee peor, porque la vista busca
  el separador para estimar la magnitud. Ahora agrupa siempre, y hay una prueba que lo fija.
- Hallazgo propio, corregido: las pruebas se pisaban entre ellas. Comparten una sola base y corren
  en paralelo, y afirmaban sobre «todo el catálogo». Ahora cada corrida marca lo que crea, el
  listado se consulta filtrado, y la limpieza borra por marca — así una prueba que falla a la mitad
  tampoco deja basura para la siguiente.
- Rendija cerrada: entre comprobar el código de barras y escribirlo cabe otra alta con el mismo
  código. La restricción de la base ya lo impedía, pero salía como error 500; ahora se traduce al
  mismo mensaje. No tiene prueba porque no supe reproducir la carrera — queda dicho, no medido.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-06

## Trace

- `docs/traces/2026-09-06_T-003_implementer.md` 
