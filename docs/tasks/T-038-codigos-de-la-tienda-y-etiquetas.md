---
id: T-038
title: Códigos de la tienda para lo que no trae, y su hoja de etiquetas
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que el dueño le dé un código a un producto que no trae —pan, queso, huevos—, imprima sus etiquetas en una hoja carta y desde entonces lo venda escaneando. Las unidades que ya tenía pasan al código sin cambiar el total.
decisions: [D-002, D-010, D-012]
implements: [FR-018, AC-029, AC-030, AC-031]
---

## Sources

- `.diseno/etiquetas/` — las siete vistas y § Lo que se decidió al validarlo, puntos 1 a 4
- `D-012`, `D-010`, `D-002` · `docs/project/data-model.md` § product_barcode, § stock_movement

## Scope

- Esquema: valor `relabel` en `movement_type`, con su migración.
- Dominio: el codificador EAN-13 pasa de `e2e/apoyo/ean13.ts` a `src/domain/ean13.ts`; generar un
  código de la tienda (prefijo `2`, único, reintento si choca) para un producto sin códigos, y el
  par `relabel` si tiene unidades «sin código»; listar los productos con código de la tienda para
  las etiquetas.
- Ficha: «Generar código» arriba cuando no tiene ninguno; «Código listo» con cuántas etiquetas;
  «Imprimir etiquetas» en «Por código»; «Etiquetado» en el historial, como una sola línea.
- Productos: «Imprimir etiquetas» → buscar, filtrar y marcar con lo marcado guardado entre
  búsquedas → cuántas de cada uno → la hoja carta de 30 (3 × 10), lista para imprimir.
- `scripts/hoja-de-codigos.mts` importa el codificador desde el dominio.

## Out of Scope

- Generar código para un producto que ya tiene uno.
- Otras hojas o impresora térmica: `D-012` deja la puerta, no la hoja.
- Quién puede generar e imprimir: hoy todos son dueños. Los permisos son `T-039`.

## Acceptance Criteria

- [x] CUANDO se genera el código de un producto sin código EL SISTEMA DEBE crear un EAN-13 que
      empiece por `2`, con dígito de control válido y único entre todos los productos (`AC-029`).
- [x] CUANDO ese producto tiene N unidades EL SISTEMA DEBE escribir −N sin código y +N en el
      código nuevo como `relabel`, y el total del producto DEBE quedar igual (`AC-030`).
- [x] CUANDO se escanea en Vender un código de la tienda impreso EL SISTEMA DEBE añadir su producto,
      descontándolo de ese código (`AC-031`).
- [x] CUANDO se marcan productos en una búsqueda y se busca otra cosa EL SISTEMA DEBE conservar los
      marcados, y la hoja DEBE llevar tantas etiquetas de cada uno como se pidieron.
