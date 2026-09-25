---
id: T-030
title: La prueba del decodificador no depende de la red
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que `npm test` dé el mismo resultado con y sin internet. Hoy las dos pruebas de `e2e/apoyo/ean13.test.ts` descargan el WASM del decodificador de un CDN al correr, así que en un entorno sin red la línea base sale en rojo (67/69) y bloquea cualquier tarea, como le pasó a `T-028`.
decisions: [D-005, D-006]
implements: [FR-003]
---

## Sources

- `docs/traces/2026-09-24_T-028_implementer.md` — el bloqueo, visto en el entorno de Codex
- `node_modules/zxing-wasm/dist/es/share.js:589` — `locateFile` apunta por defecto a `fastly.jsdelivr.net`
- `scripts/copiar-wasm.mjs` y `src/ui/objetivo-de-escaneo.tsx` — la aplicación ya sirve el WASM
  desde su origen; solo la prueba lo pedía fuera

## Scope

- `e2e/apoyo/ean13.test.ts` carga el binario que ya trae `node_modules/zxing-wasm`, con
  `prepareZXingModule`, en vez de dejar que la librería lo descargue.

## Out of Scope

- La aplicación, el script de copia y cualquier otra prueba. Nada de eso depende de la red.
- Otros motivos del bloqueo de `T-028`: el journal ya se corrigió aparte, y el puerto del build es
  del entorno, no del proyecto.

## Acceptance Criteria

- [x] CUANDO se corre `npm test` con las peticiones a `jsdelivr` bloqueadas EL SISTEMA DEBE dar
      69/69; antes del cambio, ese mismo bloqueo da 67/69.
- [x] Las dos pruebas siguen leyendo un EAN-13 y un UPC-A de verdad: no se simula el decodificador.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: el mismo comando, con `node scripts/harness-status.mjs` antes del lint, más `npm run test:e2e`
- Task-specific: `npm test` con un `--import` que rechaza cualquier `fetch` a `jsdelivr`, antes y
  después del cambio

## Assumptions

- Ninguna.

## Risks

- Ninguno: el cambio vive en un archivo de prueba.

## Outcome

- Changes: la prueba lee `zxing_reader.wasm` del paquete instalado y se lo pasa al decodificador
  con `prepareZXingModule`, en vez de dejar que lo descargue de `fastly.jsdelivr.net`.
- Files: `e2e/apoyo/ean13.test.ts`
- Baseline result: `npm test` 69/69 con red y **67/69 sin ella** (las dos de este archivo), que es
  el bloqueo de `T-028` reproducido aquí · `harness-lint`, `typecheck`, `lint` y `build` limpios.
- Final result: `npm test` **69/69 con y sin red** · `harness-lint`, `typecheck`, `lint` limpios ·
  `build` ok · `test:e2e` 94/94.
- Decisions recorded: ninguna.
- Follow-up: ninguno. `T-028` vuelve a `ready`.

## Review

- **El fallo se reprodujo antes de tocar nada**, bloqueando solo las peticiones a `jsdelivr`: salen
  las mismas dos pruebas en rojo que vio Codex. El mismo bloqueo, después del cambio, da 69/69.
- **La aplicación no tenía el defecto**: sirve el WASM desde su origen desde `T-016`. Solo la
  prueba se había quedado pidiéndolo fuera, y con red nadie lo notaba.

## Validation

- Validated by: Juan Leon
- Date: 25/09/2026

## Trace

- `docs/traces/2026-09-24_T-030_implementer.md`
