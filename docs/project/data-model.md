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

### rate_limit

Los intentos de entrar, contados por IP y ruta (`T-037`). La define Better Auth, como las demás
de identidad. En la base y no en memoria: en Cloudflare cada instancia del Worker tiene la suya.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text | yes | |
| key | text | yes | Único. IP y ruta: `203.0.113.7/sign-in/email` |
| count | integer | yes | Intentos en la ventana |
| last_request | bigint | yes | Milisegundos desde 1970 |

### category

Plana. La jerarquía está fuera de alcance y entra como columna padre el día que un negocio la pida.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| name | text | yes | Único |

### product

Cada cosa que se vende es un producto. No hay variantes (`brief.md` § In Scope): un producto con
varios códigos sigue siendo uno solo, con un precio (`D-010`).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| name | text | yes | |
| price | integer | yes | Unidad mínima de la moneda del negocio. Entero, nunca coma flotante |
| category_id | uuid v7 | no | → `category.id` |
| stock | integer | yes | Saldo materializado, recomputable desde `stock_movement` (`D-002`). Nunca es la verdad, solo la copia rápida |
| is_active | boolean | yes | Un producto no se borra: los movimientos lo referencian |
| created_at | timestamptz | yes | |
| updated_at | timestamptz | yes | |

### product_barcode

Los códigos de un producto (`D-010`). El proveedor cambia el código de lo que ya se vende, así que un
producto puede tener varios, y cada uno lleva su cantidad. Sin código es normal —granel, pan,
huevos—: esos productos no tienen fila aquí.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| product_id | uuid v7 | yes | → `product.id` |
| code | text | yes | **Único entre todos los productos** (`AC-004`) |
| created_at | timestamptz | yes | Ordena los códigos: lo vendido sin escanear sale del más antiguo con unidades (`AC-027`) |

La cantidad de un código es la suma de sus movimientos; no se materializa. Un código no se borra
—sus movimientos lo nombran—: se corrige su número.

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
| type | enum `movement_type` | yes | `initial` · `sale` · `sale_void` · `adjustment` · `purchase` («Llegaron», `D-010`). Devoluciones y traslados entran como tipos nuevos, sin tocar filas viejas — añadir un valor al enum es una migración de una línea |
| barcode_id | uuid v7 | no | → `product_barcode.id`. De qué código fue. Nulo: sin código (`D-010`) |
| sale_id | uuid v7 | no | → `sale.id`. Obligatorio cuando `type` es `sale` o `sale_void` |
| reason | text | no | **Obligatorio cuando `type` es `adjustment`** (`brief.md` § In Scope) |
| user_id | text | yes | → `user.id` |
| occurred_at | timestamptz | yes | |

### product_event

La segunda bitácora: lo que le pasa a un producto que **no** son existencias (`T-012`). Inmutable,
como el libro.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| product_id | uuid v7 | yes | → `product.id` |
| type | enum `product_event_type` | yes | `price_change` · `deactivated` · `reactivated` |
| previous_price, new_price | integer | no | **Obligatorios y distintos** cuando `type` es `price_change`; nulos en el resto |
| user_id | text | yes | → `user.id` |
| occurred_at | timestamptz | yes | |

Se acota a propósito a lo que no son existencias, para que no acabe siendo un cajón de sastre. Los
cambios de nombre, categoría o código **no** se registran: el estudio eligió el precio porque es lo
único que afecta a la plata, y `sale_line` ya guarda su copia de lo que se cobró (`AC-009`).

## Indexes

Postgres no indexa las claves foráneas solo. Estos cinco no son afinación anticipada: cada uno
sostiene una propiedad que ya está escrita arriba.

| Index | Sostiene |
| --- | --- |
| `stock_movement (product_id, occurred_at)` | Que el saldo sea **recomputable** desde el libro (`D-002`). Sin él, recomputar un producto recorre la tabla entera |
| `sale (created_at)` | Las ventas de un día y las últimas de Inicio (`T-014`, `T-028`) |
| `product_barcode (product_id)` | Los códigos de un producto, en la ficha y al repartir una venta (`D-010`) |
| `sale_line (sale_id)` | Leer una venta con sus líneas |
| `sale_line (product_id)` | Lo vendido de un producto |
| `account (user_id, provider_id)` | La búsqueda exacta que hace el ingreso (`D-008`) |
| `product_event (product_id, occurred_at)` | La ficha del producto los lee junto a sus movimientos, en una sola línea de tiempo |

