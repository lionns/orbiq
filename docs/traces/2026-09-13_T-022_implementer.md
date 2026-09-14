## Trace

- 2026-09-13 — role: Implementer
  - read: `T-022`, `design-handoff.md` § Accessibility Notes, `src/ui/`, el lienzo de `.diseno/`
  - did: `src/ui/iconos.tsx` con el set y la regla; iconos en cámara/cerrar, buscar y
    confirmar/reintentar; `e2e/iconos.spec.ts` fija que ninguno quede sin palabra ni lo anuncie un
    lector de pantalla
  - files: `src/ui/{iconos.tsx,objetivo-de-escaneo.tsx}`,
    `src/app/(protegido)/{venta.tsx,catalogo/filtros.tsx}`, `e2e/iconos.spec.ts`, `package.json`
  - checks: baseline verde; final `npm test` 69/69, typecheck, lint, build, harness-lint limpios,
    `test:e2e` 87 de 91 con fallos que cambian de pasada
  - assumptions: ninguna — la del sacudido de árbol se midió y se confirmó
  - blockers: la suite no da un verde estable. No es de esta tarea: verificado sobre `HEAD`
  - verificado, no deducido: (1) la cabecera con iconos desborda a 472 px en 360 — por eso se
    quitaron; (2) +16 KB de chunks por once iconos, de 696 a 712 KB; (3) las pruebas nuevas caen al
    quitarle la palabra a un icono
