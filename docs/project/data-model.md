# Data Model

Alcance MVP: catálogo, ventas e identidad. Cada entidad futura se añade al lado, sin reescribir
estas (`D-003`).

Dos reglas transversales, de `D-002`:

- **Identificadores UUIDv7 generados en la aplicación** para las entidades de negocio — `category`,
  `product`, `sale`, `sale_line`, `stock_movement`. Ordenados en el tiempo, no secuenciales. La
  columna es `text`, no `uuid`: identidad ajena y propia comparten forma, y `sale.id` lo genera el
  cliente.
- Las cuatro tablas de identidad — `user`, `account`, `session`, `verification` — las define Better
  Auth y usan su propio generador (`D-008`). Sus columnas se pueden renombrar, su forma no.
- **El libro nunca se reescribe.** Los movimientos no se editan ni se borran; una corrección es un
  movimiento nuevo.

## Entities

### user

Existe desde la primera migración aunque hoy solo haya una fila (`D-008`). **No guarda credenciales:**
esas viven en `account`, que es lo que hace que sumar Google sea configuración y no migración.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text | yes | |
| email | text | yes | Único. Es el identificador de acceso (`D-008`) |
| name | text | yes | |
| email_verified | boolean | yes | Hoy siempre cierto: el alta la hace el estudio |
| image | text | no | Lo llena el proveedor externo el día que se active |
| role | text | yes | Campo propio vía `additionalFields`. Hoy solo `owner`. Un empleado es una fila más |
| created_at | timestamptz | yes | |
| updated_at | timestamptz | yes | |

### account

Una credencial. Una persona puede tener varias: hoy solo contraseña, mañana también Google.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text | yes | |
| user_id | text | yes | → `user.id` |
| provider_id | text | yes | `credential` para contraseña; `google` cuando se active |
| account_id | text | yes | El identificador de la persona en ese proveedor |
| password | text | no | **Aquí vive el hash**, scrypt. Verificado en `api/routes/sign-up.ts`, `providerId: "credential"` |
| access_token, refresh_token, id_token | text | no | Solo con proveedor externo |
| access_token_expires_at, refresh_token_expires_at | timestamptz | no | Solo con proveedor externo. Los exige Better Auth |
| scope | text | no | Solo con proveedor externo |
| created_at | timestamptz | yes | |
| updated_at | timestamptz | yes | |

### session

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text | yes | |
| token | text | yes | Lo que va en la cookie. Aleatorio criptográfico, ~190 bits. **Se guarda en claro** — ver `architecture.md` § Known Constraints |
| user_id | text | yes | → `user.id` |
| expires_at | timestamptz | yes | Larga por diseño: el dueño no teclea la clave cada mañana (`D-008`) |
| ip_address | text | no | |
| user_agent | text | no | |
| created_at | timestamptz | yes | |
| updated_at | timestamptz | yes | |

### verification

Tabla que exige Better Auth para valores de un solo uso — verificación de correo, restablecimiento.
No estaba en este documento y apareció al generar la migración: es de la dependencia, no del
dominio. Se registra en vez de dejarla como sorpresa (`D-008`, `architecture.md` § Known Constraints).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text | yes | |
| identifier | text | yes | |
| value | text | yes | |
| expires_at | timestamptz | yes | |
| created_at, updated_at | timestamptz | yes | |

### category

Plana. La jerarquía está fuera de alcance y entra como columna padre el día que un negocio la pida.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| name | text | yes | Único |

### product

Cada cosa escaneable es un producto. No hay variantes (`brief.md` § In Scope).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| name | text | yes | |
| price | integer | yes | Unidad mínima de la moneda del negocio. Entero, nunca coma flotante |
| category_id | uuid v7 | no | → `category.id` |
| barcode | text | no | Único **entre los que lo tienen**: índice parcial. Sin código es normal — granel, pan, huevos |
| stock | integer | yes | Saldo materializado, recomputable desde `stock_movement` (`D-002`). Nunca es la verdad, solo la copia rápida |
| is_active | boolean | yes | Un producto no se borra: los movimientos lo referencian |
| created_at | timestamptz | yes | |
| updated_at | timestamptz | yes | |

### sale

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | **Generado en el cliente antes de enviar.** Su unicidad *es* la idempotencia: reintentar tras un fallo de red no descuenta dos veces (`D-005`) |
| total | integer | yes | Suma de las líneas al momento de registrar |
| user_id | text | yes | → `user.id`. Quién la registró (`D-008`) |
| created_at | timestamptz | yes | |
| voided_at | timestamptz | no | Anular no borra la venta |
| voided_by | text | no | → `user.id` |

### sale_line

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| sale_id | uuid v7 | yes | → `sale.id` |
| product_id | uuid v7 | yes | → `product.id` |
| quantity | integer | yes | > 0 |
| unit_price | integer | yes | **Copia del precio al vender.** Subir el precio mañana no puede reescribir lo que se cobró ayer |

### stock_movement

