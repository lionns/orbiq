---
id: T-009
title: Storybook para los componentes de interfaz
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: Poder abrir cada componente de src/ui/ por separado, en sus dos temas y a 360 px, sin levantar la aplicación ni tener datos en la base.
decisions: [D-003, D-007]
implements: [FR-010, AC-X02]
---

## Sources

- `src/ui/README.md`
- `docs/project/design-handoff.md` § Design Tokens
- `docs/tasks/T-006-componentes-compartidos-de-interfaz.md` § Outcome

## Scope

- `@storybook/nextjs`, una historia por componente de `src/ui/`.
- Un conmutador de tema en la barra de Storybook, para ver cada componente en claro y en oscuro.
- Un tamaño de 360 px como predeterminado, que es el caso que manda (`D-007`).

## Out of Scope

- Reorganizar `src/ui/` en `atoms/molecules/organisms`. **Se descartó el 2026-09-07 con el estudio**
  tras comprobar que Storybook no lo necesita: la jerarquía de su barra lateral la decide el campo
  `title` de cada historia, que es texto libre. La taxonomía se puede poner ahí sin mover un archivo,
  y cambiarla después no cuesta ningún import. Se revisa a los ~25 componentes o cuando una segunda
  aplicación comparta la librería.
- Pruebas visuales automáticas. Entran cuando haya con qué compararlas.
- Historias de pantallas completas: dependen de sesión y de base, y para eso está Playwright.

## Acceptance Criteria

- [ ] CUANDO se abre Storybook EL SISTEMA DEBE mostrar los siete componentes de `src/ui/` sin
      levantar la aplicación ni conectarse a la base.
- [ ] Cada componente se puede ver en tema claro y oscuro desde la propia barra de Storybook.
- [ ] Ningún componente necesita una acción de servidor importada para renderizarse: la regla de
      `eslint.config.mjs` que lo impide ya está puesta.

## Verification

- Baseline: `npm test && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando, más `npm run storybook` levantando sin errores de consola.
- Task-specific: abrir el selector de tema en oscuro y comprobar que el texto del botón principal
  se lee — es el par que falló al medir (`T-007` § Review).

## Assumptions

- **Asunción** — dos horas de trabajo con siete componentes. Si la cifra se dispara, es señal de que
  algún componente sigue atado al servidor y eso es el hallazgo, no el retraso.

## Risks

- Storybook trae su propia cadena de compilación. Es una dependencia grande para un beneficio que
  hoy es cómodo, no necesario: por eso queda `ready` y no `doing`.

## Outcome

- Changes:
- Files:
- Baseline result:
- Final result:
- Decisions recorded:
- Follow-up:

## Review

- 

## Validation

- Validated by: 
- Date: 

## Trace

-
