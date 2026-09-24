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

- `.diseno/cobalto/` — los artboards y la tabla de tokens son el contrato. **Lo que no está
  dibujado ahí no se inventa**: se pregunta.
- `docs/project/design-handoff.md` — se reescribe con los valores nuevos (ver Scope)
- `T-028` — los datos de la portada, el filtro «por reponer», la suma del rango y `deshacerVenta`.
  **Esta tarea empieza cuando `T-028` está `done`.**

## Scope

**Base visual**
- Tokens de `.diseno/cobalto/README.md` en `globals.css`, con los mismos nombres de `@theme` más
  `accent-soft` y `danger-soft`. Radios 16, 24 y 28. Geist autoalojada con `next/font`.
- `design-handoff.md` § Design Tokens, Typography y Radius reescritos con esos valores y sus ratios.
  Se anota por qué se deja la pila de sistema: la fuente se autoaloja y se descarga una vez.

**Navegación**
- La portada (`/`) es Inicio: lo vendido hoy, «Ver las ventas de hoy», Consultar precio, Agotados
  y Nuevo producto. La venta se muda a `/vender`.
- Celular: barra fija abajo con Inicio, Vender, Ventas y Productos. Vender lleva una insignia con
  los artículos de la venta en curso. Desaparecen la banda de arriba y los «← Volver» de las
  secciones principales. Las páginas de detalle (ficha, una venta, alta) conservan su «← Volver».
- Computador (≥ 1024 px): menú lateral con esas cuatro entradas y, al pie, la tarjeta del dueño que
  lleva a Ajustes. «Nuevo producto» no está en el menú.
- `/ajustes`: Tema (Claro, Oscuro, Del sistema) y Salir.

**Vender**
- La venta en curso se guarda en el dispositivo hasta cobrarla o vaciarla. Salir de Vender, recargar
  o cerrar la pestaña no la pierde.
- Celular: la venta se recoge en una línea encima de la barra y se despliega al tocarla. Escanear y
  «Cobrar $ N» van juntos donde llega el pulgar. Desplegada, el total vuelve a 40 px.
- Tocar la cantidad permite escribirla con el teclado numérico.
- Después de cobrar, un aviso con «Deshacer» que llama a `deshacerVenta` y devuelve la venta al
  carrito.
- Computador: el foco vive en la búsqueda, así que un lector de códigos escribe ahí sin tocar nada.
  F2 cobra. La venta en curso es una columna fija con el total en 48 px.

**Resto de pantallas**
- Productos (la ruta sigue siendo `/catalogo`), en computador con la ficha al lado de la lista.
  Ficha, Ventas con su suma del rango, detalle de venta, alta y acceso, como en los artboards.
- Nombres: «Cobrar», «Productos», «Agotados», «Hay N», «Conteo en -N», «Dejar de vender», «Ya no se
  vende», «Corregir el conteo» igual en todas partes.
- Cubre los cuatro hallazgos de `T-024`, que queda `superseded`.

**Formularios** (artboards `F-*`, validados el 2026-09-24)
- `Campo` con la etiqueta arriba, 52 px de alto y cuatro estados: normal, foco, error y bloqueado.
  Precio con «$» dentro; código de barras con «Escanear» dentro.
- Ningún `<select>`: Existencias y Categoría son radios con estilo de píldora, así que funcionan sin
  JavaScript. «Incluir los que ya no se venden» es un interruptor sobre un checkbox real.
- Fechas: `input type=date` con el aspecto del resto e icono propio. En celular, una debajo de otra
  y a todo el ancho. Ventas añade los atajos Hoy, Ayer, Esta semana y Este mes, que son enlaces.
- Categoría sugiere mientras se escribe y ofrece crear; sin JavaScript, el `datalist` de hoy.
  Acceso: el error arriba y «Mostrar» en la contraseña.
- Filtros en una hoja inferior (celular) o en el panel lateral (computador), como el alta.
- Corregir el conteo en una hoja: cantidad con − y +, la diferencia con el sistema, y motivos de un
  toque más un detalle opcional. Se guarda como un solo texto («Se dañó: una bolsa rota»), así que
  el libro no cambia. «Otro» exige el detalle.

## Out of Scope

- Datos o reglas nuevas en el servidor. Si algo falta, vuelve a `T-028`; no se consulta desde aquí.
- Cambiar rutas que ya se comparten (`/catalogo`, `/ventas`, `/catalogo/[id]`, `/ventas/[id]`).
- Tablet dibujada aparte. Entre 640 y 1024 manda el celular, con la cuadrícula a 3 columnas.

## Acceptance Criteria

- [ ] CUANDO el dueño entra EL SISTEMA DEBE mostrar Inicio con lo vendido hoy, y Vender debe quedar
      a un toque desde cualquier pantalla principal, en celular y en computador.
- [ ] CUANDO hay tres artículos en la venta y el dueño va a Productos y vuelve, o recarga,
      EL SISTEMA DEBE conservar la venta intacta. Cobrarla la vacía.
- [ ] CUANDO el dueño cobra y toca «Deshacer» EL SISTEMA DEBE anular esa venta y devolverla al
      carrito, y el total de hoy en Inicio no la cuenta.
- [ ] CUANDO el dueño toca la cantidad y escribe 6 EL SISTEMA DEBE dejar 6 unidades de esa línea.
- [ ] CUANDO un lector de códigos teclea un código y Enter en Vender, en computador, sin tocar la
      pantalla, EL SISTEMA DEBE añadir el producto. CUANDO se pulsa F2 con artículos EL SISTEMA DEBE
      cobrar.
- [ ] A 360 px, ninguna acción del flujo de venta (Escanear, Cobrar, cantidades) queda en el tercio
      superior de la pantalla.
- [ ] A 360 px y en computador, nada sale de su control: ni «Conteo en -12» junto a un precio de
      seis cifras, ni una fecha, ni la etiqueta de un campo.
- [ ] `aspecto.spec.ts` y `tipografia.spec.ts` en verde en los dos temas, **sin bajar sus umbrales**.
      La prueba que fija `accent-text` por tema se actualiza a los valores nuevos.
- [ ] CUANDO se filtra el catálogo y se piden fechas en Ventas con JavaScript desactivado EL SISTEMA
      DEBE aplicar el filtro y el rango igual que hoy, y la dirección resultante debe poder compartirse.
- [ ] Toda la suite e2e en verde, incluida la venta de tres artículos, uno sin código (`NFR-002`).

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando, con `node scripts/harness-status.mjs` antes del lint, más `npm run test:e2e`
- Task-specific: **capturas de cada pantalla de `.diseno/cobalto/` en los dos temas, a 360 px y a
  1440 px, puestas al lado de su artboard antes de pedir validación.** Lo que no coincida se dice.

## Assumptions

- Suposición: Geist cabe en el presupuesto de datos (unos 30 kB, una vez). Se mide en el build y el
  número va al handoff.

## Risks

- Tarea grande a propósito, porque se pidió no partirla. Se entrega en commits por bloque (base
  visual, navegación, Vender, resto) para poder revertir uno sin perder los otros.
- `T-025`, `T-026` y `T-027` (en `review`) tocan la barra de la venta que esta tarea reemplaza. Sus
  pruebas deben seguir en verde con la barra nueva. Si alguna ya no aplica, se dice en su Outcome;
  no se borra en silencio.
- Hay e2e que buscan por texto («Confirmar», «Catálogo»). Se cambian por el nombre nuevo, no por un
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
