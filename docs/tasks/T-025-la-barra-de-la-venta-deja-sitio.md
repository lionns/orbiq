---
id: T-025
title: La barra de la venta deja sitio a la cuadrícula
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que en un teléfono real se llegue al último producto de la cuadrícula con el carrito lleno. La barra del total reservaba exactamente lo que medía, así que la última fila quedaba a cero píxeles del borde: en el navegador de prueba cuadraba y en un teléfono de verdad quedaba debajo.
decisions: [D-007]
implements: [NFR-003, AC-X01]
---

## Sources

- Reporte del estudio, 2026-09-14: «no deja hacer scroll hasta el final, y cuando se agregan
  productos al carrito se vuelve peor»
- `docs/tasks/T-023-la-venta-con-identidad-y-jerarquia.md` — el arreglo anterior, que igualó los dos
  números pero sin holgura
- Medidas a 360×740, 360×640 y 360×560, con carrito vacío y con catorce artículos

## Scope

- **Holgura entre la cuadrícula y la barra.** Reservar exactamente lo que mide la barra deja cero
  píxeles de margen; basta que el navegador del teléfono encoja lo visible para que la última fila
  quede debajo.
- **Tope proporcional y no fijo.** 18 rem en una pantalla de 740 px es cómodo; en una de 560 son
  más de la mitad y la cuadrícula se queda sin sitio.
- El tope se dice **una sola vez**, en un token, y de ahí salen el alto de la barra y el hueco.

## Out of Scope

- Cambiar la cuadrícula, el carrito o lo que hacen. Esto es sitio en pantalla, nada más.
- Rehacer el desplazamiento con una columna flexible que llene la ventana. Quitaría el acoplamiento
  del todo, pero cambia el contenedor que scrollea y alcanza a toda la suite. Si esto vuelve a
  aparecer, es la salida siguiente.

## Acceptance Criteria

- [x] CUANDO el carrito tiene catorce artículos y la pantalla mide 560 px de alto EL SISTEMA DEBE
      dejar al menos 16 px entre la última casilla y la barra.
- [x] La barra nunca ocupa la mitad o más de la pantalla.
- [x] El tope aparece escrito una sola vez; el hueco se deriva de él.
- [x] Las pruebas de `T-004`, `T-017` y `T-023` siguen pasando sin tocarlas.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: medir la holgura a 740, 640 y 560 px de alto con el carrito lleno, y comprobar que
  la prueba endurecida **cae** con el código anterior. Sin eso, «está arreglado» es una suposición.

## Assumptions

- Ninguna.

## Risks

- `dvh` no lo entienden los navegadores muy viejos; ahí `min()` se queda con los 18 rem, que es el
  comportamiento de antes. Degrada, no falla.

## Outcome

- Changes: `--alto-barra-venta: min(18rem, 42dvh)` en `globals.css`. La barra lo usa de tope y la
  cuadrícula reserva ese valor **más 2 rem** de holgura. La prueba de `T-023` pasa a exigir margen
  en vez de contacto, y a medir en una pantalla de 560.
- Files: `src/app/globals.css`, `src/app/(protegido)/venta.tsx`, `e2e/venta.spec.ts`
- Baseline result: `npm test` 69/69 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: el mismo comando en verde · `test:e2e` **92/92**.
- Decisions recorded: ninguna nueva.
- Follow-up: ninguno propio.

## Review

- **Medido a tres alturas, antes y después.** Con el carrito lleno la holgura pasa de **0 px** a
  **32 px** en 740, 640 y 560. En la pantalla de 560 la barra baja de 288 px (51 % de la pantalla)
  a 235 (42 %).
- **La prueba endurecida cae con el código anterior dando `Received: 0`**, que es exactamente el
  diagnóstico: contacto al ras, no solapamiento. Por eso el arreglo de `T-023` parecía correcto en
  el navegador de prueba y fallaba en un teléfono.
- **En Chromium nunca se reprodujo**, ni a 560 px. Lo que delató el defecto fue medir la holgura en
  vez de comprobar solo que no hubiera solapamiento — el reporte del estudio decía dónde mirar y la
  prueba decía verde.
- **Basura mía en la base, y conviene decirlo:** una de las reproducciones se pasó de tiempo en el
  sembrado y su limpieza también falló, dejando 61 productos y 2 dueños huérfanos que rompieron las
  pruebas del catálogo. Se borraron. Es el mismo riesgo del que avisa el defecto de aislamiento, y
  esta vez lo causé yo.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-14_T-025_implementer.md`
