---
id: T-020
title: Una línea por decisión de color
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que cambiar el color de marca de un cliente sea editar un valor y no tres. Hoy la paleta clara está escrita una vez y la oscura dos veces literalmente, y olvidar una de las tres no falla: ese tema se queda con el color viejo y nadie se entera.
decisions: [D-005, D-007]
implements: [FR-010, AC-X01]
---

## Sources

- `src/app/globals.css` — los tres bloques de paleta
- `docs/project/design-handoff.md` § Design Tokens — la tabla con los ratios medidos
- `docs/project/architecture.md` § Moneda y § Zona horaria — el precedente de qué vive en un módulo
  del dominio y por qué (`D-005`)
- Documentación de Tailwind § Theme variables, para el comportamiento de `@theme inline`

## Scope

- Separar **valores** de **semántica**: los hex viven una sola vez cada uno como paleta cruda, y los
  tokens semánticos (`--color-accent`, `--color-bg`…) apuntan a ellos.
- `@theme inline` y no `@theme` a secas. Verificado en la documentación: con `inline` la utilidad
  emite `var(--paleta-x)` en vez de resolver el valor al compilar, que es lo único que hace que un
  cambio de tema en tiempo de ejecución la alcance. Sin `inline` esto no funciona y el fallo es
  silencioso.
- Los ratios medidos siguen escritos al lado de cada valor. Son el dato que cualquier cambio de
  marca tiene que volver a producir.

## Out of Scope

- **Cambiar un solo color.** Esta tarea no toca el aspecto: los mismos hex, en otro sitio. Lo que
  cambia de aspecto es `T-023`.
- `light-dark()`. Colapsaría los dos temas en una línea por token y dejaría el archivo a la mitad,
  pero es Baseline desde mayo de 2024 y en un teléfono barato con Chrome viejo la declaración es
  inválida y **no degrada: falla**. Se descarta por el público de orbiq, no por gusto.
- Un `tokens.json` generado. Es lo correcto para varias marcas a la vez; con un despliegue por
  negocio (`D-005`) y un cliente, es infraestructura para un problema que no existe.

## Acceptance Criteria

- [x] Ningún token tiene su valor escrito dos veces, y ninguna paleta está declarada dos
      veces. (Redactado el 2026-09-13: el criterio decía «cada valor hexadecimal aparece una
      vez», y eso era falso por otro motivo — `#1c1917` es a la vez el texto claro, el fondo
      oscuro y el texto sobre el acento oscuro. Son tres decisiones distintas que coinciden
      en el valor, no una repetida. Ver `## Review`.)
- [x] CUANDO se cambia el hex del acento claro EL SISTEMA DEBE reflejarlo en toda la aplicación sin
      tocar ningún otro archivo.
- [x] CUANDO el dueño elige tema oscuro con el dispositivo en claro EL SISTEMA DEBE aplicar el
      oscuro, y al revés: los tres estados de `T-007` siguen funcionando igual.
- [x] Los colores calculados que fija `e2e/tema.spec.ts` no cambian en ninguno de los dos temas.
- [x] `e2e/aspecto.spec.ts` pasa en los dos temas: ningún control deja de distinguirse del fondo.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: cambiar el acento a un color evidente —fucsia—, comprobar a ojo que cambia en las
  dos pantallas y en los dos temas, y revertir. Es la prueba de que el objetivo de la tarea se
  cumplió, y no la comprueba ninguna suite.

## Assumptions

- Ninguna.

## Risks

- `@theme` sin `inline` compila igual y falla en silencio: las utilidades se quedan con el valor del
  tema claro y el oscuro deja de cambiar. Lo detecta `e2e/tema.spec.ts`, que compara colores
  calculados en los dos temas — por eso ese control es obligatorio aquí.

## Outcome

- Changes: la paleta pasa a declararse una sola vez —`--claro-*` y `--oscuro-*`, con su ratio
  medido al lado— y los tres bloques de tema dejan de repetir valores: solo eligen cuál rige, con
  `--paleta-*`. Los tokens semánticos los consumen por `@theme inline`, que es lo que hace que la
  utilidad emita `var(--paleta-x)` en vez de congelar el valor al compilar.
- Files: `src/app/globals.css`
- Baseline result: `npm test` 69/69 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 69/69 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **87/87**.
- Decisions recorded: ninguna nueva.
- Follow-up: dos, ninguno de esta tarea. Ver `## Review`.

## Review

- **El objetivo se midió, no se argumentó.** Se cambió el acento a fucsia y se corrió
  `e2e/tema.spec.ts`: los dos temas reportaron el color nuevo —`rgb(217,70,239)` en claro,
  `rgb(240,171,252)` en oscuro— y después se revirtió. Fueron **dos ediciones**, una por tema, que
  es una decisión cada una. Antes eran tres, y la tercera se olvidaba sin que nada fallara.
- **`inline` es el todo de esta tarea.** Sin él, Tailwind resuelve el valor al compilar y `bg-bg`
  se queda con el blanco del claro para siempre: el tema oscuro deja de cambiar, sin error ni
  aviso. Se comprobó en la documentación antes de escribir una línea, y lo fija `e2e/tema.spec.ts`,
  que compara colores calculados en los dos temas.
- **El foco dejó de leer `--color-accent`.** `@theme inline` promete usar la variable al generar
  utilidades, no publicarla; apoyarse en que además la publique sería depender de un detalle no
  prometido. Ahora toma `--paleta-accent`, que sí se declara aquí.
- **Corregí un criterio de aceptación que yo había escrito mal**, y conviene que se vea: pedía que
  cada hexadecimal apareciera una sola vez. Al implementarlo resultó falso por un motivo legítimo —
  `#1c1917` es el texto del tema claro, el fondo del oscuro y el texto sobre el acento oscuro. Son
  tres decisiones que coinciden en el valor; acoplarlas para cumplir la letra habría hecho que
  cambiar el fondo del cliente le moviera el color del texto. El criterio ahora dice lo que la
  tarea perseguía. **Es un cambio de criterio hecho por quien implementa, así que es justo lo que
  conviene mirar con lupa al validar.**
- **No cambió el aspecto, y eso está comprobado:** `e2e/tema.spec.ts` fija los colores calculados de
  los dos temas contra `design-handoff.md` y pasa sin tocarla; `e2e/aspecto.spec.ts` recorre las
  cuatro pantallas en los dos temas y no encontró un solo control que dejara de distinguirse.
- **Dos hallazgos que no son de esta tarea:**
  1. `e2e/aspecto.spec.ts:130` se puso roja al empezar, y **falla igual sobre `HEAD` sin este
     cambio**: pide más de tres casillas en la cuadrícula y no siembra ni una, así que depende de
     lo que haya en la base. Es la tercera prueba de la misma familia que `T-018`. Se desbloqueó
     corriendo `npm run sembrar-demo --forzar`, que restauró 16 productos tras el vaciado del
     estudio — pero la prueba sigue dependiendo de datos ajenos y merece tarea propia.
  2. `design-handoff.md` § Accessibility Notes todavía cierra con «**Sin decidir:** modo oscuro»,
     contradiciendo su propia sección § Tema oscuro desde `T-007`. Entra en `T-021`, que ya abre
     ese archivo.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-13
- Firmado con el criterio de aceptación reescrito a la vista: lo cambió quien implementó, y el
  motivo está en `## Review`.

## Trace

- `docs/traces/2026-09-13_T-020_implementer.md`
