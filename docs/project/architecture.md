# Architecture

<!-- The foundation lives in docs/decisions/ as accepted decisions carrying `- Foundation: <topic>`.
     This file summarizes what was decided there; it is not where architecture gets chosen. -->

Las puertas de una sola vía están cerradas en `docs/decisions/` (D-001 … D-007). Este archivo
registra las herramientas que las cumplen. Una herramienta se cambia con una tarde de trabajo; por
eso vive aquí y no en una decisión.

## Stack

| Área | Elección | De dónde sale |
| --- | --- | --- |
| Lenguaje | TypeScript, modo estricto | Las funciones de dominio se prueban solas (`D-001`); el tipo es la primera prueba |
| Runtime | Node.js — versión fijada en `package.json` | Local hoy `v26.8.1` (`node -v`); la de despliegue se fija contra lo que soporte Vercel al crear el proyecto |
| Framework | Next.js, App Router | Un solo desplegable con interfaz y acceso a datos juntos (`D-001`) |
| Interfaz | React + Tailwind CSS | Responsive pulgar primero sin construir una capa de diseño propia todavía (`D-007`) |
| Base de datos | PostgreSQL gestionado en Neon | Relacional gestionado con respaldo automático del proveedor (`D-002`) |
| Acceso a datos | Drizzle ORM | Consultas con forma de SQL, sin repositorios ni adaptadores (`D-003`) |
| Migraciones | drizzle-kit, versionadas en el repo | Migrar es rutina desde la tarea uno (`D-002`) |
| Identidad y sesión | Better Auth, con adaptador de Drizzle | Sesión en base de datos y cookie opaca de fábrica (`D-008`) |
| Identificadores | UUIDv7 generados en la aplicación | Ordenados en el tiempo, no secuenciales (`D-002`) |
| Pruebas | Vitest (dominio) + Playwright (rebanada completa) | Suite rápida y recorrido real (`D-006`) |
| Hospedaje | Vercel, un proyecto por negocio | Un despliegue por negocio (`D-005`) |

Queda **sin decidir** aquí, y se resuelve en su tarea sobre evidencia: la librería de lectura de
código de barras que respalda a `BarcodeDetector` donde no exista.

## Frontend

- Una sola aplicación React servida por Next, con rutas del App Router. No hay cliente separado de
  un API (`D-001`).
- Se diseña primero para pantalla pequeña y una mano, y se ensancha con breakpoints. Ensanchar sale
  más barato que reducir (`D-007`, `brief.md` § Constraints).
- Componentes de servidor por defecto; componentes de cliente solo donde hay interacción real —
  cámara, cuadrícula de venta, total en vivo.
- El estado del servidor vive en el servidor y se revalida. No hay store global de cliente hasta que
  un caso lo pida (`D-003`).
- El escaneo entra por un único componente objetivo que acepta cámara, lector de teclado y texto
  tecleado por igual, con `BarcodeDetector` nativo donde exista (`D-007`).
- Accesibilidad: objetivos táctiles grandes, foco visible, y la aplicación entera operable por
  teclado — un lector de códigos de barras *es* un teclado.

## Backend

- No hay servidor aparte. Server Actions y route handlers son entradas delgadas (`D-001`).
- Toda regla de negocio vive en funciones de dominio bajo `src/domain/`, sin importar nada de
  `next/*`. Se invocan desde una pantalla, una ruta HTTP o un job por igual (`D-001`).
- Escribir lógica de negocio dentro de un handler es un hallazgo de review, no un atajo (`D-001`).
- Las funciones de dominio consultan la base directamente por Drizzle: sin puertos, sin
  repositorios, sin adaptadores (`D-003`).
- La aplicación exige conexión y falla de forma explícita. No hay cola diferida ni reintento en
  segundo plano (`D-005`).

## Data

- Una base por negocio. Ningún identificador de negocio en el esquema todavía (`D-005`).
- Existencias como libro inmutable: cada cambio es una fila de movimiento que nunca se edita ni se
  borra. El saldo es un valor materializado, recomputable desde el libro (`D-002`).
- Migraciones versionadas con drizzle-kit, en el repo, aplicadas en el despliegue. Nunca `push`
  contra una base con datos.
- Una venta es una transacción. La idempotencia se consigue con un identificador de venta generado
  en el cliente y una restricción de unicidad: reintentar no descuenta dos veces (`D-005`).
- Respaldos automáticos del proveedor. La retención concreta se anota aquí al contratar el plan
  (`D-002`).

## Security

Lo de abajo se verificó contra el código de Better Auth el 2026-09-06, no contra su documentación,
que no lo cubre. Las rutas citadas son de su repositorio.

