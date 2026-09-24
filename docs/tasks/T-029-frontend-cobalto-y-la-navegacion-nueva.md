---
id: T-029
title: "Frontend: Cobalto y la navegación nueva"
status: ready
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

- [ ] CUANDO el dueño entra EL SISTEMA DEBE mostrar Inicio con lo vendido hoy, y Vender debe quedar
      a un toque desde cualquier pantalla principal, en celular y en computador.
- [ ] CUANDO hay tres artículos en la venta y el dueño va a Productos y vuelve, o recarga,
      EL SISTEMA DEBE conservar la venta intacta. Cobrarla la vacía.
- [ ] CUANDO el dueño cobra y toca «Deshacer» EL SISTEMA DEBE anular esa venta y devolverla al
      carrito, y el total de hoy en Inicio no la cuenta.
- [ ] CUANDO el dueño vacía una venta de nueve artículos y toca «Deshacer» EL SISTEMA DEBE devolver
      los nueve con sus cantidades. Vaciar no pide confirmación ni llama al servidor.
- [ ] CUANDO el dueño toca la cantidad y escribe 6 EL SISTEMA DEBE dejar 6 unidades de esa línea.
- [ ] CUANDO un lector teclea un código y Enter en Vender, en computador y sin tocar la pantalla,
      EL SISTEMA DEBE añadir el producto. CUANDO se pulsa F2 con artículos EL SISTEMA DEBE cobrar.
- [ ] A 360 px, ninguna acción del flujo de venta (Escanear, Cobrar, cantidades) queda en el tercio
      superior, y nada sale de su control: ni «Conteo en -12» con un precio de seis cifras, ni una
      fecha, ni la etiqueta de un campo.
- [ ] CUANDO se filtra el catálogo y se piden fechas con JavaScript desactivado EL SISTEMA DEBE
      aplicarlos igual que hoy, y la dirección resultante debe poder compartirse.
- [ ] `aspecto.spec.ts` y `tipografia.spec.ts` en verde en los dos temas, **sin bajar umbrales**. La
      prueba que fija `accent-text` por tema se actualiza a los valores nuevos.
- [ ] Toda la suite e2e en verde, incluida la venta de tres artículos, uno sin código (`NFR-002`).

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

- `docs/traces/` al empezar
