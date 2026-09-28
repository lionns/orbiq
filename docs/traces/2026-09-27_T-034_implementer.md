## Trace

- 2026-09-27 — role: Implementer
  - read: `.diseno/codigos/Visor*`, `Ficha-codigo`, `src/ui/objetivo-de-escaneo.tsx`
  - did: tarea escrita desde el prototipo validado
  - checks: línea base = cierre de `T-032`/`T-033` (89/89, e2e verde salvo intermitentes previas)
  - assumptions: ninguna
  - blockers: ninguno
- 2026-09-27 — role: Implementer
  - did: visor centrado con portal, «Escanear» en computador, escanear en la ficha; capturas del
    visor en celular y computador con la cámara falsa de Chromium
  - checks: `npm test` 89/89, lint/typecheck/harness limpios, `test:e2e` 111/113 (intermitentes
    previas, 24/24 solas), en el puerto 3100
  - assumptions: ninguna
  - blockers: ninguno
- 2026-09-27 — role: Implementer
  - did: enfoque continuo, 720p, «2×» y tocar para enfocar según `ajustesDeCamara`; la imagen se
    enseña antes de ajustar el enfoque
  - checks: `npm test` 94/94, lint/typecheck/harness limpios, `test:e2e` 115/115 (puerto 3100)
  - assumptions: ninguna
  - blockers: ninguno