- [x] La etiqueta de la hoja se decodifica con el decodificador real a su código.
- [x] Las pruebas de códigos, venta, anulación e historial de antes siguen pasando.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: `npm test && node scripts/harness-status.mjs && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Todo contra un Postgres local en Docker, nunca contra Neon (pedido del estudio, 2026-09-27).
- Task-specific: imprimir una hoja, pegar una etiqueta y escanearla con el celular en Vender.

## Assumptions

- **Asunción** — once dígitos aleatorios tras el `2` bastan: con miles de productos la probabilidad
  de choque es ínfima, y si choca la unicidad lo rechaza y se reintenta.

## Risks

- La migración toca la base del cliente. Añade un valor al enum y nada más; se aplica a Tienda
  Miriam solo cuando el estudio lo pida.

## Outcome

- Changes: «Generar código» en la ficha de un producto sin código crea un EAN-13 de la tienda
  (prefijo `2`) y pasa lo que había sin código a él con un par `relabel` que suma cero. «Código
  listo» dice cuántas pasaron y ofrece imprimir. Productos → «Imprimir etiquetas»: buscar y filtrar
  como en Productos, marcar (lo marcado vive en la dirección y sobrevive a otra búsqueda), cuántas
  de cada uno, y la hoja carta de 30 lista para imprimir, sin navegación y una hoja por página. El
  historial dice «Etiquetado» en una sola línea; el grupo «sin código» en cero ya no se muestra.
- Files: `drizzle/0006_etiquetado.sql`, `src/db/schema.ts`, `src/domain/{ean13,etiquetas,catalogo,movimientos,codigos}.ts`
  y sus pruebas, `src/ui/{codigo-de-barras,iconos}.tsx`, `src/app/(protegido)/{layout,navegacion}.tsx`,
  `src/app/(protegido)/catalogo/{lista.tsx,[id]/*,etiquetas/*}`, `e2e/{etiquetas,aspecto,navegacion}.spec.ts`,
  `e2e/apoyo/ean13*.ts`, `scripts/hoja-de-codigos.mts`, `docs/project/*`, `D-012`, `.diseno/etiquetas/`
- Baseline result: `npm test` 103/103 · `harness-lint`, `typecheck`, `lint` limpios · `test:e2e`
  130/130 (2 locales saltadas), contra Postgres 17 en Docker.
- Final result (tras el arreglo del PDF): `npm test` 137/137, `test:e2e` 139/139 ×2. Antes:
  `npm test` **122/122** · `harness-lint`, `typecheck`, `lint` limpios · `build` ok ·
  `db:verify` ok · `test:e2e` **133/133** en 5 de 7 corridas completas; en las otras dos cayeron
  intermitentes (ver Review). Hoja impresa a PDF: tamaño carta, 30 → 1 página, 32 → 2.
- Decisions recorded: `D-012`.
- Deploy: 2026-09-29, pedido por el estudio. `0006` y `0007` aplicadas a Tienda Miriam tras un
  respaldo de todas sus tablas (5 productos, 2 ventas, 10 movimientos: iguales antes y después);
  Worker en la versión `9919b318`. Humo: acceso 200 con «Lumy Bella», pantallas protegidas → acceso,
  ingreso falso 401.
- Follow-up: pegar una etiqueta impresa y escanearla con el celular (§ Verification, a mano).

## Review

- Alta · `etiquetas/hoja/imprimir.tsx` · reportado por el estudio en producción el 2026-09-29:
  «Imprimir» no hacía nada en el celular. La app abierta desde su ícono no tiene menú del
  navegador, y en iPhone `window.print()` no hace nada; ninguna prueba lo veía, porque en el
  navegador de prueba imprimir no abre nada. Arreglado: la hoja sale también en PDF
  (`domain/hoja-pdf.ts`, escrito a mano, sin dependencias); en el celular «Imprimir» abre el menú
  de compartir con el PDF —imprimir o guardar— y en computador el diálogo del navegador; «Descargar
  PDF» siempre. Renderizado con Quick Look y leído con el decodificador real: los códigos del PDF se
  leen. `etiquetas.spec` toca «Imprimir» como celular y como computador.

- Media · `e2e/navegacion.spec.ts:28` · Inicio enseña los tres primeros por reponer por nombre, y
  «Jabón» caía de la lista cuando otra prueba dejaba en cero un producto que ordena antes; la nueva
  «Huevo» lo destapó (falló 1 de 133). Arreglado: el producto empieza por un dígito y el de esta
  tarea se llama «Yuca». Con `--repeat-each=3` fallaba 2/21; con el arreglo, 133/133.
- Baja · `etiquetas/hoja/page.tsx` · la última hoja dejaba una página en blanco al imprimir:
  medido a PDF, 32 etiquetas daban 3 páginas. Arreglado (`not-last:`): 30 → 1, 32 → 2.
- Baja · `etiquetas/copias.tsx` · vaciar el campo para teclear otro número lo volvía 1. Arreglado.
- Media · `e2e/busqueda-en-venta.spec.ts:102` · abierta, previa · intermitente en paralelo: 2 de 7
  corridas completas tuvieron fallos, una de ellas en esta prueba; sola pasa 10/10. Es la misma
  que `T-032` midió fallando igual en HEAD. No la toca este cambio; necesita su propia tarea.
- Baja · `[id]/ficha.tsx` · el historial contaba el par «Etiquetado» como dos movimientos y
  enseñaba una línea. Arreglado, con aserción en `etiquetas.spec`.

## Validation

- Validated by:
- Date:
