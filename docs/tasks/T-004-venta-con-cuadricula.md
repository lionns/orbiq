---
id: T-004
title: Registro de venta desde la cuadrícula de frecuentes
status: done
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

- [x] CUANDO se confirma una venta EL SISTEMA DEBE crear venta, líneas y movimientos dentro de una
      sola transacción, o no crear nada (`AC-008`).
- [x] CUANDO se confirma una venta EL SISTEMA DEBE copiar el precio vigente en cada línea, de modo
      que cambiarlo después no altere el total ya cobrado (`AC-009`).
- [x] CUANDO se envía dos veces una venta con el mismo identificador EL SISTEMA DEBE devolver la
      venta ya registrada, sin crear una segunda ni descontar de nuevo (`AC-010`).
- [x] CUANDO el servidor no responde al confirmar EL SISTEMA DEBE decir que no se guardó y ofrecer
      reintentar, sin aparentar éxito (`AC-015`).
- [x] CUANDO se confirma una venta EL SISTEMA DEBE dejar la pantalla lista para la siguiente sin un
      diálogo que haya que cerrar (`design-handoff.md` § Interaction States).
- [x] El total es visible en todo momento mientras se arma la venta, a 360 px (`AC-X01`).
- [x] Ninguna acción del flujo de venta vive en el tercio superior de la pantalla en celular
      (`NFR-003`).
- [x] Una prueba de Playwright arma una venta de tres artículos, la confirma, y comprueba que las
      existencias de los tres bajaron y que el libro tiene un movimiento por cada uno (`D-006`).
- [x] Una prueba de dominio envía la misma venta dos veces y comprueba que las existencias bajaron
      una sola vez (`AC-010`).

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && node scripts/harness-lint.mjs`
- Final: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e && node scripts/harness-status.mjs && node scripts/harness-lint.mjs`
- Task-specific: **cronometrar en un celular real** una venta de tres artículos, uno sin código.
  `NFR-002` pide menos de veinte segundos, y ese criterio no se puede verificar leyendo un diff.

## Assumptions

- **Decidido con el estudio el 2026-09-06** — la cuadrícula muestra los más vendidos recientemente
  y, mientras no haya historial, **el catálogo entero ordenado por nombre**. Una tienda nueva la ve
  llena desde el primer día sin administrar favoritos (`data-model.md` § Open Questions).
- **Decidido con el estudio el 2026-09-06** — el stock puede quedar negativo. Se muestra en rojo, no
  se impide: la aplicación registra lo que pasó, no decide lo que se puede vender.
- **Asunción** — la ventana de «reciente» y el número de casillas se fijan en código; siguen
  pendientes de validar con un dueño usándolo de verdad.

## Risks

- Es la rebanada donde `NFR-002` se gana o se pierde, y es lo único de la noche que no se puede
  comprobar con una prueba automática: hay que cronometrarlo.
- El arranque en frío de Vercel puede empujar la primera venta por encima de los veinte segundos.
  Está anotado en `architecture.md` § Known Constraints y aquí es donde se mide de verdad.

## Outcome

- Changes: `carrito.ts` con la aritmética de la venta en curso, pura y probada aparte;
  `venta.ts` con `registrarVenta` idempotente y transaccional y la cuadrícula derivada de las
  ventas recientes; la venta pasa a ser la portada; navegación entre vender y catálogo. Fuera del
  alcance original pero necesario para el demo: `scripts/sembrar-demo.mts`.
- Files: `src/domain/carrito.ts`, `src/domain/carrito.test.ts`, `src/domain/venta.ts`,
  `src/app/(protegido)/page.tsx`, `src/app/(protegido)/venta.tsx`,
  `src/app/(protegido)/acciones.ts`, `src/app/(protegido)/layout.tsx`, `e2e/venta.spec.ts`,
  `e2e/apoyo.ts`, `scripts/sembrar-demo.mts`, `docs/project/data-model.md`
- Baseline result: `npm test` 24/24 · `typecheck` clean · `lint` clean · `harness-lint` clean.
- Final result: `npm test` 30/30 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  25/25 contra Neon, tres corridas seguidas sin un solo fallo intermitente · `db:verify` 5/5.
- Decisions recorded: ninguna nueva. Se cerraron con el estudio las dos preguntas de producto que
  esta tarea traía como supuestos: el stock puede quedar negativo, y la cuadrícula es el catálogo
  mientras no haya historial. Las dos quedan en `data-model.md` § Open Questions.
- Follow-up: **cronometrar una venta de tres artículos en un celular real** — `NFR-002` pide menos
  de veinte segundos y ese criterio no se puede verificar leyendo un diff ni con un emulador. Y la
  ventana de «reciente» (30 días) y el número de casillas (24) siguen siendo valores fijados en
  código, pendientes de validar con un dueño usándolo de verdad.

## Review

- La idempotencia no se apoya en que la pantalla se porte bien. El identificador de venta se genera
  antes de enviar y se conserva mientras el envío falle, así que reintentar es el mismo envío; y si
  dos llegan a la vez, uno choca contra la clave primaria y se traduce en devolver la venta que ya
  existe (`AC-010`). La prueba llama al dominio directamente porque por la pantalla no se puede
  provocar el segundo envío con el mismo identificador.
- El saldo se recalcula desde el libro dentro de la transacción, no se resta a lo que había. Dos
  ventas simultáneas del mismo producto no se pisan: cada una suma su movimiento y el saldo se
  vuelve a leer entero (`D-002`).
- El precio de la línea se lee del catálogo en el servidor al confirmar, no de lo que mandó la
  pantalla. Un cliente que mienta sobre el precio no cambia lo que se cobra (`AC-009`).
- Hallazgo propio, corregido: la suite se volvió intermitente al crecer. Cada prueba iniciaba
  sesión y cada inicio corre scrypt, que es caro **a propósito**; cuatro trabajadores en paralelo
  contra un solo servidor Node desbordaban el tiempo de espera. Ahora se inicia sesión una vez por
  trabajador y se reparte la cookie — que además se parece más a la verdad, porque un dueño inicia
  sesión una vez al mes y no una vez por acción. Las pruebas del ciclo de vida de la sesión
  conservan su propio inicio por pantalla, porque cerrar sesión invalidaría la cookie compartida.
- Sin medir: `NFR-002`. Es el único criterio de la noche que necesita un cronómetro y un pulgar.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-08
- Pendiente de tu firma.

## Trace

- `docs/traces/2026-09-06_T-004_implementer.md` 
