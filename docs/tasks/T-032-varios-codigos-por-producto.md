---
id: T-032
title: Varios códigos por producto, con la cantidad separada por código
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que cuando el proveedor cambie el código de un producto que ya se vende, el dueño lo añada a ese producto desde el mismo escaneo, en vez de darlo de alta dos veces. Cada código lleva su cantidad, y la suma es la del producto.
decisions: [D-002, D-010]
implements: [FR-016, FR-003, FR-007, FR-008, AC-004, AC-007, AC-013, AC-014, AC-025, AC-026, AC-027]
---

## Sources

- `.diseno/codigos/` — `Main`, `Elegir`, `Confirmar`, `Vendiendo`, `Ficha`, `Nuevo` y § Lo que se
  decidió al validarlo, puntos 1 a 5
- `D-010`, `D-002` · `docs/project/data-model.md` § product_barcode, § stock_movement

## Scope

- Esquema: `product_barcode` (id, producto, código único, fecha); `stock_movement.barcode_id`; tipo
  de movimiento `purchase`. Migración que pasa cada `product.barcode` a su primer código, completa
  `barcode_id` en los movimientos de ese producto y quita `product.barcode`.
- Dominio: resolver un código a producto **y** código; crear con código; añadir un código con las
  unidades que llegaron; corregir el número de un código; cantidad por código desde el libro;
  vender descontando del código escaneado o, sin él, del más antiguo con unidades; anular
  devolviendo a cada código lo que salió de él; corregir el conteo de un código.
- Escaneo desconocido, en la venta y en Productos: dos salidas — añadir a un producto existente
  (buscar, elegir, cuántas llegaron) o producto nuevo (con «¿Cuántas hay?»).
- Ficha: «Por código» con la cantidad de cada uno, «Añadir otro código», corregir un número; el
  historial dice el código de cada movimiento; el conteo pide el código cuando hay más de uno.
- Editar los datos deja de tener el campo de código: los códigos viven en «Por código».
- Scripts que leen `product.barcode` (`sembrar-demo`, `hoja-de-codigos`, `verificar-esquema`).

## Out of Scope

- Precio distinto por código. Varios códigos son el mismo producto (`D-010`).
- Quitar un código: sus movimientos lo nombran. Se corrige el número, no se borra.
- Registrar compras sin código nuevo. `purchase` nace aquí, pero su pantalla propia es otra tarea.
- La cuadrícula de Vender: es `T-033`.

## Acceptance Criteria

- [x] CUANDO se escanea un código desconocido EL SISTEMA DEBE ofrecer «Ya lo vendo, cambió el
      código» y «Es un producto nuevo», sin perder la venta en curso (`AC-025`).
- [x] CUANDO se añade un código con N unidades EL SISTEMA DEBE escribir un `purchase` de N con ese
      código, y la cantidad del código y la del producto DEBEN ser la suma del libro (`AC-026`).
- [x] CUANDO se escanea un código de otro producto EL SISTEMA DEBE rechazarlo nombrando al producto
      que ya lo tiene (`AC-004`).
- [x] CUANDO se vende escaneando EL SISTEMA DEBE descontar de ese código; sin escanear, del más
      antiguo con unidades, repartiendo si no alcanza (`AC-027`).
- [x] CUANDO se anula una venta EL SISTEMA DEBE devolver a cada código lo que salió de él.
- [x] CUANDO se corrige el conteo de un código EL SISTEMA DEBE escribir la diferencia contra el libro
      de ese código, con motivo (`AC-013`).
- [x] La migración, aplicada a una base con productos, ventas y ajustes, deja el total de cada
      producto igual al de antes y la suma de sus códigos igual al total.
