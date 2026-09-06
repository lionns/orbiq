---
id: T-003
title: Catálogo — alta y listado de productos
status: ready
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

- [ ] CUANDO se da de alta un producto con existencias iniciales EL SISTEMA DEBE escribir un
      movimiento `initial` por esa cantidad y dejar `product.stock` igual a la suma del libro (`AC-003`).
- [ ] CUANDO se guarda un producto con un código de barras que ya tiene otro EL SISTEMA DEBE
      rechazarlo nombrando el producto existente (`AC-004`).
- [ ] CUANDO se guardan dos productos sin código de barras EL SISTEMA DEBE aceptar ambos (`AC-005`).
- [ ] CUANDO se guarda un producto con precio negativo EL SISTEMA DEBE rechazarlo
      (`data-model.md` § Validation Rules).
- [ ] La pantalla de catálogo es operable a 360 px con una mano (`AC-X01`).
- [ ] Una prueba de Playwright da de alta un producto y lo encuentra en el listado (`D-006`).

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: dar de alta un producto desde un celular real y confirmar que el teclado no tapa el
  campo activo.

## Assumptions

- **Asunción** — el precio se guarda como entero en la unidad mínima de la moneda. La moneda del
  primer cliente sigue sin nombrar (`data-model.md` § Open Questions).

## Risks

- Ninguno conocido. Es la rebanada más simple de la noche y por eso va antes que la venta.

## Outcome

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- 

## Validation

- Validated by: 
- Date: 

## Trace

- 
