---
id: T-027
title: El total no se va de la pantalla en computador
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que el total y el botón de confirmar estén a la vista mientras se cobra, también en computador y con el carrito largo. Hoy la columna de la venta no tiene tope de alto, así que con veinte productos mide 1447 px, y en una pantalla de 900 el total cae en y=1344: fuera de la vista, y `sticky` no lo salva porque la tarjeta es más alta que la ventana.
decisions: [D-007]
implements: [NFR-003, AC-X01]
---

## Sources

- Pregunta del estudio, 2026-09-14: «¿el total y el botón no deberían estar en el top del todo para
  tenerlo siempre visible?» — la observación es correcta; el sitio, decidido abajo
- Medidas propias con veinte productos en el carrito a 1280×900, 1440×800 y 1366×768
- `src/app/(protegido)/venta.tsx:240` — el comentario que afirma «el total no se pierde de vista en
  ningún tamaño», falso desde que existe la columna
- Decisión de forma del estudio, 2026-09-14: tope de pantalla con el total abajo, no el total arriba

## Scope

- **Tope de alto para la columna de computador**, como el que la barra del celular ya tiene. La
  lista se desplaza por dentro y el total con su botón quedan clavados abajo, siempre a la vista.
- Corregir el comentario que afirmaba lo que no era.
- Prueba que mide, con el carrito más largo que la pantalla, que el total y el botón siguen dentro
  de la ventana sin desplazar la página.

## Out of Scope

- Mover el total arriba de la lista. Se consideró y se descartó: invierte el orden de lectura
  respecto al celular y deja dos lecturas distintas de la misma pantalla (`AC-X01`).
- La barra del celular, que ya tiene su tope desde `T-025` y no presenta el defecto.

## Acceptance Criteria

- [x] CUANDO el carrito tiene veinte productos y la pantalla mide 1280×900 EL SISTEMA DEBE mostrar
      el total y el botón de confirmar enteros dentro de la ventana, sin desplazar la página.
- [x] Lo mismo en 1366×768, que es el portátil corriente.
- [x] La columna nunca es más alta que la ventana, y la lista se desplaza por dentro.
- [x] Las pruebas de `T-004`, `T-023`, `T-025` y `T-026` siguen pasando sin tocarlas.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: comprobar que la prueba nueva **cae** con el código anterior, y mirar la columna
  con el carrito largo en los dos temas.

## Assumptions

- Ninguna.

## Risks

- `dvh` otra vez: donde no se entienda, el tope no se aplica y la columna se comporta como hoy.
  Degrada al defecto actual, no a uno peor.

## Outcome

- Changes: la columna de computador recibe el tope que le faltaba —la ventana menos los 16 px de
  `top-4` arriba y otros tantos abajo—, así que la lista se desplaza por dentro y el total con su
  botón se quedan abajo, a la vista. El comentario que afirmaba lo contrario, corregido. Prueba
  nueva con veinte productos en el carrito a 1280×900 y 1366×768.
- Files: `src/app/(protegido)/venta.tsx`, `e2e/venta.spec.ts`
- Baseline result: `npm test` 69/69 · `harness-lint` limpio · `typecheck` limpio · `lint` limpio ·
  `build` ok.
- Final result: el mismo comando en verde · `test:e2e` **94/94** (93 antes, más la nueva).
- Decisions recorded: ninguna nueva. La forma —tope con el total abajo, y no el total arriba de la
  lista— la eligió el estudio el 2026-09-14.
- Follow-up: ninguno propio.

## Review

- **Medido con veinte productos, antes y después.** La tarjeta medía 1447 px en las tres pantallas
  probadas —no dependía de la pantalla, sino de no tener tope— y en 1280×900 el total caía en
  y=1344: ni el total ni el botón quedaban dentro de la ventana en 1280×900, 1440×800 ni 1366×768.
  Ahora la columna nunca pasa del alto de la ventana y los dos quedan enteros dentro.
- **La prueba nueva cae con el código anterior** con `a 1280×900 el total no cabe en la ventana`.
- **El celular no tenía el defecto** y no se tocó: su barra va fija abajo con el tope de `T-025`.
  Lo que faltaba era el tope gemelo del otro tamaño; ahora son dos, uno por tamaño, y el comentario
  dice por qué cada uno.
- **Por qué no arriba, que es lo que se preguntó:** el total encima de la lista también se vería
  siempre, pero invierte el orden de lectura respecto al celular y deja dos lecturas distintas de
  la misma pantalla, que es justo lo que `AC-X01` evita. Con tope se consigue lo mismo sin partir
  la pantalla en dos diseños.
- **La suite final corrió contra el servidor de desarrollo del puerto 3000**, que es lo que
  `reuseExistingServer` permite; `npm run build` se verificó aparte, en verde.

## Validation

- Validated by: Juan Leon
- Date: 24/09/2026

## Trace

- `docs/traces/2026-09-14_T-027_implementer.md`
