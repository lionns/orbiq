---
id: T-022
title: Iconografía que acompaña a la palabra
status: ready
profile: team
harness: 0.9.0
role: Implementer
goal: Que las acciones se reconozcan de un vistazo sin dejar de leerse. Hoy no hay un solo icono en la aplicación, así que toda la jerarquía visual descansa en el peso del texto y cada acción cuesta leerla entera.
decisions: [D-003, D-007]
implements: [FR-010, AC-X02]
---

## Sources

- `docs/project/design-handoff.md` § Accessibility Notes — «ningún estado se comunica solo por color
  ni solo por icono: siempre hay texto»
- Lienzo de diseño validado por el estudio el 2026-09-13 — los iconos ya dibujados en los artboards
- `src/ui/` — los ocho componentes donde entran

## Scope

- **`lucide-react` como dependencia.** Decidido por el estudio el 2026-09-13, por encima de la
  alternativa de copiar los trazados: se prefiere el set mantenido y la actualización gratis al
  ahorro de una dependencia.
- El set mínimo, y solo el que se usa: buscar, cámara, catálogo, tema, cobrar, añadir, quitar,
  historial. Un icono que no está en una pantalla no entra en el repositorio.
- **Ningún icono va solo.** Cada uno acompaña a la etiqueta que ya existe; ninguna palabra se
  sustituye por un dibujo. La regla del handoff ya lo pedía; con un dueño mayor deja de ser buena
  práctica y pasa a ser requisito.
- Los iconos son decorativos para la accesibilidad —`aria-hidden`— porque el texto de al lado ya
  dice lo que son. Un icono anunciado además de su palabra hace que el lector de pantalla lo diga
  dos veces.

## Out of Scope

- Botones solo-icono en cualquier parte de la aplicación. Es lo que esta tarea existe para no hacer.
- Iconos por producto o por categoría. El catálogo de una tienda no se ilustra: se lee.
- Ilustraciones, estados vacíos dibujados o cualquier cosa que no sea un glifo de 20 o 24 px.

## Acceptance Criteria

- [ ] CUANDO se renderiza cualquier pantalla EL SISTEMA DEBE mostrar cada icono junto a un texto
      visible que diga lo mismo.
- [ ] Ningún icono es el único contenido de un control interactivo.
- [ ] Los iconos no son anunciados por un lector de pantalla, y el nombre accesible de cada control
      sigue siendo el que tenía antes de esta tarea.
- [ ] El paquete que llega al navegador crece solo por los iconos que se usan: importar ocho no
      trae el catálogo entero.
- [ ] `npm run build` sigue en verde y la aplicación sigue arrancando sin JavaScript en las
      pantallas que hoy funcionan sin él (`T-005`, `T-007`).

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: medir el tamaño del paquete de la ruta de venta antes y después, y dejar las dos
  cifras escritas en el registro. Una dependencia de 1.780 iconos que entra entera sería un defecto,
  y sin medirlo es una suposición.

## Assumptions

- **Asunción** — el sacudido de árbol de `lucide-react` funciona con el empaquetador de esta versión
  de Next. Si la medida del control anterior dice que no, la salida es importar cada icono por su
  ruta propia, y si tampoco, volver a copiar los trazados. La decisión de usar librería se mantiene;
  lo que cambiaría es cómo se importa.

## Risks

- Es la primera dependencia de interfaz del proyecto, que hoy tiene ocho de producción. Revertirla
  cuesta una tarde —copiar ocho trazados—, así que no es una puerta de las que exigen decisión
  escrita, pero conviene que el número deje de crecer sin que nadie lo mire.

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

- `docs/traces/<fecha>_T-022_implementer.md`