`product_barcode.code` es único — la unicidad y el índice son la misma cosa (`AC-004`). Varios
productos sin código no chocan, porque no tienen fila (`AC-005`).

## Relationships

- `user` 1—N `account`, `session`, `sale`, `stock_movement`. Las credenciales cuelgan de `account`, nunca del usuario.
- `category` 1—N `product`. La categoría es opcional.
- `product` 1—N `product_barcode`, `sale_line`, `stock_movement`.
- `product_barcode` 1—N `stock_movement`. La suma de los movimientos de un código es su cantidad.
- `sale` 1—N `sale_line`, y 1—N `stock_movement` (los del registro y los de su anulación).
- `product.stock` == `SUM(stock_movement.quantity)` de ese producto. Es una copia, no una fuente:
  si divergen, manda el libro.

## Validation Rules

- `product.price >= 0`; `sale_line.quantity > 0`; `sale_line.unit_price >= 0`.
- Una venta tiene al menos una línea.
- `sale.total` == suma de `quantity * unit_price` de sus líneas.
- `stock_movement.reason` no vacío cuando `type` es `adjustment`.
- `product_barcode.code` único. Varios productos sin código es lo normal.
- Lo vendido escaneando sale de ese código; sin escanear, del más antiguo con unidades, y lo que no
  cabe, del más reciente (`AC-027`). Anular devuelve a cada código lo que salió de él.
- Registrar una venta ya registrada (mismo `sale.id`) devuelve la venta existente sin descontar de
  nuevo — no es un error, es un reintento (`D-005`).
- Anular una venta ya anulada se rechaza.
- `session.expires_at > session.created_at`.

## Data Lifecycle

- **Movimientos:** se insertan y nunca se actualizan ni se borran. Es la regla que hace posible todo
  lo que viene después (`D-002`).
- **Ventas:** nunca se borran. Anular escribe `voided_at` y **movimientos compensatorios** de tipo
  `sale_void` que devuelven las existencias. El registro de que se vendió y se anuló queda.
- **Productos:** no se borran; `is_active` en falso, y el cambio queda como `product_event`.
  Confirmado con el estudio el 2026-09-07. Los movimientos y las ventas los referencian para
  siempre, así que borrarlos dejaría historia sin sentido.
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
- ~~**Supuesto — el stock puede quedar negativo.**~~ **Cerrada el 2026-09-06: se permite.** La
  aplicación *compite contra no usarla*: si bloquea una venta porque el conteo dice cero, el dueño
  cobra igual y deja de abrirla. El saldo negativo se registra y se muestra en rojo; corregirlo es
  un ajuste, que ya deja motivo obligatorio (`AC-013`). La aplicación registra lo que pasó, no
  decide lo que se puede vender.
- ~~**Moneda y precisión del precio.**~~ **Cerrada el 2026-09-06: peso colombiano.** El COP no
  tiene centavos en circulación, así que su unidad mínima es el peso y `product.price` guarda
  exactamente lo que se teclea. Vive en `src/domain/moneda.ts`, no en el esquema: un despliegue por
  negocio significa una moneda por base (`D-005`). Cambiar a una moneda **con** centavos seguiría
  costando una migración — habría que multiplicar los precios ya guardados.
- ~~**La cuadrícula de frecuentes se deriva, no se guarda.**~~ **Retirada el 2026-09-27 (`T-033`):**
  el cliente, usándola, pidió que Vender no sugiera productos. La venta se arma escaneando o
  buscando; nunca se guardó nada, así que quitarla no tocó el esquema.
- **Alta inicial del catálogo.** `brief.md` § Open Questions ya pregunta cuántos productos hay. Si
  son cientos, la carga masiva deja de estar fuera de alcance y necesita su propia decisión.
