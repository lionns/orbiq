---
id: T-026
title: El total y el botón dejan de pelear por la misma línea
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que el botón de confirmar esté siempre dentro de la barra, con cualquier importe y en cualquier ancho. Hoy el total y el botón comparten una línea que no siempre alcanza: con seis cifras el número empuja al botón fuera de la barra —29 px en computador, 20 px a 360 px de ancho— y en computador además saca una barra de desplazamiento horizontal a toda la página.
decisions: [D-007]
implements: [NFR-003, AC-X01]
---

## Sources

- Reporte del estudio, 2026-09-14, con captura: «tenemos problemas con este botón al agregar muchos
  productos en la versión de PC» — el botón sobresale del borde redondeado de la columna
- Medidas propias a 360, 412, 1024, 1280 y 1440 px con un total de `$ 139.232`
- `docs/project/acceptance-criteria.json` § AC-X01 — 360 px, y el mismo código para computador
- Decisión de forma del estudio, 2026-09-14: apilar siempre, en los dos tamaños

## Scope

- **La fila del total deja de ser una fila.** El total arriba y el botón debajo, a todo el ancho de
  la barra, en teléfono y en computador por igual.
- El botón deja de poder empujar nada fuera de la barra: su caja ya no compite por el ancho.
- Prueba que mide el desborde en los dos extremos —360 px y computador— porque hoy la suite entera
  corre a 412 px, que es justo el ancho donde el defecto no aparece.

## Out of Scope

- El tamaño del total, la paleta, los iconos y el resto de la barra. El número sigue midiendo lo
  que mide: encogerlo era la otra salida y se descartó, porque es lo que se mira al cobrar.
- Añadir un proyecto de escritorio a Playwright. La suite sigue siendo de celular y las pruebas de
  ancho fijan su tamaño ellas mismas, como ya hace `aspecto.spec.ts`.

## Acceptance Criteria

- [x] CUANDO el carrito suma un total de seis cifras EL SISTEMA DEBE mantener el botón dentro de la
      barra a 360, 412, 1024, 1280 y 1440 px de ancho.
- [x] CUANDO la pantalla mide 1024 px EL SISTEMA DEBE no producir desplazamiento horizontal de la
      página.
- [x] La barra sigue cumpliendo lo de `T-025`: con el carrito lleno queda holgura entre la última
      casilla y la barra, y la barra no ocupa media pantalla.
- [x] Las pruebas de `T-004`, `T-017`, `T-023` y `T-025` siguen pasando sin tocarlas.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: comprobar que la prueba nueva **cae** con el código anterior, y mirar la barra en
  los dos temas a 360 px y a 1280 px.

## Assumptions

- Ninguna.

## Risks

- La barra apilada es más alta, así que en un teléfono corto la lista del carrito muestra una línea
  menos. El tope de la barra no cambia, así que la cuadrícula no pierde sitio.

## Outcome

- Changes: la fila del total pasa a columna — el total arriba y `Confirmar` a todo el ancho de la
  barra, en teléfono y en computador por igual. El botón ya no compite por el ancho con un número
  que no se encoge ni se parte, así que no puede empujar nada fuera. Prueba nueva que mide el
  desborde a 360, 1024 y 1440 px con un total de seis cifras.
- Files: `src/app/(protegido)/venta.tsx`, `e2e/venta.spec.ts`
- Baseline result: `npm test` 69/69 · `harness-lint` limpio · `typecheck` limpio · `lint` limpio ·
  `build` ok.
- Final result: el mismo comando en verde · `test:e2e` **93/93** (92 antes, más la nueva).
- Decisions recorded: ninguna nueva. La forma —apilar siempre, no solo donde no cabe— la eligió el
  estudio el 2026-09-14 sobre tres opciones medidas.
- Follow-up: ninguno propio. Queda dicho abajo que la suite mide un solo ancho.

## Review

- **Medido a cinco anchos, antes y después.** El botón sobresalía **29 px** de la columna a 1024,
  1280 y 1440, y **20 px** a 360. Ahora queda 16–17 px dentro en los cinco, que es el relleno de la
  barra. A 1024 la página además ensanchaba a 1053 px de `scrollWidth`; ahora es 1024 exacto.
- **La prueba nueva cae con el código anterior** con `a 360 px el botón se sale 20 px`, que es el
  diagnóstico literal.
- **Por qué pasó, y es lo que importa:** toda la suite corre a 412 px —el Pixel 7 del proyecto de
  Playwright— y a ese ancho el botón entra por 16 px. El ancho difícil no es el celular: la columna
  de computador mide 352 px, menos que casi cualquier teléfono. `AC-X01` promete los dos extremos y
  solo se probaba el del medio. Esta prueba fija su propio tamaño; **el resto de la suite sigue
  midiendo un solo ancho**, y ese es el hueco de fondo.
- **Costo aceptado:** la barra apilada es ~60 px más alta, así que en un teléfono corto la lista del
  carrito muestra una línea menos. El tope de la barra no cambió, así que lo de `T-025` —holgura
  entre la última casilla y la barra— sigue en pie y su prueba lo confirma.
- **La suite final corrió contra el servidor de desarrollo ya levantado en el puerto 3000**, que es
  lo que `reuseExistingServer` permite. `npm run build` se verificó aparte, en verde.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-14_T-026_implementer.md`
