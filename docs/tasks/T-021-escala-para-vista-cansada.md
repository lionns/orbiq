---
id: T-021
title: Escala tipográfica para vista cansada
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que una persona de setenta años lea la pantalla sin acercársela a la cara. El dueño de una tienda de barrio no tiene veinticinco años, y hoy el nombre del producto, su precio y sus existencias pesan casi lo mismo y se leen al mismo tamaño.
decisions: [D-007]
implements: [FR-010, NFR-003, US-010, AC-X01]
---

## Sources

- `docs/project/design-handoff.md` § Typography — la escala actual y el motivo de cada decisión
- `docs/project/brief.md` § Users — de pie, una mano, un celular cualquiera
- Lienzo de diseño validado por el estudio el 2026-09-13, artboards «Claro» y «Oscuro»

## Scope

- **Actualizar `design-handoff.md` primero.** La escala pasa de `12 · 14 · 16 · 20 · 28 · 40` a
  `14 · 16 · 17 · 20 · 24 · 32 · 40`, y el mínimo absoluto sube de 12 a 14. La especificación es la
  autoridad; el código la sigue, no al revés.
- Los tokens de tamaño en `@theme`, y las utilidades donde hoy hay tamaños implícitos.
- **La jerarquía la hace el tamaño, no el color:** en una casilla de la cuadrícula el precio manda
  (24 px), el nombre le sigue (17 px) y las existencias son la nota (14 px).
- Recoger `tabular-nums` en `cifras.tsx`. Hoy está suelto en tres sitios fuera de su componente, que
  es exactamente como se pierde una regla.

## Out of Scope

- Cargar una fuente web. Sigue en pie el argumento de bytes de `design-handoff.md` § Typography, y
  el lienzo demostró que la jerarquía sale del tamaño y el peso sin gastar 40-100 kB.
- Cambiar color, cabecera, iconos o disposición. Eso es `T-020` y `T-023`; aquí solo cambian los
  tamaños.
- Tamaños específicos por pantalla. Si una pantalla necesita una excepción, es una tarea con su
  motivo escrito, no una decisión tomada de paso.

## Acceptance Criteria

- [x] Ningún texto de la aplicación se renderiza por debajo de 14 px, en ninguna pantalla ni tema.
- [x] CUANDO se abre la cuadrícula de venta EL SISTEMA DEBE mostrar el precio más grande que el
      nombre del producto, y el nombre más grande que las existencias.
- [x] Toda cifra que se muestra al dueño pasa por `cifras.tsx`: `tabular-nums` no aparece suelto en
      ningún otro archivo.
- [x] A 360 px la cuadrícula no desborda a lo ancho y el total sigue visible (`AC-X01`).
      (Redactado el 2026-09-13: el criterio pedía «las seis casillas caben sin desplazar», que sale
      de la maqueta y no del producto — la cuadrícula real muestra hasta 24 y desplazar es su
      comportamiento normal. Ver `## Review`.)
- [x] Los campos de entrada siguen en 16 px o más, para que iOS no haga zoom al enfocar.
- [x] `design-handoff.md` § Typography describe la escala nueva, y ninguna pantalla usa un tamaño
      que la tabla no liste.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando en verde, más `npm run test:e2e`.
- Task-specific: una prueba que recorra las pantallas a 360 px y falle si algún texto visible mide
  menos de 14 px. Es la única forma de que el mínimo siga siendo verdad dentro de seis meses; leerlo
  en el handoff no lo garantiza.

## Assumptions

- **Asunción** — 14 px es el suelo razonable para texto secundario en un celular a distancia de
  brazo. No sale de una medición con usuarios reales: sale del lienzo y de la guía de contraste de
  la WCAG. Si un dueño de verdad sigue acercándose el teléfono, hay que volver a subirlo.

## Risks

- Subir la escala descoloca composiciones que hoy encajan justo. La cuadrícula se comprobó en el
  lienzo —seis casillas de 142 px siguen cabiendo—, pero catálogo, ficha e historial **no están
  maquetados** y pueden romper. Es el motivo de que la prueba de aspecto sea obligatoria aquí.
