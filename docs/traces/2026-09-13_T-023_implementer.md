## Trace

- 2026-09-13 — role: Implementer
  - read: `T-023`, `design-handoff.md` § Design Tokens, `layout.tsx`, `venta.tsx`, el lienzo
  - did: `negocio.ts` con el nombre; cabecera de una fila con identidad, navegación y tema; paleta
    invertida —fondo cálido, tarjeta blanca— con cada ratio medido; existencias a su propia línea
  - files: `src/domain/negocio.ts`, `src/app/globals.css`,
    `src/app/(protegido)/{layout.tsx,venta.tsx}`, `docs/project/design-handoff.md`,
    `e2e/tema.spec.ts`
  - checks: baseline verde; final `npm test` 69/69, typecheck, lint, build, harness-lint limpios,
    `test:e2e` 91/91 en dos pasadas
  - assumptions: `NEGOCIO.nombre` es un marcador visible hasta que haya un cliente real
  - blockers: ninguno
  - verificado, no deducido: los colores del lienzo daban surface/bg 1.11 y 1.15, bajo el umbral de
    1.18; el par final se buscó sobre una rejilla. La cabecera de dos filas dejaba el primer
    producto del catálogo en 761 con 740 de pantalla — bajo el pliegue.
  - llevado al estudio antes de implementar: no existe «nombre del negocio» en el esquema, y forzar
    el tema claro exigía borrar una prueba de T-007. Decidió constante de dominio y mantener los
    tres estados.