El libro. Inmutable (`D-002`).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| product_id | uuid v7 | yes | → `product.id` |
| quantity | integer | yes | Con signo. Negativo descuenta |
| type | enum `movement_type` | yes | `initial` · `sale` · `sale_void` · `adjustment`. Devoluciones, traslados y compras entran como tipos nuevos, sin tocar filas viejas — añadir un valor al enum es una migración de una línea |
| sale_id | uuid v7 | no | → `sale.id`. Obligatorio cuando `type` es `sale` o `sale_void` |
| reason | text | no | **Obligatorio cuando `type` es `adjustment`** (`brief.md` § In Scope) |
| user_id | text | yes | → `user.id` |
| occurred_at | timestamptz | yes | |

## Indexes

Postgres no indexa las claves foráneas solo. Estos cinco no son afinación anticipada: cada uno
sostiene una propiedad que ya está escrita arriba.

| Index | Sostiene |
| --- | --- |
| `stock_movement (product_id, occurred_at)` | Que el saldo sea **recomputable** desde el libro (`D-002`). Sin él, recomputar un producto recorre la tabla entera |
| `sale (created_at)` | La cuadrícula de frecuentes, que se deriva de las ventas recientes (`US-005`) |
| `sale_line (sale_id)` | Leer una venta con sus líneas |
| `sale_line (product_id)` | Lo vendido de un producto |
| `account (user_id, provider_id)` | La búsqueda exacta que hace el ingreso (`D-008`) |

`product.barcode` tiene su índice único **parcial** — la unicidad y el índice son la misma cosa
(`AC-004`, `AC-005`).

## Relationships

- `user` 1—N `account`, `session`, `sale`, `stock_movement`. Las credenciales cuelgan de `account`, nunca del usuario.
- `category` 1—N `product`. La categoría es opcional.
- `product` 1—N `sale_line`, `stock_movement`.
- `sale` 1—N `sale_line`, y 1—N `stock_movement` (los del registro y los de su anulación).
- `product.stock` == `SUM(stock_movement.quantity)` de ese producto. Es una copia, no una fuente:
  si divergen, manda el libro.

## Validation Rules

- `product.price >= 0`; `sale_line.quantity > 0`; `sale_line.unit_price >= 0`.
- Una venta tiene al menos una línea.
- `sale.total` == suma de `quantity * unit_price` de sus líneas.
- `stock_movement.reason` no vacío cuando `type` es `adjustment`.
- `product.barcode` único entre los no nulos. Varios productos sin código es lo normal.
- Registrar una venta ya registrada (mismo `sale.id`) devuelve la venta existente sin descontar de
  nuevo — no es un error, es un reintento (`D-005`).
- Anular una venta ya anulada se rechaza.
- `session.expires_at > session.created_at`.

## Data Lifecycle

- **Movimientos:** se insertan y nunca se actualizan ni se borran. Es la regla que hace posible todo
  lo que viene después (`D-002`).
- **Ventas:** nunca se borran. Anular escribe `voided_at` y **movimientos compensatorios** de tipo
  `sale_void` que devuelven las existencias. El registro de que se vendió y se anuló queda.
- **Productos:** no se borran; `is_active` en falso. Los movimientos los referencian para siempre.
- **Categorías:** se pueden renombrar; borrar una deja `category_id` en nulo.
- **Sesiones:** se borran al cerrar sesión y las vencidas se purgan. Son las únicas filas
  desechables del esquema.
- **Credenciales:** añadir Google a un usuario existente es insertar una fila en `account`. Quitarla
  no borra al usuario ni su historial.
- **Migraciones:** versionadas con drizzle-kit desde la tarea uno. Cambiar el modelo es rutina
  (`D-002`).

## Open Questions

- **El identificador de acceso es el correo.** Ya no es supuesto: lo cierra `D-008`. Queda una
  pregunta de producto — si el dueño del primer negocio no tiene correo que revise, el alta la hace
  el estudio igual, pero conviene saberlo antes.
- **Supuesto — el stock puede quedar negativo.** El brief dice que la aplicación *compite contra no
  usarla*: si bloquea una venta porque el conteo dice cero, el dueño cobra igual y deja de abrirla.
  Se registra y se muestra en pantalla, no se impide. Es una decisión de producto, y es tuya.
- ~~**Moneda y precisión del precio.**~~ **Cerrada el 2026-09-06: peso colombiano.** El COP no
  tiene centavos en circulación, así que su unidad mínima es el peso y `product.price` guarda
  exactamente lo que se teclea. Vive en `src/domain/moneda.ts`, no en el esquema: un despliegue por
  negocio significa una moneda por base (`D-005`). Cambiar a una moneda **con** centavos seguiría
  costando una migración — habría que multiplicar los precios ya guardados.
- **La cuadrícula de frecuentes se deriva, no se guarda.** Sale de las ventas recientes. Falta
  definir con qué ventana y cuántos productos — es lo primero que el dueño ve al abrir.
- **Alta inicial del catálogo.** `brief.md` § Open Questions ya pregunta cuántos productos hay. Si
  son cientos, la carga masiva deja de estar fuera de alcance y necesita su propia decisión.