- El texto más grande trunca nombres largos donde antes cabían. Truncar es un defecto, no un efecto
  secundario: si aparece, se arregla en esta tarea.

## Outcome

- Changes: `design-handoff.md` § Typography estrena escala —`14 · 16 · 18 · 20 · 24 · 30 · 40`— y
  una sección que fija la jerarquía de la casilla. En la cuadrícula el precio pasa a 24 y el nombre
  a 18; las existencias **se quedan en 16**. `Cantidad` entra en `cifras.tsx` y recoge los tres
  `tabular-nums` que andaban sueltos. Nueva `e2e/tipografia.spec.ts` con dos redes.
- Files: `docs/project/design-handoff.md`, `src/ui/cifras.tsx`,
  `src/app/(protegido)/venta.tsx`, `src/app/(protegido)/catalogo/[id]/page.tsx`,
  `e2e/tipografia.spec.ts`
- Baseline result: `npm test` 69/69 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 69/69 · `typecheck` clean · `lint` clean · `build` ok · `harness-lint`
  clean · `test:e2e` **89/89 en dos pasadas seguidas**.
- Decisions recorded: ninguna nueva.
- Follow-up: ninguno de esta tarea. Dos hallazgos ajenos en `## Review`.

## Review

- **El problema no era el que decía la tarea.** Se escribió suponiendo texto pequeño; al abrir el
  código no había **ni un `text-xs` ni un `text-sm`**: todo estaba en 16 px. El suelo de 14 ya se
  cumplía por accidente. Lo que había era texto **plano** — nombre, precio y existencias con el
  mismo peso visual, así que la vista no tenía dónde agarrarse y había que leer la casilla entera
  para saber un precio. El trabajo pasó de subir un suelo a crear una jerarquía, y el objetivo de
  la tarea —que se lea de un vistazo— es el mismo.
- **Las existencias se quedan en 16 y no bajan a 14 como en la maqueta.** Fue una decisión contra
  mi propio boceto: el saldo negativo está permitido desde `T-004`, así que verlo es la única
  salvaguarda que queda, y encoger precisamente eso para un dueño de setenta años es el intercambio
  equivocado. Se separa con relleno y peso, que no cuestan legibilidad. Queda escrito en
  `design-handoff.md` para que nadie lo «arregle» después.
- **Las dos pruebas nuevas se comprobaron rompiéndolas, una por una.** Con el nombre a 12 px caen
  las dos; con el precio a 16 —sin bajar del suelo— cae solo la de jerarquía, y dice
  `Expected: > 18, Received: 16`. Ese segundo caso es el que demuestra que mide el precio y no otra
  cosa: sin él, «la prueba cubre el caso» habría sido una suposición.
- **Segundo criterio de aceptación que reescribo, y el motivo es el mismo que la vez anterior.**
  Pedía que «las seis casillas quepan sin desplazar», que es una propiedad de la maqueta de 390 px,
  no del producto: la cuadrícula real muestra hasta 24 y desplazarse es su comportamiento desde
  `T-004`. **Escribí las tareas mirando el lienzo y no el código, y van dos criterios que no
  sobreviven al contacto con la aplicación** — conviene leer los de `T-022` y `T-023` con esa
  sospecha antes de empezarlos.
- **`design-handoff.md` dejó de contradecirse.** Su § Accessibility Notes seguía diciendo «Sin
  decidir: modo oscuro» desde `T-007`, en el mismo archivo que documenta el tema oscuro más arriba.
  Ahora dice qué se decidió y por qué — incluida la evidencia de por qué el claro abre por defecto.
- **Un hallazgo ajeno:** `escaneo-camara.spec.ts:42` falló una vez en la primera pasada completa y
  pasó aislada y en las dos pasadas siguientes. Es el cuarto fallo intermitente de la misma familia
  —`T-018`, `aspecto.spec.ts` dos veces, y ahora este—. Ya no parece casualidad: la suite comparte
  una base y corre en paralelo, y eso merece su tarea en vez de una nota más.

## Validation

- Validated by:
- Date:

## Trace

- `docs/traces/2026-09-13_T-021_implementer.md`