- [x] Las pruebas de escaneo, venta, anulación e historial de antes siguen pasando.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: `npm test && node scripts/harness-status.mjs && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Todo contra un Postgres local en Docker, nunca contra Neon (pedido del estudio, 2026-09-27).
- Task-specific: migrar una base local sembrada con la versión anterior y comparar totales antes y
  después, producto por producto.

## Assumptions

- **Asunción** — el grupo «sin código» es el más antiguo de un producto: existía antes que
  cualquier código añadido después.
- **Asunción** — lo vendido sin escanear que ya no cabe en ningún código se descuenta del más
  reciente: es el que está en el estante.

## Risks

- La migración toca la base del cliente. Se prueba en local contra datos con la forma de los suyos,
  y se aplica a Tienda Miriam solo cuando el estudio lo pida.
- Dos ventas simultáneas sin escanear pueden elegir el mismo código. El saldo puede quedar negativo,
  que ya está permitido (`data-model.md` § Open Questions).

## Outcome

- Changes: `product_barcode` con varios códigos por producto; `stock_movement.barcode_id`; tipo
  `purchase`. La venta descuenta del código escaneado o, sin él, del más antiguo con unidades; la
  anulación devuelve a cada código lo suyo; el conteo se corrige por código. Código desconocido:
  «Ya lo vendo, cambió el código» o «Es un producto nuevo», en la venta y en Productos. La ficha
  enseña «Por código», añade códigos y el historial dice el código de cada movimiento.
- Files: `drizzle/0004_codigos_por_producto.sql`, `src/db/schema.ts`,
  `src/domain/{codigos,codigos.test,catalogo,movimientos,venta,carrito,carrito.test,producto,producto.test}.ts`,
  `src/app/(protegido)/{acciones.ts,codigo-desconocido.tsx,venta.tsx,venta-guardada.ts}`,
  `src/app/(protegido)/catalogo/{buscador-por-codigo.tsx,codigo/*,[id]/*}`, `src/ui/iconos.tsx`,
  `scripts/{sembrar-demo,hoja-de-codigos,verificar-esquema}.mts`, `e2e/codigos.spec.ts`, `e2e/*`,
  `docs/project/{data-model.md,requirements.json,acceptance-criteria.json}`, `D-010`, `.diseno/codigos/`
- Baseline result: `npm test` 71/71 · `harness-lint`, `typecheck`, `lint` limpios · `test:e2e`
  104/107, con `cobalto.spec:139` fallando siempre (ver Review).
- Final result: `npm test` **89/89** · `harness-lint`, `typecheck`, `lint` limpios · `build` ok ·
  `db:verify` 5/5 · `test:e2e` 108–109/111 en paralelo; las que caen son las intermitentes de
  antes y pasan todas con un proceso (13/13). Todo contra Postgres 17 en Docker, nunca Neon.
- Migración: aplicada a una base sembrada con el esquema anterior (16 productos, ventas, una
  anulación, dos ajustes): total de cada producto idéntico antes y después, y la suma de sus
  códigos igual al total. **No aplicada a Tienda Miriam.**
- Decisions recorded: `D-010`.
- Follow-up: aplicar `0004` y desplegar Tienda Miriam cuando el estudio lo pida.

## Review

- Alta · `e2e/readme.local.spec.ts` · la prueba de capturas del README no se salta como las otras
  locales: cada `test:e2e` reescribía `docs/capturas/`. La línea base las sobrescribió; se
  restauraron con `git checkout` y la suite se corre con `--grep-invert capturas`.
- Media · `e2e/escaneo.spec.ts:60,142`, `busqueda-en-venta.spec.ts:102`,
  `escaneo-camara.spec.ts:34` · intermitentes bajo carga en paralelo. Medido: el código de HEAD
  falla igual (3/20 en escaneo); con un proceso pasan todas. El lector exige < 50 ms entre teclas.
- Media · `e2e/cobalto.spec.ts:139` · abría «el primero del catálogo»; falla en base vacía o si el
  primero no cuadra. Arreglado sembrando su producto.
- Baja · la ficha no ofrece la cámara para «Añadir otro código»: el objetivo escucha al lector en
  todo el documento y le robaría lecturas al buscador de Productos. El lector y el tecleado sí.
