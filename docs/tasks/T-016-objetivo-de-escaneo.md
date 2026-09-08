---
id: T-016
title: El objetivo de escaneo, con cámara, lector y tecleado
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que el dueño apunte a un código y vea el producto, venga de la cámara, de una pistola lectora o tecleado a mano, por el mismo camino y con el mismo resultado. Es el acto central del producto y hoy no existe: el esquema guarda el código desde T-003 y nada lo lee.
decisions: [D-007, D-009]
implements: [FR-002, FR-003, NFR-001, AC-006, AC-007]
---

## Sources

- `docs/project/requirements.json` — `FR-002`, `FR-003`, `NFR-001`
- `docs/project/acceptance-criteria.json` — `AC-006`, `AC-007`, `AC-X02`
- `docs/project/architecture.md` § Stack — la librería de lectura está **sin decidir**, y esta
  tarea es donde se decide
- `D-009` § Decision, que conserva sin cambios el objetivo único de `D-007`

## Scope

- Una función de dominio que resuelve un código a producto, en `src/domain/catalogo.ts`, sin
  importar nada de `next/*`. Hoy no hay ninguna consulta por `barcode` (`D-001`).
- Un componente `ObjetivoDeEscaneo` en `src/ui/` con **una sola salida**: llega un código, se
  resuelve. Las tres entradas son suyas, quien lo usa no las distingue.
  - Tecleado a mano y confirmado.
  - Pistola lectora: teclea rápido y termina en Enter. Se reconoce por el ritmo, no por un modo
    que el dueño tenga que activar.
  - Cámara: `BarcodeDetector` donde exista, respaldo en el cliente donde no — que es todo iPhone.
- Elegir ese respaldo sobre evidencia —peso, formatos, si decodifica en un hilo aparte— y anotarlo
  en `architecture.md` § Stack, que hoy lo declara sin decidir.
- Cablearlo en la pantalla de venta y en el catálogo.
- Código desconocido: ofrecer darlo de alta con el código ya puesto, sin perder la venta en curso.
- Pruebas: los caminos de teclado y tecleado en Playwright siempre; el de cámara con el dispositivo
  de vídeo falso de Chromium, apuntando a un código conocido.

## Out of Scope

- Escaneo continuo o por lotes. Se escanea un artículo y se ve el resultado.
- Imprimir etiquetas de código de barras (`brief.md` § Out of Scope).
- Decidir si hace falta una app nativa. Esta tarea produce la medición que alimenta el `Trigger`
  de `D-009`; no lo resuelve.
- El manifest y la instalación. Es `T-015`, y son independientes.

## Acceptance Criteria

- [x] CUANDO llega un código al objetivo, venga de cámara, de lector de teclado o tecleado EL
      SISTEMA DEBE resolverlo por el mismo camino y producir el mismo resultado (`AC-006`).
- [x] CUANDO se escanea un código que ningún producto tiene EL SISTEMA DEBE ofrecer darlo de alta
      con ese código ya puesto, sin perder la venta en curso (`AC-007`).
- [x] CUANDO el dueño escanea durante una venta EL SISTEMA DEBE añadir el producto a la venta en
      curso, no navegar a su ficha.
- [ ] Desde que se apunta a un código conocido hasta que el producto está en pantalla pasan menos de
      tres segundos, medido, no estimado (`NFR-001`).
