---
id: T-015
title: Instalable en la pantalla de inicio
status: done
profile: team
harness: 0.9.0
role: Implementer
goal: Que el dueño abra orbiq tocando un ícono, a pantalla completa y sin barra de direcciones, igual en Android que en iPhone. Hoy llega escribiendo una dirección en el navegador, que es el paso que compite con no usarla.
decisions: [D-009]
implements: [FR-010, NFR-003]
---

## Sources

- `D-009` § Decision — instalable en las dos plataformas con `display: standalone`
- `docs/project/brief.md` § Users, § Constraints — de pie, una mano, el dispositivo que haya
- `docs/project/design-handoff.md` § Visual References — «la comparación no son otras aplicaciones
  de inventario: es el cuaderno»
- Retroalimentación del demo, 2026-09-08: «sería más sencillo con una app móvil»

## Scope

- Un manifest servido por la aplicación, con `display: standalone`, `start_url`, `scope`, `lang`,
  nombre corto y largo, y color de fondo.
- Los íconos que las dos plataformas piden: 192 y 512 px, uno `maskable` para que Android no lo
  recorte dentro de su máscara, y el `apple-touch-icon` que iOS usa.
- El `theme_color` que pinta la barra de estado, resuelto **por tema**: el manifest lleva uno solo,
  así que el par claro/oscuro va por `<meta name="theme-color" media="...">`. Hoy el tema se decide
  en el servidor leyendo la cookie (`src/app/layout.tsx`), y esto no puede romper eso.
- Actualizar el comentario de `src/app/layout.tsx` que hoy cita `D-007` y dice lo contrario de lo
  que esta tarea hace.
- Un recorrido de Playwright que lea el manifest servido y falle si pierde `display: standalone`,
  si un ícono declarado no se sirve, o si `start_url` deja de resolver.

## Out of Scope

- Service worker, caché y funcionamiento sin conexión. `D-005` y `NFR-004` dicen que la aplicación
  exige conexión y falla explícito; un service worker que sirva pantallas viejas contradice eso y
  necesitaría su propia decisión.
- Notificaciones push. No hay nada que notificar todavía.
- Un aviso de «instalar» dentro de la aplicación. La instalación la hace el estudio al entregar el
  equipo; un banner es ruido para un dueño que ya la tiene instalada.
- El escáner. Es `T-016`.

## Acceptance Criteria

- [x] CUANDO se abre la aplicación desde el ícono de la pantalla de inicio EL SISTEMA DEBE mostrarla
      a pantalla completa, sin barra de direcciones y con su propia tarjeta en el conmutador.
- [x] CUANDO Android instala la aplicación EL SISTEMA DEBE ofrecer un WebAPK, no un marcador — lo
      que exige manifest válido, `start_url` dentro de `scope` e ícono de 512 px `maskable`.
- [x] CUANDO el dispositivo está en tema oscuro EL SISTEMA DEBE pintar la barra de estado con el
      `bg` oscuro de `design-handoff.md`, y con el claro cuando está en claro.
- [x] La primera pintura sigue saliendo con el tema correcto, sin destello: lo de `T-007` no se
      toca.
- [x] El recorrido nuevo falla si el manifest pierde `display: standalone` o si un ícono declarado
      devuelve 404.
