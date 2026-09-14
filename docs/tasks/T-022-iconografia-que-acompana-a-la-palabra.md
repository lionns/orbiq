---
id: T-022
title: Iconografía que acompaña a la palabra
status: review
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

- [x] CUANDO se renderiza cualquier pantalla EL SISTEMA DEBE mostrar cada icono junto a un texto
      visible que diga lo mismo.
- [x] Ningún icono es el único contenido de un control interactivo.
- [x] Los iconos no son anunciados por un lector de pantalla, y el nombre accesible de cada control
      sigue siendo el que tenía antes de esta tarea.
- [x] El paquete que llega al navegador crece solo por los iconos que se usan: importar ocho no
      trae el catálogo entero.
- [x] `npm run build` sigue en verde y la aplicación sigue arrancando sin JavaScript en las
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

- Changes: `src/ui/iconos.tsx` concentra el set y la regla —`Icono` es decorativo y siempre va
  junto a texto—. Entran en las acciones: cámara/cerrar, buscar, y confirmar/reintentar, este
  último cambiando de glifo con el estado. `e2e/iconos.spec.ts` fija que ninguno quede sin palabra
  y que ninguno lo anuncie un lector de pantalla.
- Files: `src/ui/iconos.tsx`, `src/ui/objetivo-de-escaneo.tsx`, `src/app/(protegido)/venta.tsx`,
  `src/app/(protegido)/catalogo/filtros.tsx`, `e2e/iconos.spec.ts`, `package.json`
- Baseline result: `npm test` 69/69 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 69/69 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **87 de 91, y los 4 que fallan cambian en cada pasada**. No son de esta tarea:
  verificado guardando los cambios y corriendo sobre `HEAD`, donde fallan igual. Ver `## Review`.
- Decisions recorded: ninguna nueva.
- Follow-up: la tarea queda en `review` y no en `done` porque `test:e2e` es un control final y está
  en rojo. Lo que lo pone rojo es el aislamiento de la suite, que necesita su tarea — y es el quinto
  aviso.

## Review

- **La cabecera se quedó sin iconos, y es un recorte medido.** Los puse en los tres enlaces de
  navegación, en Tema y en Salir; a 360 px el documento pasó a **472 px de ancho** y tumbó veinte
  pruebas. No es que quedaran feos: no caben. Se quitaron los cinco y la cuadrícula de acciones se
  quedó con los que sí aportan. La cabecera del lienzo —nombre del negocio y tema— es otra cosa y
  la construye `T-023`; allí se vuelve a mirar si un icono cabe.
- **El sacudido de árbol funciona, y está medido.** Los *chunks* servidos pasan de **696 KB a
  712 KB**: +16 KB por once iconos, con `lucide-react` ocupando 45 MB en disco. La asunción de la
  tarea era justo esa y ya no es una asunción.
- **Las dos pruebas nuevas se comprobaron rompiéndolas:** al quitarle la palabra «Salir» a su
  icono, las dos caen. Sin ese paso, «la prueba cubre el caso» habría sido una suposición.
- **Los criterios de esta tarea sí sobrevivieron al contacto con el código**, a diferencia de los de
  `T-020` y `T-021`. Estaban escritos sobre propiedades de la aplicación —nombres accesibles, peso
  del paquete, texto junto al icono— y no sobre la maqueta.
- **Quinto aviso del mismo defecto, y ya no se puede seguir aplazando.** `escaneo.spec.ts:128` pasa
  aislada dos veces seguidas y falla con la suite entera; se comprobó **guardando mis cambios y
  corriendo sobre `HEAD`**, donde falla igual. Además la suite pasó de 57 s a 3,2 minutos y los
  fallos cambian de prueba en cada pasada. Se descartó que fueran datos fugados: la base tiene 17
  productos y 1 usuario, que es lo que debe tener. Queda la causa de siempre —paralelo contra una
  sola base, más latencia contra Neon—. **Recomiendo que la tarea de aislamiento entre antes que
  `T-023`:** con la suite así, el control que debe demostrar que un cambio visual no rompió nada ya
  no demuestra nada.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-13_T-022_implementer.md`
