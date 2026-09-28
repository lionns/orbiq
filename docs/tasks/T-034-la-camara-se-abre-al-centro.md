---
id: T-034
title: La cámara se abre al centro, y se escanea también en la ficha
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que tocar «Escanear» abra la cámara en un visor al centro de la pantalla, que se note que se está dentro de la cámara, en celular y computador; que el botón diga «Escanear» también en computador; y que «Añadir otro código» en la ficha se pueda escanear.
decisions: [D-009, D-010]
implements: [FR-002, FR-016, AC-006]
---

## Sources

- `.diseno/codigos/Visor`, `Visor-PC`, `Ficha-codigo`, validados por el estudio el 2026-09-27
- Pedido del cliente probando `T-032` y `T-033` en un teléfono real, el mismo día

## Scope

- `ObjetivoDeEscaneo`: la cámara se abre en un visor a pantalla completa (celular) o en una ventana
  centrada (computador), oscuro en los dos temas, con marco de encuadre, «Cerrar» (y Esc),
  «Escribir el código» y, en la venta, lo que lleva la venta en curso.
- Al leer, el visor se cierra solo, como ya se cerraba la cámara (`T-016`).
- El botón dice «Escanear» en computador, como en el celular.
- «Añadir otro código» en la ficha trae «Escanear»; lo leído queda en el campo. Esa instancia no
  escucha al lector en el documento: le robaría las lecturas al buscador de Productos.

## Out of Scope

- Escaneo continuo o por lotes (`T-016` § Out of Scope). Linterna, zoom, elegir cámara.

## Acceptance Criteria

- [x] CUANDO se toca «Escanear» EL SISTEMA DEBE abrir la cámara en un visor centrado que tapa la
      pantalla, en celular y computador.
- [x] CUANDO se cierra el visor, con «Cerrar», con Esc o al leer un código, EL SISTEMA DEBE apagar
      la cámara (`e2e/escaneo-camara.spec.ts`).
- [x] En computador el botón dice «Escanear».
- [x] CUANDO se escanea desde «Añadir otro código» EL SISTEMA DEBE dejar el número en el campo, y
      el lector de la pantalla de Productos DEBE seguir abriendo la ficha (`AC-006`).

## Verification

- Baseline: la corrida final de `T-032` y `T-033`, el mismo día y contra el mismo Postgres local.
- Final: `npm test && node scripts/harness-status.mjs && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Task-specific: abrir el visor en un teléfono real por el túnel y leer un código de fábrica.

## Assumptions

- None

## Risks

- El visor tapa la barra de secciones y Cobrar mientras está abierto. Es lo pedido; «Cerrar»
  siempre está a la vista.

## Outcome

- Changes: la cámara se abre en un visor al centro (pantalla completa en celular, ventana en
  computador), oscuro en los dos temas, montado en `body` por un portal; «Cerrar», Esc, «Escribir el
  código» y lo que lleva la venta. «Escanear» también en computador. La ficha escanea el código
  nuevo con el mismo visor, sin escuchar al lector del documento (`conLector={false}`).
- Files: `src/ui/objetivo-de-escaneo.tsx`, `src/app/globals.css`,
  `src/app/(protegido)/{venta.tsx,catalogo/[id]/codigo.tsx}`, `e2e/escaneo-camara.spec.ts`,
  `.diseno/codigos/{Visor,Visor-PC,Ficha-codigo}.dc.html`
- Baseline result: el cierre de `T-032`/`T-033`.
- Final result: `npm test` 89/89 · `harness-lint`, `typecheck`, `lint` limpios · `build` ok ·
  `test:e2e` 111/113 en paralelo, las dos que caen son intermitentes previas y pasan solas (24/24).
  Corrido en el puerto 3100 con servidor propio: en el 3000 había un servidor de desarrollo ajeno
  que la configuración habría reutilizado.
- Decisions recorded: ninguna.
- Enfoque (pedido tras probarlo, prototipo validado): la cámara pide 1280×720 y enfoque continuo
  después de enseñar la imagen; «2×» y tocar para enfocar solo donde la cámara los admite
  (`ajustesDeCamara`; Android, los dos; iPhone reciente, el zoom). «Normal» es el zoom con que
  abrió la cámara, no su mínimo: en iPhone el mínimo es el gran angular y «1×» alejaba de más; aviso «¿Se ve borroso? Aleja un poco el teléfono.».
  Final: `npm test` 94/94 · `test:e2e` 115/115 en el puerto 3100.
- Follow-up: leer un código de fábrica con el visor en un teléfono real.

## Review

- Media · `playwright.config.ts` · `reuseExistingServer` reutiliza lo que haya en el 3000, aunque
  apunte a otra base. Un `npm run dev` contra Neon abierto al correr la suite haría que las pruebas
  escribieran allí. No se cambió aquí; conviene decidirlo.
- Baja · el visor toma la paleta oscura con tokens `visor-*` y no con colores fijos (`T-008`).
- Baja · `e2e/escaneo-camara.spec.ts:38` · el plazo para que la cámara arranque pasa de 2 s a 5 s:
  con cuatro navegadores abriendo cámaras tardaba más (1 de 24). Lo que la prueba fija —que no se
  apague sola una vez viva— sigue siendo la espera de 3 s de después.

