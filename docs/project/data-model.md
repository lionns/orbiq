# Data Model

Alcance MVP: catálogo, ventas e identidad. Cada entidad futura se añade al lado, sin reescribir
estas (`D-003`).

Dos reglas transversales, de `D-002`:

- **Identificadores UUIDv7 generados en la aplicación** — ordenados en el tiempo, no secuenciales.
  Excepción: `sessions.id` (ver su entidad).
- **El libro nunca se reescribe.** Los movimientos no se editan ni se borran; una corrección es un
  movimiento nuevo.

## Entities

### user

Existe desde la primera migración aunque hoy solo haya una fila (`D-004`).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid v7 | yes | |
| username | text | yes | Único. Supuesto — ver Open Questions |
| password_hash | text | yes | Argon2id (`architecture.md` § Security) |
| role | text | yes | Hoy solo `owner`. Un empleado es una fila más, no una migración (`D-004`) |
| created_at | timestamptz | yes | |

### session

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | text | yes | **Aleatorio criptográfico, no UUIDv7**: un id de sesión ordenado en el tiempo es parcialmente adivinable |
| user_id | uuid v7 | yes | → `user.id` |
| created_at | timestamptz | yes | |
| expires_at | timestamptz | yes | Larga por diseño: el dueño no teclea la clave cada mañana (`D-004`) |
| last_seen_at | timestamptz | yes | |

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
| user_id | uuid v7 | yes | → `user.id`. Quién la registró (`D-004`) |
| created_at | timestamptz | yes | |
| voided_at | timestamptz | no | Anular no borra la venta |
| voided_by | uuid v7 | no | → `user.id` |

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
| type | text | yes | `initial` · `sale` · `sale_void` · `adjustment`. Devoluciones, traslados y compras entran como tipos nuevos, sin tocar filas viejas |
| sale_id | uuid v7 | no | → `sale.id`. Obligatorio cuando `type` es `sale` o `sale_void` |
| reason | text | no | **Obligatorio cuando `type` es `adjustment`** (`brief.md` § In Scope) |
| user_id | uuid v7 | yes | → `user.id` |
| occurred_at | timestamptz | yes | |

## Relationships

- `user` 1—N `session`, `sale`, `stock_movement`.
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
- **Migraciones:** versionadas con drizzle-kit desde la tarea uno. Cambiar el modelo es rutina
  (`D-002`).

## Open Questions

- **Supuesto — el identificador de acceso es `username`, no correo.** `D-004` quita la recuperación
  por correo y el alta la hace el estudio a mano, así que el correo no aporta nada que el nombre no
  dé, y el dueño puede no tener uno que revise. Se cambia con una migración si te suena mal.
- **Supuesto — el stock puede quedar negativo.** El brief dice que la aplicación *compite contra no
  usarla*: si bloquea una venta porque el conteo dice cero, el dueño cobra igual y deja de abrirla.
  Se registra y se muestra en pantalla, no se impide. Es una decisión de producto, y es tuya.
- **Moneda y precisión del precio.** Un despliegue por negocio significa una moneda por base
  (`D-005`), así que es configuración y no columna. Falta nombrar cuál para el primer cliente.
- **La cuadrícula de frecuentes se deriva, no se guarda.** Sale de las ventas recientes. Falta
  definir con qué ventana y cuántos productos — es lo primero que el dueño ve al abrir.
- **Alta inicial del catálogo.** `brief.md` § Open Questions ya pregunta cuántos productos hay. Si
  son cientos, la carga masiva deja de estar fuera de alcance y necesita su propia decisión.