- [x] Las pruebas de `T-007` y `T-010` siguen pasando: el tema y el contraste no cambian.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: `npm test && node scripts/harness-status.mjs && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Task-specific: instalar de verdad en un Android y en un iPhone, y confirmar en cada uno que no
  aparece la barra de direcciones y que el ícono no sale recortado ni con fondo blanco. Es lo único
  que prueba lo que la tarea promete, y no lo puede hacer Playwright.

## Assumptions

- **Asunción** — el dueño no instala la aplicación por su cuenta. La instala el estudio al entregar
  el equipo, en ambas plataformas. Si resultara que se entrega por un enlace y nadie acompaña,
  faltaría el aviso de instalación que aquí está fuera de alcance.
- **Asunción** — no hay marca todavía (`design-handoff.md` § Visual References), así que los íconos
  salen de los tokens actuales. Se reemplazan cuando orbiq tenga identidad, y no son una decisión.

## Risks

- **Esta tarea no puede empezar mientras `D-009` esté `proposed`.** `D-007` sigue aceptada y dice
  «no se declara instalable en iOS», que es exactamente lo contrario. Al aceptar `D-009` hay que
  pasar `D-007` a `superseded`, como se hizo con `D-004`.
- Un manifest mal formado degrada en silencio a marcador: el ícono queda, y al tocarlo abre el
  navegador con su barra. Por eso hay un criterio que lo comprueba en vez de darlo por bueno.
- `theme_color` y la cookie de tema pueden desincronizarse: el manifest es estático y la cookie no.
  Por eso el color va en la etiqueta con `media`, que sí sigue al dispositivo.

## Outcome

- Changes: manifest con `display: standalone`, íconos para las dos plataformas —incluido uno
  `maskable` y el de iOS—, `theme-color` por tema, y el comentario de `layout.tsx` que citaba
  `D-007` y decía lo contrario. Los íconos se **generan** de los tokens de `design-handoff.md`.
- Files: `src/app/manifest.ts`, `src/app/layout.tsx`, `scripts/generar-iconos.mjs`,
  `e2e/instalable.spec.ts`, `package.json`, `.gitignore`
- Baseline result: `npm test` 65/65 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok.
- Final result: `npm test` 65/65 · `harness-lint` clean · `typecheck` clean · `lint` clean ·
  `build` ok · `test:e2e` **78/78** (75 antes).
- Decisions recorded: ninguna nueva. Ejecuta `D-009`.
- Follow-up: instalar en un Android y en un iPhone de verdad y mirar que no aparezca la barra de
  direcciones ni el ícono salga recortado. Es lo que pide `## Verification` y no lo puede hacer
  Playwright.

## Review

- **Un manifest roto no da error: degrada a marcador.** El ícono queda puesto y al tocarlo abre el
  navegador entero — exactamente lo que esta tarea venía a quitar, y sin nada en ninguna consola.
  Por eso las pruebas comprueban `display`, que `start_url` caiga dentro de `scope`, y que **cada
  ícono declarado se sirva de verdad**. Se verificó que fallan: con `display: "browser"` y con un
  ícono inexistente, cada una cae por su motivo.
- **Los íconos se generan de los tokens, no se guardan.** `design-handoff.md` dice que todavía no
  hay marca, así que un PNG guardado hoy quedaría desfasado del acento en cuanto cambie. El día que
  orbiq tenga identidad, el script se borra y entran los archivos de un diseñador.
- **El `maskable` es un ícono aparte y no una copia.** Android recorta con la máscara de su lanzador
  y solo garantiza el 80% central; la marca se dibuja más pequeña ahí. Sin él, el sistema encoge el
  otro y lo deja flotando en un círculo blanco.
- **`theme-color` no sigue a la cookie del tema, y es correcto.** La barra de estado es del sistema:
  quien fuerza claro con el teléfono en oscuro ve la barra oscura. Atarla a la elección de `T-007`
  habría exigido pintarla desde el cliente y devuelto el destello que esa tarea quitó.
- Sin service worker, a propósito. `NFR-004` y `D-005` dicen que la aplicación exige conexión y
  falla explícito; uno que sirviera pantallas viejas diría lo contrario y necesitaría su decisión.

## Validation

- Validated by: Juan Sebastián León Velásquez
- Date: 2026-09-08
- La apertura desde el ícono la firma el estudio. Lo que sí quedó automatizado es el manifest y que
  cada ícono se sirva (`e2e/instalable.spec.ts`); que no salga la barra de direcciones en un
  teléfono concreto no lo puede comprobar Playwright.

## Trace

- `docs/traces/2026-09-08_T-015_implementer.md`
