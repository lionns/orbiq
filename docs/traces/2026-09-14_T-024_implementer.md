## Trace

- 2026-09-14 — role: Implementer
  - read: `T-024`, capturas de las cinco pantallas en los dos temas, `src/ui/`, ficha e historial
  - did: precio dominante en la ficha; flecha en los tres enlaces de volver; glifo propio y giratorio
    en `SeccionPlegable` y en «Filtros»; encabezado del día en `long` para que quepa en una línea
  - files: `src/ui/seccion-plegable.tsx`, `src/app/(protegido)/catalogo/{filtros.tsx,[id]/page.tsx,nuevo/page.tsx}`,
    `src/app/(protegido)/ventas/{page.tsx,[id]/page.tsx}`, `src/app/(protegido)/venta.tsx`
  - checks: baseline verde; final `npm test` 69/69, typecheck, lint, build, harness-lint limpios,
    `test:e2e` 92/92 en dos pasadas
  - assumptions: ninguna
  - blockers: ninguno
  - mirado antes de darlo por hecho: capturas de ficha, catálogo y ventas en los dos temas, revisadas
    antes de cerrar y no después de que el estudio lo devolviera
