---
id: T-035
title: Anular en palabras de tienda, y el negocio se llama Lumy Bella
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que los tres mensajes de anular una venta se entiendan sin saber qué son «existencias», y que la tienda de Tienda Miriam se vea con su nombre, Lumy Bella.
decisions: [D-005]
implements: [FR-006, AC-011]
---

## Sources

- Pedido del cliente, transmitido por el estudio el 2026-09-27: «el mensaje al anular es confuso»,
  y el negocio cambia de nombre. Textos y alcance elegidos por el estudio ese día.

## Scope

- Antes de anular: «Los productos vuelven a lo que hay y la venta deja de contar en el total del día.»
- Después: «Venta anulada. Los productos volvieron a lo que hay y ya no suma en el total del día.»
  y, aparte, «Se anuló el …» — la fecha termina en «p. m.» y el punto de la frase salía doble.
- Al deshacer un cobro: «Esos productos volvieron a la venta para que la corrijas o la vacíes.»
- `NEGOCIO_NOMBRE` de `tienda-miriam` pasa a «Lumy Bella». El entorno y la dirección no cambian.

## Out of Scope

- Cambiar la dirección o el Worker: el cliente reinstalaría el ícono y volvería a entrar.

## Acceptance Criteria

- [x] CUANDO se anula una venta EL SISTEMA DEBE decirlo sin «existencias» ni «no se borró», y sin
      «p. m..» (`e2e/ventas.spec.ts`).
- [x] CUANDO se deshace un cobro EL SISTEMA DEBE decir que los productos volvieron a la venta.
- [x] El despliegue de `tienda-miriam` muestra «Lumy Bella» en Acceso, Inicio y el menú.

## Verification

- Final: `npm test`, `typecheck`, `lint`, `harness-lint` y los e2e de ventas y venta, en el puerto
  3100 contra Postgres local.

## Assumptions

- None

## Risks

- None

## Outcome

- Changes: los tres textos de anular en palabras de tienda, la fecha de la anulación aparte, y
  «Lumy Bella» como nombre visible del entorno `tienda-miriam`.
- Files: `src/app/(protegido)/{ventas/[id]/page.tsx,venta.tsx}`, `wrangler.jsonc`, `README.md`,
  `e2e/{ventas,venta}.spec.ts`
- Baseline result: el cierre de `T-034` (96/96, e2e 115/115).
- Final result: `npm test` 96/96 · `typecheck`, `lint`, `harness-lint` limpios · e2e de ventas y
  venta 26/26 en el puerto 3100.
- Decisions recorded: ninguna.
- Follow-up: el nombre se ve al desplegar `tienda-miriam`.

## Review

- Baja · el texto viejo ya dejaba «p. m..» al terminar la fecha en punto; lo fija la prueba.
