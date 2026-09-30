---
id: T-039
title: Personas del negocio — el dueño da de alta, restablece y da de baja a sus empleados
status: review
profile: team
harness: 0.9.0
role: Implementer
goal: Que el dueño le dé acceso a quien atiende por él, y que ese empleado venda, busque y vea las ventas pero no pueda anular, cambiar precios, editar productos ni corregir el conteo. Una baja lo saca en el momento y conserva todo lo que hizo.
decisions: [D-008, D-013]
implements: [FR-019, AC-032, AC-033, AC-034, AC-035]
---

## Sources

- `.diseno/personas/` — las nueve vistas y § Lo que se decidió al validarlo, puntos 1 a 4
- `D-013`, `D-008` · `docs/project/data-model.md` § user

## Scope

- Esquema: `user.disabled_at`, con su migración.
- Dominio: `permisos.ts` (`puede`); la sesión lleva el rol y una baja es una sesión ausente;
  `personas.ts`: listar, dar de alta, cambiar contraseña, dar de baja y reactivar; el script de alta
  del dueño usa el mismo alta.
- Better Auth rechaza crear sesión a una persona dada de baja.
- Cada acción de servidor que anula, edita, da de alta, añade códigos o corrige el conteo comprueba
  el permiso; también las páginas de alta y de código desconocido.
- Pantallas: «Personas» en Ajustes (solo el dueño), lista, añadir, una persona, dar de baja. Para el
  empleado: la ficha sin Acciones y con una línea que dice a quién pedir un cambio, Ventas sin
  Anular, Vender sin Deshacer ni alta desde un código desconocido, sin «Nuevo producto».
- El detalle de una venta dice quién la cobró.

## Out of Scope

- Que el empleado cambie su propia contraseña.
- Más roles o permisos a medida: `D-013` deja la puerta, no el rol.
- Iniciar sesión con Google (`D-008`).

## Acceptance Criteria

- [x] CUANDO el dueño da de alta a un empleado EL SISTEMA DEBE crear su usuario con rol `staff` y
      credencial de contraseña, y el empleado DEBE poder entrar con ellos (`AC-032`).
- [x] CUANDO un empleado llama directo a anular, editar, dar de alta, añadir código o corregir el
      conteo EL SISTEMA DEBE rechazarlo sin cambiar nada, aunque la pantalla no lo ofrezca (`AC-033`).
- [x] CUANDO el dueño da de baja a un empleado EL SISTEMA DEBE cerrar sus sesiones abiertas y
      rechazar que vuelva a entrar; sus ventas DEBEN seguir con su nombre (`AC-034`).
- [x] CUANDO se abre el detalle de una venta EL SISTEMA DEBE decir quién la cobró (`AC-035`).
- [x] El dueño no puede darse de baja a sí mismo.
- [x] Las pruebas de venta, anulación, ficha y acceso de antes siguen pasando con el dueño.

## Verification

- Baseline: `npm test && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build`
- Final: `npm test && node scripts/harness-status.mjs && node scripts/harness-lint.mjs && npm run typecheck && npm run lint && npm run build && npm run test:e2e`
- Todo contra un Postgres local en Docker, nunca contra Neon (pedido del estudio, 2026-09-27).
- Task-specific: entrar como empleado en un celular y dar de baja desde el computador del dueño;
  la siguiente acción del celular lo saca.

## Assumptions

- **Asunción** — el rol se lee de la fila en cada petición, así que un cambio de rol o una baja
  vale desde la siguiente, sin esperar a que venza la sesión.

## Risks

- La migración toca la base del cliente: una columna nula nueva. Se aplica a Tienda Miriam solo
  cuando el estudio lo pida.

## Outcome

- Changes: `user.disabled_at`; roles `owner` y `staff` («Empleado») con `puede(rol, accion)` en
  `permisos.ts`; la sesión trae el rol y una baja es sesión ausente; Better Auth rechaza crear
  sesión a alguien de baja (`databaseHooks.session.create.before`, el punto que usa su plugin
  `admin`, verificado en 1.7.3). Cada acción que anula, edita, da de alta, añade o genera códigos o
  corrige el conteo comprueba el permiso. Personas en Ajustes: lista, añadir, una persona, cambiar
  contraseña, dar de baja y reactivar. El empleado no ve Acciones en la ficha, ni Anular, ni
  Deshacer un cobro, ni «Nuevo producto», y un código desconocido le dice a quién avisar.
  `alta-dueno` usa el mismo alta.
- Files: `drizzle/0007_personas.sql`, `src/db/schema.ts`, `src/lib/auth.ts`,
  `src/domain/{permisos,persona,personas,session}.ts` y sus pruebas, `src/app/acceso/acciones.ts`,
  `src/app/(protegido)/{acciones.ts,venta.tsx,navegacion.tsx,page.tsx,vender/*,ventas/[id]/*,ajustes/**,catalogo/**}`,
  `src/ui/iconos.tsx`, `scripts/alta-dueno.mts`, `e2e/{personas,aspecto}.spec.ts`, `e2e/apoyo.ts`,
  `docs/project/*`, `D-013`, `.diseno/personas/`
- Baseline result: la final de `T-038`, sobre la que arranca: `npm test` 122/122, `test:e2e`
  133/133, `harness-lint`, `typecheck`, `lint` limpios.
- Final result: `npm test` **132/132** · `harness-lint`, `typecheck`, `lint` limpios · `build` ok ·
  `db:verify` ok · `test:e2e` **138/138** en 3 de 3 corridas completas · `alta-dueno` probado a
  mano contra la base local: alta con rol `owner` y cambio de contraseña.
- Decisions recorded: `D-013`.
- Follow-up: aplicar `0007` y desplegar Tienda Miriam cuando el estudio lo pida.

## Review

- Media · `src/domain/personas.ts` · «avísale a …» nombraba al dueño más antiguo; con varios
  dueños —el operador del estudio también lo es— mandaba al empleado a otra persona. Arreglado:
  solo nombra si hay uno activo, si no dice «al dueño» (`aQuienAvisarEntre`, con prueba).
- Baja · `ajustes/personas/acciones.ts` · un dueño podía cambiar la contraseña de otro dueño desde
  la acción. Arreglado: solo la de un empleado o la propia; la de otro dueño, el estudio.
- Baja · `nueva/formulario.tsx` · al volver con error, React vaciaba el formulario. Arreglado:
  campos controlados, con aserción en `personas.spec`.
- La llamada directa a Anular se prueba reenviando la petición real del dueño con la sesión del
  empleado, con control positivo: la misma petición del dueño sí anula.

## Validation

- Validated by:
- Date:
