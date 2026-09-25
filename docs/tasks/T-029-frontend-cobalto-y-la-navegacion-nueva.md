---
id: T-029
title: "Frontend: Cobalto y la navegación nueva"
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que la aplicación se vea y se navegue como el lienzo Cobalto validado el 2026-09-24, en celular y en computador. Se entra por una portada con lo del día, todo está a un toque desde abajo, y vender cuesta menos toques que hoy.
decisions: [D-001, D-003, D-009]
implements: [FR-004, FR-010, US-005, US-010, NFR-002, NFR-003, AC-X01, AC-X02]
---

## Sources

- `.diseno/cobalto/` es el contrato: artboards, los 14 puntos validados y la tabla de tokens. Cómo
  abrirlos está en su README. Si un artboard y la tabla difieren, manda la tabla. **Lo que no está
  dibujado no se inventa: se pregunta.** Todo lo necesario está en el repositorio.
- `docs/project/design-handoff.md` — se reescribe con los valores nuevos
- `T-028` — datos de la portada, filtro «por reponer», suma del rango y `deshacerVenta`. **Esta
  tarea empieza cuando `T-028` está `done`.**

## Scope

**Base visual**
- Tokens de la tabla en `globals.css`: mismos nombres de `@theme` más `accent-soft` y
  `danger-soft`. Radios 16, 24 y 28. Geist autoalojada con `next/font`.
- `design-handoff.md` § Design Tokens, Typography y Radius, reescritos con valores, ratios y el peso
  medido de la fuente.

**Navegación**
- `/` es Inicio: lo vendido hoy, «Ver las ventas de hoy», Consultar precio, Agotados y Nuevo
  producto. La venta se muda a `/vender`. `/ajustes` reúne Tema (Claro, Oscuro, Del sistema) y Salir.
- Celular: barra fija abajo con Inicio, Vender, Ventas y Productos. Vender lleva una insignia con
  los artículos en curso. Desaparecen la banda de arriba y los «← Volver» de las secciones; los
  detalles (ficha, una venta, alta) conservan el suyo.
- Computador (≥ 1024 px): menú lateral con esas cuatro entradas y, al pie, la tarjeta del dueño que
  lleva a Ajustes. «Nuevo producto» no está en el menú.

**Vender**
- La venta en curso se guarda en el dispositivo hasta cobrarla o vaciarla: salir, recargar o cerrar
  la pestaña no la pierde.
- Celular: recogida en una línea sobre la barra, se despliega al tocarla. Escanear y «Cobrar $ N»
  juntos abajo. Desplegada: asa «Ocultar» arriba, «Vaciar» junto al título y el total a 40 px.
- Tocar la cantidad la deja escribir con el teclado numérico.
- «Vaciar» borra la venta sin diálogo y avisa «Venta vaciada · Deshacer», que la restituye.
- Tras cobrar, «Deshacer» llama a `deshacerVenta` y devuelve la venta al carrito para corregirla.
- Computador: el foco vive en la búsqueda, así que un lector de códigos escribe ahí sin tocar nada.
  F2 cobra. La venta es una columna fija, con «Vaciar» en su cabecera y el total a 48 px.

**Resto de pantallas y nombres**
- Productos (la ruta sigue siendo `/catalogo`); en computador, ficha, filtros y alta se abren en el
  panel lateral. Ficha, Ventas con su suma del rango, detalle de venta y acceso, como los artboards.
- «Cobrar», «Productos», «Agotados», «Hay N», «Conteo en -N», «Dejar de vender», «Ya no se vende»,
  y «Corregir el conteo» igual en todas partes. Cubre los hallazgos de `T-024` (`superseded`).

**Formularios** (artboards `F-*`)
- `Campo` con etiqueta arriba, 52 px, y estados normal, foco, error y bloqueado. «$» dentro del
  precio; «Escanear» dentro del código de barras. Acceso: error arriba y «Mostrar» la contraseña.
- Ningún `<select>`: Existencias y Categoría son radios con forma de píldora (funcionan sin JS).
  «Incluir los que ya no se venden» es un interruptor sobre un checkbox real.
- Fechas: `input type=date` con el aspecto del resto e icono propio; en celular, una debajo de otra
  a todo el ancho. Ventas añade los atajos Hoy, Ayer, Esta semana y Este mes, que son enlaces.
- Categoría sugiere al escribir y ofrece crear; sin JS queda el `datalist` de hoy.
- Corregir el conteo en una hoja: cantidad con − y +, diferencia con el sistema, motivos de un
  toque y detalle opcional, guardados como un solo texto («Se dañó: una bolsa rota»). «Otro» exige
  el detalle. El libro no cambia.

## Out of Scope

- Datos o reglas nuevas en el servidor. Si algo falta, vuelve a `T-028`.
- Cambiar rutas que ya se comparten (`/catalogo`, `/ventas`, `/catalogo/[id]`, `/ventas/[id]`).
- Tablet dibujada aparte. Entre 640 y 1024 manda el celular, con la cuadrícula a 3 columnas.

## Acceptance Criteria

- [x] CUANDO el dueño entra EL SISTEMA DEBE mostrar Inicio con lo vendido hoy, y Vender debe quedar
      a un toque desde cualquier pantalla principal, en celular y en computador.
- [x] CUANDO hay tres artículos en la venta y el dueño va a Productos y vuelve, o recarga,
      EL SISTEMA DEBE conservar la venta intacta. Cobrarla la vacía.
