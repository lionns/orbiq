---
id: T-020
title: Una línea por decisión de color
status: ready
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

- [ ] Cada valor hexadecimal de cada tema aparece **exactamente una vez** en `globals.css`.
- [ ] CUANDO se cambia el hex del acento claro EL SISTEMA DEBE reflejarlo en toda la aplicación sin
      tocar ningún otro archivo.
- [ ] CUANDO el dueño elige tema oscuro con el dispositivo en claro EL SISTEMA DEBE aplicar el
      oscuro, y al revés: los tres estados de `T-007` siguen funcionando igual.
- [ ] Los colores calculados que fija `e2e/tema.spec.ts` no cambian en ninguno de los dos temas.
- [ ] `e2e/aspecto.spec.ts` pasa en los dos temas: ningún control deja de distinguirse del fondo.

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

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/<fecha>_T-020_implementer.md`