- [x] Toda pantalla que use el objetivo sigue siendo operable solo con teclado (`AC-X02`).
- [x] Las pruebas de `T-004` y `T-013` siguen pasando: escanear se suma a la cuadrícula y a la
      ficha, no las reemplaza.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: `npm test && node scripts/harness-status.mjs && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Task-specific: cronometrar en un teléfono real, con un producto real y su código de fábrica, el
  camino de cámara de extremo a extremo. Es el número que `NFR-001` exige y el que decide si el
  camino web basta; un vídeo falso en Chromium prueba que el código se decodifica, no cuánto tarda
  una cámara con la luz del local.

## Assumptions

- **Asunción** — una pistola lectora se empareja en modo HID y se comporta como teclado. Si el
  cliente compra una que solo hable por su propio perfil, no entra por aquí y necesita su tarea.
- **Asunción** — los formatos que hacen falta son los de producto de tienda: EAN-13, EAN-8 y
  UPC-A. Se acota el decodificador a esos, porque buscar todos los formatos lo hace más lento.

## Risks

- El reconocimiento por ritmo del lector puede robar teclas a un campo de texto. La defensa es que
  `AC-X02` exige la aplicación operable por teclado, así que hay una prueba que escribe a mano en
  un campo mientras el objetivo está montado.
- El respaldo en el cliente es WebAssembly y pesa. Contra datos móviles puede comerse el
  presupuesto de tres segundos en la primera carga. Por eso el peso es criterio de elección y no un
  detalle, y por eso se mide en un teléfono.
- `T-016` no depende de `D-009`: el objetivo de escaneo es idéntico en `D-007` y en `D-009`, así que
  puede empezar con cualquiera de las dos aceptada.

## Outcome

- Changes: el objetivo de escaneo con sus tres entradas y una salida, la función de dominio que
  resuelve un código, el alta desde código desconocido sin salir de la venta, y el decodificador de
  respaldo elegido y autoalojado. En el catálogo el objetivo va **sin campo propio**, dentro de la
  búsqueda que ya aceptaba nombre o código.
- Files: `src/domain/escaneo.ts`, `src/domain/escaneo.test.ts`, `src/domain/catalogo.ts`,
  `src/ui/objetivo-de-escaneo.tsx`, `src/app/(protegido)/{acciones.ts,venta.tsx}`,
  `src/app/(protegido)/catalogo/{page.tsx,filtros.tsx,buscador-por-codigo.tsx}`,
  `src/app/(protegido)/catalogo/nuevo/{page.tsx,formulario.tsx}`, `scripts/copiar-wasm.mjs`,
  `e2e/escaneo.spec.ts`, `e2e/apoyo/ean13.ts`, `e2e/apoyo/ean13.test.ts`,
  `docs/project/architecture.md`, `playwright.config.ts`, `vitest.config.ts`, `package.json`
- Baseline result: `npm test` 49/49 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` **65/65** · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok · `test:e2e` **75/75**.
- Decisions recorded: ninguna nueva. Se ejecuta `D-009`, y se cierra el «sin decidir» que
  `architecture.md` § Stack tenía abierto para la librería de lectura.
- Follow-up: **el criterio de los tres segundos (`NFR-001`) sigue sin marcar** — se mide con un
  teléfono y un producto real, y es la comprobación que pide `## Verification`. Es lo único que
  queda de esta tarea, y es tuyo, no mío.

## Review

- **La cámara no quedó cubierta de extremo a extremo, y no lo disimulo.** El plan decía probarla con
  el dispositivo de vídeo falso de Chromium. Se construyó: un generador de EAN-13 con su dígito de
  control y su Y4M, verificado decodificando el archivo en Node. Chromium entrega **negro** al
  lienzo desde ese dispositivo —medido en headless clásico, en el nuevo y con navegador visible— y
  el respaldo lee por lienzo. Antes que dejar una prueba que pasara sin probar nada, se sustituyó
  por una de unidad que corre el decodificador real contra los formatos que se envían, y la cámara
  se queda en la comprobación manual. Es menos de lo que el plan prometía.
- **Pedir `upc_a` era un error, y lo encontró esa prueba.** Chromium no lo anuncia, así que exigirlo
  descartaba el decodificador nativo y bajaba 1,1 MB de WebAssembly en Android sin motivo. Un UPC-A
  es un EAN-13 con un cero delante: se piden dos formatos y la equivalencia se resuelve al
  consultar. Sin eso, el producto dado de alta tecleando los doce dígitos del empaque no lo
  encontraba nunca quien lo escaneaba.
- **El catálogo ya tenía un campo que buscaba por código.** Añadir el objetivo con el suyo puso dos
  cuadros que aceptan lo mismo en la misma pantalla y empujó la lista 64 px, fuera del pliegue a
  360 px. Lo detectó la prueba de `T-005`, no una revisión. Allí el objetivo aporta cámara y lector,
  y ningún campo.
- **El `.wasm` se descargaba de un CDN de terceros.** Es el comportamiento por defecto de
  `zxing-wasm`. Escanear es el acto central del producto y no puede depender de un dominio ajeno:
  se copia a `public/` en cada build.
- El ritmo separa a la pistola de una persona, y esa regla es una función pura con siete pruebas,
  incluida la del umbral por ambos lados. Que el lector no robe teclas a quien escribe tiene su
  propia prueba de recorrido, porque `AC-X02` es lo que se rompe primero.

## Validation

- Validated by: 
- Date: 

## Trace

- `docs/traces/2026-09-08_T-016_implementer.md`
