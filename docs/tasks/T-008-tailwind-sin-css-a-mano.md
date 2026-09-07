---
id: T-008
title: Tailwind sin CSS a mano donde no hace falta
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que las 43 clases con valor arbitrario pasen a ser las utilidades que `@theme` ya genera, y que el CSS escrito a mano se reduzca a lo que no se puede expresar con una clase — con el motivo escrito al lado de cada regla que se queda.
decisions: [D-003, D-007]
implements: [FR-010, AC-X02]
---

## Sources

- `src/app/globals.css`
- `docs/project/design-handoff.md` § Design Tokens
- `src/ui/README.md`

## Scope

- Sustituir `text-[color:var(--color-text-muted)]` y sus 42 hermanas por `text-text-muted` y las
  demás utilidades que Tailwind 4 ya genera desde `@theme`. Comprobado: todas existen.
- La pila tipográfica pasa a ser un token, `--font-sans`, en vez de una regla sobre `body`.
- Dejar en `globals.css` solo lo que **no puede** ser una clase, con el motivo escrito al lado.
- Un inventario del CSS que se queda, para poder discutirlo en vez de heredarlo.

## Out of Scope

- Renombrar los tokens de `design-handoff.md`. `bg-bg` y `text-text` se leen raro, pero cambiar los
  nombres rompe el vocabulario compartido con el estudio por un detalle estético.
- Tocar los valores de color. Están medidos y esta tarea no cambia ni uno.
- Cualquier cambio visible. Si la suite nota una diferencia, es un defecto de esta tarea.

## Acceptance Criteria

- [x] CUANDO se busque `var(--color-` en `src/**/*.tsx` EL SISTEMA no DEBE encontrar ninguna: los
      colores se aplican con utilidades, no con valores arbitrarios.
- [x] CUANDO se busque `var(--radius-` o `var(--text-` en `src/**/*.tsx` tampoco DEBE encontrar
      ninguna.
- [x] Cada regla que se quede en `globals.css` lleva escrito por qué no puede ser una clase.
- [x] Las 48 pruebas de dominio y las 42 de recorrido pasan sin tocar ninguna.
- [x] El CSS generado no crece.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Final: el mismo comando con el mismo resultado, más el recuento de `var(--` en `src/**/*.tsx` en
  cero y el tamaño del CSS generado antes y después.
- Task-specific: comprobar en la aplicación construida que los dos temas siguen dando los mismos
  colores calculados — el refactor no puede mover ni un token.

## Assumptions

- Ninguna. Se comprobó que las utilidades existen antes de escribir nada.

## Risks

- Un cambio masivo de cadenas de texto. La red es la misma de siempre: 90 pruebas, de las cuales 42
  recorren la aplicación entera, y dos que comprueban los colores calculados de los dos temas.

## Outcome

- Changes: las 43 clases con valor arbitrario pasan a las utilidades que `@theme` ya generaba; la
  pila tipográfica es ahora el token `--font-sans` y se aplica con `font-sans`; el fondo y el color
  del `body` pasan de regla CSS a clases; cada regla que se queda en `globals.css` lleva escrito
  por qué no puede ser una clase. Se añaden dos pruebas que fijan los tokens contra lo que el
  navegador calcula.
- Files: 12 archivos `.tsx` en `src/`, `src/app/globals.css`, `src/app/layout.tsx`,
  `e2e/tema.spec.ts`
- Baseline result: `npm test` 48/48 · `typecheck` clean · `lint` clean · `test:e2e` 42/42.
- Final result: `npm test` 48/48 · `typecheck` clean · `lint` clean · `build` ok · `test:e2e`
  **44/44** en dos corridas. Cero coincidencias de `var(--` en `src/**/*.tsx`. El CSS generado
  **baja** de 13.915 a 13.386 bytes.
- Decisions recorded: ninguna. Se descartó renombrar los tokens: `bg-bg` y `text-text` se leen raro,
  pero los nombres son el vocabulario compartido con el estudio y están en `design-handoff.md`.
- Follow-up: ninguno abierto.

## Review

- El problema no era CSS mezclado con Tailwind. Era **Tailwind escrito a mano**: 43 clases del tipo
  `text-[color:var(--color-text-muted)]` haciendo lo que `@theme` ya generaba como `text-text-muted`.
  Se comprobó construyendo, no leyendo documentación, que las trece utilidades existen.
- El CSS que queda son tres reglas y todas dicen por qué no pueden ser una clase: los 16 px de los
  campos —olvidarla no falla, solo hace que iOS haga zoom—, el anillo de foco —es una garantía, no
  un estilo— y el movimiento reducido —tiene que alcanzar también a lo que traiga una dependencia.
  Más los dos bloques del tema oscuro, que redefinen variables y no tienen otra forma.
- Se añadieron dos pruebas que comparan los colores calculados con los de `design-handoff.md`.
  Sin ellas, cambiar una utilidad por otra parecida pasa todo lo demás —el fondo del `body` sigue
  siendo el mismo— y mueve un color a la callada. Fue exactamente el riesgo de esta tarea.
- Hallazgo propio, corregido: la primera sonda de colores usaba `getPropertyValue` con nombres en
  camelCase, que devuelve cadena vacía, y un selector que cogía el botón del tema en vez del de
  entrar. Daba «todo vacío» y parecía un fallo de la aplicación. No lo era.

## Validation

- Validated by: 
- Date: 
- Pendiente de tu firma, junto con `T-004`…`T-007`.

## Trace

- `docs/traces/2026-09-07_T-008_implementer.md`
