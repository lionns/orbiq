import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

/**
 * Identidad — D-008. Las cuatro tablas las define Better Auth; sus columnas se pueden renombrar, su
 * forma no. El hash de la contraseña vive en `account`, no en `user`: eso es lo que hace que sumar
 * Google sea una fila y no una migración.
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  // El ingreso busca la credencial de una persona en un proveedor (D-008).
  (t) => [index("account_user_provider_idx").on(t.userId, t.providerId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Los intentos de entrar, contados por IP y ruta (`T-037`). Los define Better Auth, como las otras
 * tablas de identidad. En la base y no en memoria: en Cloudflare cada instancia del Worker tiene su
 * propia memoria, así que un conteo en memoria se reparte entre instancias y protege menos.
 */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/** Negocio — identificadores UUIDv7 generados en la aplicación (D-002). */

export const category = pgTable("category", {
  id: text("id").primaryKey().$defaultFn(uuidv7),
  name: text("name").notNull().unique(),
});

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    name: text("name").notNull(),
    /** Entero en la unidad mínima de la moneda del negocio. Nunca coma flotante. */
    price: integer("price").notNull(),
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    /** Saldo materializado, recomputable desde el libro. Nunca es la verdad, solo la copia. */
    stock: integer("stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // El catálogo se ordena y se recorre por nombre, siempre (`FR-011`).
    index("product_name_idx").on(t.name),
    // Acotar por categoría es el filtro que más se usa.
    index("product_category_id_idx").on(t.categoryId),
    check("product_price_non_negative", sql`${t.price} >= 0`),
  ],
);

/**
 * Los códigos de un producto (`D-010`). El proveedor cambia el código de lo que ya se vende, así que
 * un producto puede tener varios; cada uno lleva su cantidad, que es la suma de sus movimientos.
 * No hay fila para «sin código»: esos movimientos tienen `barcode_id` nulo.
 *
 * Un código no se borra —sus movimientos lo nombran—; se corrige su número.
 */
export const productBarcode = pgTable(
  "product_barcode",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    productId: text("product_id")
      .notNull()
      .references(() => product.id),
    /** Único entre todos los productos (`AC-004`). Varios productos sin código sigue siendo lo normal. */
    code: text("code").notNull().unique(),
    /** Ordena los códigos de un producto: lo vendido sin escanear sale del más antiguo (`AC-027`). */
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("product_barcode_product_id_idx").on(t.productId)],
);

export const sale = pgTable(
  "sale",
  {
    /** Generado en el cliente. Su unicidad ES la idempotencia (D-005, AC-010). */
    id: text("id").primaryKey(),
    total: integer("total").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by").references(() => user.id),
  },
  // Ventas e Inicio listan por fecha: el día del negocio y las últimas ventas (`T-014`, `T-028`).
  (t) => [index("sale_created_at_idx").on(t.createdAt)],
);

export const saleLine = pgTable(
  "sale_line",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    saleId: text("sale_id")
      .notNull()
      .references(() => sale.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => product.id),
    quantity: integer("quantity").notNull(),
    /** Copia del precio al vender. Subir el precio mañana no reescribe lo cobrado ayer (AC-009). */
    unitPrice: integer("unit_price").notNull(),
  },
  (t) => [
    index("sale_line_sale_id_idx").on(t.saleId),
    index("sale_line_product_id_idx").on(t.productId),
    check("sale_line_quantity_positive", sql`${t.quantity} > 0`),
    check("sale_line_unit_price_non_negative", sql`${t.unitPrice} >= 0`),
  ],
);

export const movementType = pgEnum("movement_type", [
  "initial",
  "sale",
  "sale_void",
  "adjustment",
  // Llegó mercancía. Nace con «añadir un código» (`D-010`); una compra sin código nuevo entra igual.
  "purchase",
  // «Etiquetado»: lo que había sin código pasa al código que la tienda le acaba de generar. Va en
  // pares que suman cero —menos sin código, más en el código— (`D-012`).
  "relabel",
]);

export const productEventType = pgEnum("product_event_type", [
  "price_change",
  "deactivated",
  "reactivated",
]);

/**
 * La segunda bitácora: lo que le pasa a un producto que **no** son existencias (`T-012`).
 *
 * Se acota a eso a propósito, para que no acabe siendo un cajón de sastre. Los cambios de nombre,
 * categoría o código no se registran: el estudio eligió el precio porque es lo único que afecta a
 * la plata, y `sale_line` ya guarda su copia de lo que se cobró en cada venta (`AC-009`).
 *
 * Inmutable, como el libro de existencias: no se edita ni se borra (`D-002`).
 */
export const productEvent = pgTable(
  "product_event",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    productId: text("product_id")
      .notNull()
      .references(() => product.id),
    type: productEventType("type").notNull(),
    /** Solo en `price_change`, en la unidad mínima de la moneda. */
    previousPrice: integer("previous_price"),
    newPrice: integer("new_price"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // La misma línea de tiempo que el libro, y se lee igual de seguido.
    index("product_event_product_occurred_idx").on(t.productId, t.occurredAt),
    // Un cambio de precio sin los dos precios no dice nada; y al revés, un desactivado con precios
    // sería ruido. La regla vive en la base, no solo en la pantalla.
    check(
      "product_event_price_change_needs_prices",
      sql`(${t.type} <> 'price_change' and ${t.previousPrice} is null and ${t.newPrice} is null)
        or (${t.type} = 'price_change' and ${t.previousPrice} is not null and ${t.newPrice} is not null
            and ${t.previousPrice} <> ${t.newPrice})`,
    ),
  ],
);

/** El libro. Inmutable: no se edita ni se borra, corregir es insertar (D-002, AC-X04). */
export const stockMovement = pgTable(
  "stock_movement",
  {
    id: text("id").primaryKey().$defaultFn(uuidv7),
    productId: text("product_id")
      .notNull()
      .references(() => product.id),
    /** Con signo. Negativo descuenta. */
    quantity: integer("quantity").notNull(),
    type: movementType("type").notNull(),
    /** De qué código fue. Nulo: sin código, o vendido de un producto que no tiene ninguno (`D-010`). */
    barcodeId: text("barcode_id").references(() => productBarcode.id),
    saleId: text("sale_id").references(() => sale.id),
    reason: text("reason"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Recomputar el saldo de un producto es leer su tramo del libro (D-002). Sin este índice, esa
    // propiedad se paga con un recorrido completo de la tabla.
    index("stock_movement_product_occurred_idx").on(t.productId, t.occurredAt),
    // AC-013: un ajuste sin motivo no entra. La regla vive en la base, no solo en la pantalla.
    check(
      "stock_movement_adjustment_needs_reason",
      sql`${t.type} <> 'adjustment' or (${t.reason} is not null and length(trim(${t.reason})) > 0)`,
    ),
    check(
      "stock_movement_sale_needs_sale_id",
      sql`${t.type} not in ('sale', 'sale_void') or ${t.saleId} is not null`,
    ),
  ],
);
