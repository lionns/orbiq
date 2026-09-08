## Trace

- 2026-09-08 — role: Implementer
  - read: `T-016`, `D-009`, `architecture.md` § Stack, `src/domain/catalogo.ts`,
    `src/app/(protegido)/venta.tsx`, `e2e/apoyo.ts`
  - did: objetivo de escaneo con tres entradas y una salida; `resolverCodigo` en dominio; alta desde
    código desconocido sin salir de la venta; decodificador de respaldo elegido y autoalojado
  - files: `src/domain/escaneo.ts`, `src/ui/objetivo-de-escaneo.tsx`, `src/domain/catalogo.ts`,
    `src/app/(protegido)/*`, `scripts/copiar-wasm.mjs`, `e2e/escaneo.spec.ts`, `e2e/apoyo/ean13.ts`
  - checks: baseline `npm test` 49/49 y build en verde antes de empezar; final `npm test` 65/65,
    `harness-lint` clean, typecheck, lint, build, `test:e2e` 75/75
  - assumptions: pistola lectora en modo HID; formatos EAN-13 y EAN-8 (UPC-A entra como EAN-13)
  - blockers: la cámara no se pudo probar de extremo a extremo — el dispositivo de vídeo falso de
    Chromium entrega negro al lienzo, medido en headless y con navegador visible. Sustituida por
    prueba de unidad del decodificador; queda la comprobación manual de `NFR-001`.