- [x] CUANDO el dueño cobra y toca «Deshacer» EL SISTEMA DEBE anular esa venta y devolverla al
      carrito, y el total de hoy en Inicio no la cuenta.
- [x] CUANDO el dueño vacía una venta de nueve artículos y toca «Deshacer» EL SISTEMA DEBE devolver
      los nueve con sus cantidades. Vaciar no pide confirmación ni llama al servidor.
- [x] CUANDO el dueño toca la cantidad y escribe 6 EL SISTEMA DEBE dejar 6 unidades de esa línea.
- [x] CUANDO un lector teclea un código y Enter en Vender, en computador y sin tocar la pantalla,
      EL SISTEMA DEBE añadir el producto. CUANDO se pulsa F2 con artículos EL SISTEMA DEBE cobrar.
- [x] A 360 px, ninguna acción del flujo de venta (Escanear, Cobrar, cantidades) queda en el tercio
      superior, y nada sale de su control: ni «Conteo en -12» con un precio de seis cifras, ni una
      fecha, ni la etiqueta de un campo.
- [x] CUANDO se filtra el catálogo y se piden fechas con JavaScript desactivado EL SISTEMA DEBE
      aplicarlos igual que hoy, y la dirección resultante debe poder compartirse.
- [x] `aspecto.spec.ts` y `tipografia.spec.ts` en verde en los dos temas, **sin bajar umbrales**. La
      prueba que fija `accent-text` por tema se actualiza a los valores nuevos.
- [x] Toda la suite e2e en verde, incluida la venta de tres artículos, uno sin código (`NFR-002`).

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando, con `node scripts/harness-status.mjs` antes del lint, más `npm run test:e2e`
- Task-specific: **captura de cada pantalla en los dos temas, a 360 y a 1440 px, junto a su
  artboard** (el README de `.diseno/cobalto/` dice cómo sacar las dos con Playwright). Lo que no
  coincida se dice antes de pedir validación, no después.

## Assumptions

- Suposición: Geist cabe en el presupuesto de datos (unos 30 kB, una vez). Se mide en el build.

## Risks

- Grande a propósito: se pidió no partirla. Se entrega en commits por bloque (base visual,
  navegación, Vender, resto, formularios) para poder revertir uno sin perder los otros.
- `T-025`, `T-026` y `T-027` (en `review`) tocan la barra que esto reemplaza. Sus pruebas siguen en
  verde con la barra nueva; si alguna deja de aplicar, se dice en su Outcome, no se borra.
- Hay e2e que buscan por texto («Confirmar», «Catálogo»): se cambian al nombre nuevo, no a un
  selector más débil.

## Outcome

- Changes: Cobalto en tokens, Geist (29 kB medidos) y componentes; Inicio en `/`, venta en
  `/vender`, `/ajustes`; barra de secciones y menú lateral; venta que sobrevive, recogida, Vaciar y
  los dos Deshacer, cantidad escrita, F2 y lector; Productos, ficha, alta, Ventas, detalle y acceso;
  formularios sin `<select>`, con fechas nativas e interruptor. Handoff al día.
- Files: `src/app/{globals.css,layout.tsx,manifest.ts}`, `src/app/(protegido)/**`, `src/app/acceso/*`,
  `src/ui/**`, `src/domain/{filtros,movimientos}.ts`, `e2e/**`, `design-handoff.md`, íconos.
- Baseline result: 71/71, harness-lint, typecheck, lint y build limpios; e2e 95/95.
- Final result: 71/71 · typecheck, lint, harness-lint limpios · build ok · e2e **106/106** contra el
  build de producción (tras `539c233`). Capturas junto a cada artboard: https://claude.ai/artifact/YCrtQyBBWW6V1WAMoNdP5o
- Decisions recorded: ninguna. Inicio como portada no contradice `US-005` (pide ver el total, no
  ser la portada) y se revierte en una tarde.
- Follow-up: ninguno.

## Review

- **Desviaciones del lienzo, todas con motivo:** historial antes que acciones en la ficha
  (`T-013`); botones «suave» y «peligro» con borde (1.03:1 sin él); importe de «Cobrar» un punto
  menor a 360 px; «Anulada» bajo los artículos. Contar en «Ver N productos» y los iconos de Acceso
  se hicieron después, a pedido del estudio: `contarCatalogo` reusa las condiciones de la lista.
- **Pruebas de `T-025`–`T-027` que cambiaron:** abren la venta antes de medir, porque recogida el
  total va dentro de Cobrar. Nada de lo que exigen baja. Las de orden de la cuadrícula y del lector
  se ajustaron a la cuadrícula de 24 y a la lista nueva, no a un umbral menor.
- **Dos fallos reales los encontró mirar, no la suite:** «Cobrar» se salía del botón en oscuro y
  Ventas se ensanchaba a 373 px con una venta anulada. El segundo ya tiene su prueba.
- El servidor de desarrollo se degrada si se compila producción con él en marcha: la suite se
  corrió contra `next start` en otro puerto.
- **Reportado por el estudio tras la entrega:** «Cerrar» de los filtros no cerraba con JavaScript
  (enlace a la misma dirección) y el conteo se veía apretado. Corregido en `519c4d0`, con prueba
  que cae con el código anterior; ahora cierra también con Escape y tocando fuera. Suite: 103/105
  con la máquina a carga 22; los dos fallos, del ritmo del lector, pasan 5/5 aislados.

## Validation

- Validated by: Juan Leon
- Date: 25/09/2026

## Trace

- `docs/traces/` al empezar
