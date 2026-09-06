---
id: T-004
title: Registro de venta desde la cuadrícula de frecuentes
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: El dueño arma una venta tocando productos en una cuadrícula, ve el total todo el tiempo, y confirma. Confirmar descuenta existencias en una sola transacción y reintentar no cobra dos veces.
decisions: [D-001, D-002, D-005, D-006]
implements: [FR-004, FR-005, US-005, US-006, NFR-002, NFR-003, NFR-004, AC-008, AC-009, AC-010, AC-015, AC-X01]
---

## Sources

- `docs/project/data-model.md` § sale, § sale_line, § stock_movement
- `docs/project/requirements.json` FR-004, FR-005, NFR-002
- `docs/project/design-handoff.md` § Responsive Behavior, § Interaction States, § Motion
- `docs/decisions/D-005-deploy-un-despliegue-por-negocio.md`

## Scope

- Función de dominio `registrarVenta`: crea venta, líneas y un movimiento negativo por producto,
  **todo en una transacción o nada** (`AC-008`).
- Idempotencia: el identificador de venta se genera en el cliente antes de enviar; el mismo
  identificador devuelve la venta existente sin descontar de nuevo (`AC-010`).
- Cada línea copia el precio vigente al vender (`AC-009`).
- Pantalla de venta: cuadrícula de frecuentes, venta en curso, barra fija abajo con el total y
  "Confirmar" (`design-handoff.md` § Responsive Behavior).
- La cuadrícula se deriva de las ventas recientes; no se guarda una lista de favoritos.
- Fallo de red: dice de forma inequívoca que **no** se guardó y ofrece reintentar (`AC-015`).

## Out of Scope

- Escaneo de código de barras. Se toca desde la cuadrícula y se busca por nombre (`FR-002`).
- Anulación de venta (`FR-006`, tarea aparte).
- Medios de pago, vuelto, factura, impuestos (`brief.md` § Out of Scope).
- Impedir la venta cuando el stock es cero: se permite y queda negativo
  (`data-model.md` § Open Questions).

## Acceptance Criteria

- [ ] CUANDO se confirma una venta EL SISTEMA DEBE crear venta, líneas y movimientos dentro de una
      sola transacción, o no crear nada (`AC-008`).
- [ ] CUANDO se confirma una venta EL SISTEMA DEBE copiar el precio vigente en cada línea, de modo
      que cambiarlo después no altere el total ya cobrado (`AC-009`).
- [ ] CUANDO se envía dos veces una venta con el mismo identificador EL SISTEMA DEBE devolver la
      venta ya registrada, sin crear una segunda ni descontar de nuevo (`AC-010`).
- [ ] CUANDO el servidor no responde al confirmar EL SISTEMA DEBE decir que no se guardó y ofrecer
      reintentar, sin aparentar éxito (`AC-015`).
- [ ] CUANDO se confirma una venta EL SISTEMA DEBE dejar la pantalla lista para la siguiente sin un
      diálogo que haya que cerrar (`design-handoff.md` § Interaction States).
- [ ] El total es visible en todo momento mientras se arma la venta, a 360 px (`AC-X01`).
- [ ] Ninguna acción del flujo de venta vive en el tercio superior de la pantalla en celular
      (`NFR-003`).
- [ ] Una prueba de Playwright arma una venta de tres artículos, la confirma, y comprueba que las
      existencias de los tres bajaron y que el libro tiene un movimiento por cada uno (`D-006`).
- [ ] Una prueba de dominio envía la misma venta dos veces y comprueba que las existencias bajaron
      una sola vez (`AC-010`).

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: **cronometrar en un celular real** una venta de tres artículos, uno sin código.
  `NFR-002` pide menos de veinte segundos, y ese criterio no se puede verificar leyendo un diff.

## Assumptions

- **Asunción** — la cuadrícula muestra los productos más vendidos recientemente. La ventana y la
  cantidad de casillas siguen sin definir (`data-model.md` § Open Questions); para esta tarea se fija
  un valor y se anota como pendiente de validar con el dueño.
- **Asunción** — el stock puede quedar negativo. Se muestra en rojo, no se impide.

## Risks

- Es la rebanada donde `NFR-002` se gana o se pierde, y es lo único de la noche que no se puede
  comprobar con una prueba automática: hay que cronometrarlo.
- El arranque en frío de Vercel puede empujar la primera venta por encima de los veinte segundos.
  Está anotado en `architecture.md` § Known Constraints y aquí es donde se mide de verdad.

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
