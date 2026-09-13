---
id: T-018
title: La cuadrícula no decide si la prueba pasa
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que `venta.spec.ts` deje de depender de que un producto recién sembrado quepa en las 24 casillas de la cuadrícula. Hoy la prueba del saldo negativo pasa sola y falla con la suite completa, que es la peor forma de fallar: la próxima vez que se ponga roja de verdad, nadie va a creerle.
decisions: [D-006]
implements: [AC-X05, NFR-006]
---

## Sources

- `e2e/venta.spec.ts:181` — «vender más de lo que hay se permite y el saldo queda negativo»
- `e2e/venta.spec.ts:193` — la prueba vecina, que ya documentó y sorteó este mismo obstáculo
- `src/domain/venta.ts:40` § `cuadricula` — ordena por lo más vendido y corta en `CASILLAS`
- `docs/tasks/T-014-historial-de-ventas.md` § Outcome — la tarea que hizo que la cuadrícula
  ordenara de verdad

## Scope

- La prueba del saldo negativo llega a la casilla **vendiendo**, que es como se llega en la vida
  real y como ya lo resuelve la prueba de al lado. Deja de suponer que un producto sin ventas
  aparece en la cuadrícula.
- Se comprueba que la casilla existe **antes** de tocarla, para que el fallo diga «no está en la
  cuadrícula» y no «expiraron 30 segundos esperando un clic».

## Out of Scope

- Cambiar `cuadricula`, su orden o su límite de 24. El comportamiento es correcto y es el de
  `T-004`/`T-014`: la prueba estaba mal, no la pantalla.
- Aislar la base por archivo de prueba o serializar la suite. Compartir base es deliberado
  (`D-006`: la prueba corre contra datos reales) y el costo de aislarla no lo paga este defecto.
- Revisar el resto de la suite en busca de la misma fragilidad. Si aparece otra, es otra tarea:
  esta arregla la que está roja.

## Acceptance Criteria

- [x] CUANDO la suite completa corre en paralelo EL SISTEMA DEBE pasar `venta.spec.ts` entero,
      incluida la prueba del saldo negativo.
- [x] CUANDO el producto no estuviera en la cuadrícula EL SISTEMA DEBE fallar nombrando esa causa,
      no agotando el tiempo de espera de un clic.
- [x] La prueba sigue comprobando lo mismo que comprobaba: vender tres unidades de algo que tiene
      una deja el saldo en `-2`, y la aplicación lo permite.
- [x] `npm run test:e2e` queda en verde entero, no solo el archivo tocado.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: correr la suite completa dos veces seguidas. Un fallo que depende de lo que haya
  en la base no se descarta con una sola pasada verde.

## Assumptions

- Ninguna.

## Risks

- Sembrar con ventas cambia lo que la prueba mide si se hace de más: el saldo final tiene que
  seguir saliendo del camino por pantalla, no del sembrado. Se fija comprobando el `-2` exacto.

## Outcome

- Changes: la prueba del saldo negativo llega a su única unidad vendiendo treinta de treinta y una,
  no sembrando una sola. Así entra en la cuadrícula por donde la cuadrícula ordena —lo más
  vendido— en vez de confiar en que quepa alfabéticamente entre los productos sin ventas. Se
  comprueba que la casilla está antes de tocarla.
- Files: `e2e/venta.spec.ts`
- Baseline result: `npm test` 65/65 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 65/65 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **86/86 en dos pasadas seguidas**.
- Decisions recorded: ninguna nueva.
- Follow-up: ninguno de esta tarea.

## Review

- **El defecto era de la prueba, no de la pantalla.** Se comprobó antes de tocar nada: la prueba
  pasa aislada (`-g "vender más de lo que hay"`) y falla con la suite entera. Lo que cambia entre
  las dos corridas no es el código, es cuántos productos vendidos hay en la base cuando se mira la
  cuadrícula. Cambiar `cuadricula` para que la prueba pasara habría sido romper `T-004` y `T-014`
  para tapar esto.
- **Sembrar treinta y una unidades y vender treinta no es un rodeo.** Es el único camino que deja
  las dos cosas que la prueba necesita a la vez: existencias en uno, y ventas recientes suficientes
  para estar entre las veinticuatro casillas. La prueba de al lado ya había llegado a la misma
  forma por el mismo motivo, y ahora las dos lo dicen igual.
- **La comprobación previa al clic no es decorativa.** El fallo original decía «expiraron 30
  segundos esperando un clic», que no nombra la causa y cuesta una tarde. Ahora diría «se esperaba
  1 casilla, se recibieron 0», que la nombra.
- **Dos pasadas, no una.** Un fallo que depende del estado acumulado de la base no se descarta con
  un verde: la primera pasada deja datos que la segunda encuentra. Las dos en 86/86.
- No se tocó ningún archivo de `src/`. El árbol de la aplicación queda idéntico.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-13

## Trace

- `docs/traces/2026-09-13_T-018_implementer.md`
