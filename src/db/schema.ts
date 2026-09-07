import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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

export const account = pgTable("account", {
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
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
    barcode: text("barcode"),
    /** Saldo materializado, recomputable desde el libro. Nunca es la verdad, solo la copia. */
    stock: integer("stock").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // AC-004 / AC-005: único entre los que tienen código; varios sin código es lo normal.
    uniqueIndex("product_barcode_unique").on(t.barcode).where(sql`${t.barcode} is not null`),
    check("product_price_non_negative", sql`${t.price} >= 0`),
  ],
);

export const sale = pgTable("sale", {
  /** Generado en el cliente. Su unicidad ES la idempotencia (D-005, AC-010). */
  id: text("id").primaryKey(),
  total: integer("total").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  voidedAt: timestamp("voided_at", { withTimezone: true }),
  voidedBy: text("voided_by").references(() => user.id),
});

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
    check("sale_line_quantity_positive", sql`${t.quantity} > 0`),
    check("sale_line_unit_price_non_negative", sql`${t.unitPrice} >= 0`),
  ],
);

export const movementType = pgEnum("movement_type", ["initial", "sale", "sale_void", "adjustment"]);

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
    saleId: text("sale_id").references(() => sale.id),
    reason: text("reason"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
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