- **Contraseña con scrypt**, el algoritmo por defecto de la librería. La petición de usar Argon2id
  por defecto fue cerrada como no planeada; el override `emailAndPassword.password.hash` existe si
  se quiere cambiar, y hacerlo después es rehashear en el siguiente inicio de sesión (`D-008`).
- **Sesión de servidor**, como exige `D-008`: una fila en la tabla de sesión y una cookie que solo
  lleva un identificador. No hay token con contenido en el navegador.
- **El token es aleatorio criptográfico.** `createSession` usa `generateId(32)`, que sale de
  `crypto.getRandomValues` con muestreo por rechazo para evitar el sesgo del módulo
  (`better-auth/utils`, `src/random.ts`). Son 32 caracteres sobre alfabeto de 62 — unos 190 bits — y
  no está ordenado en el tiempo, que es lo que `data-model.md` § session exigía.
- **Atributos de cookie por defecto:** `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` bajo
  HTTPS y prefijo `__Secure-` (`packages/better-auth/src/cookies/index.ts`).
- La sesión dura deliberadamente mucho: el dueño no puede tener que teclear la clave cada mañana
  mientras atiende (`D-008`). Fijada en **30 días con renovación diaria** — el valor de fábrica son
  7 días, que en una tienda significa volver a teclear la clave cada semana. Los atributos
  resueltos se comprueban en `e2e/sesion.spec.ts`, no se dan por buenos.
- **Un rechazo de acceso no distingue si el correo existe.** El mensaje es único, y la librería
  calcula el hash igual cuando el usuario no existe para no dejar una diferencia de tiempo
  (`api/routes/sign-in.ts`).
- **Sin registro público.** Cuando se active un proveedor externo, `disableSignUp` hace que el
  callback rechace una cuenta que el estudio no dio de alta. El alta y el restablecimiento los hace
  el estudio a mano (`D-008`).
- Los secretos entran por variables de entorno del proyecto. Ninguno vive en el repositorio.
- La validación de entrada ocurre en el borde de la función de dominio, no en el handler — así sirve
  igual a la pantalla de hoy y a la ruta HTTP de mañana (`D-001`).
- **La guardia vive donde se leen los datos**, en el layout del grupo `(protegido)`, no en un
  middleware que solo mira si hay cookie: una cookie vencida o inventada no debe llegar a una
  consulta. Toda pantalla del negocio cuelga de ahí, así que dejar una sin proteger exige sacarla
  del grupo a propósito (`AC-001`).
- **`AC-X03` dejó de ser una promesa escrita.** `eslint.config.mjs` prohíbe importar el framework
  desde `src/domain/`, así que romper la regla falla `npm run lint` en vez de esperar a un review.

**Moneda:** peso colombiano, sin centavos, en `src/domain/moneda.ts`. No es una columna ni una
decisión de arquitectura: un despliegue por negocio es una moneda por base (`D-005`).

## Deployment

- Un proyecto de Vercel y una base de Neon por negocio (`D-005`).
- Despliegue desde `main`. Las migraciones corren antes de que la versión nueva reciba tráfico.
- Reversión: volver a la versión anterior en Vercel. Una migración destructiva no se revierte sola;
  por eso el libro es inmutable y las correcciones son movimientos nuevos (`D-002`).
- Observabilidad: **sin decidir**. Se resuelve cuando haya un negocio real operando y algo que
  observar.
- El costo crece lineal con los clientes, y el despliegue habrá que automatizarlo antes del quinto
  (`D-005`).

## Known Constraints

- Serverless no sostiene conexiones vivas: se conecta por el string agrupado de Neon. Una función
  que abra su propia conexión por invocación agota la base.
- El arranque en frío juega contra los tres segundos que pide `brief.md` § Success Measures. El
  escaneo es de cliente y no lo sufre; el alta de un producto sí.
- Dos tableros por cliente — Vercel y Neon. Es el precio de este stack y se paga en el quinto
  negocio, que es exactamente donde `D-005` puso su `Trigger`.
- **El token de sesión se almacena en claro en la base.** Verificado en
  `packages/better-auth/src/db/internal-adapter.ts`: `token: generateId(32)` va directo a la fila y
  no se hashea antes de guardar. Quien lea la base — un respaldo filtrado, una inyección — obtiene
  sesiones usables. La librería no expone dónde intervenir. Engancha con `D-002`, que deja los
  respaldos en manos del proveedor, que es justo donde eso viviría.
- El esquema de identidad lo define una dependencia joven. Se pueden renombrar tablas y columnas
  (`modelName`, `fields`) y añadir campos propios (`additionalFields`), pero su forma es suya.
  Cambiar de librería costaría una migración, no una tarde.
