import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../src/db";
import { saldoCoincide, saldoDesdeLibro } from "../src/domain/stock";

/**
 * Verificación puntual de T-001: las reglas del esquema contra la base real, no contra la pantalla.
 * Deja la base como la encontró.
 */
const creados: string[] = [];
const ok = (t: string) => console.log("  ✓", t);
const fail = (t: string, e?: unknown) => {
  console.error("  ✗", t, e instanceof Error ? `— ${e.message.split("\n")[0]}` : "");
  process.exitCode = 1;
};

async function nuevoProducto(name: string, barcode: string | null) {
  const [p] = await db.insert(schema.product).values({ name, price: 100 }).returning();
  if (p) creados.push(p.id);
  // Los códigos viven en su tabla desde `D-010`; la unicidad es la de `product_barcode.code`.
  if (barcode) await db.insert(schema.productBarcode).values({ productId: p!.id, code: barcode });
  return p!;
}

try {
  // AC-005: varios productos sin código de barras conviven.
  await nuevoProducto("Granel A", null);
  await nuevoProducto("Granel B", null);
  ok("AC-005 · dos productos sin código de barras entran los dos");

  // AC-004: un código repetido se rechaza en la base, no solo en la pantalla.
  await nuevoProducto("Con código", "7701234567890");
  try {
    await nuevoProducto("Repetido", "7701234567890");
    fail("AC-004 · la base aceptó un código de barras repetido");
  } catch {
    ok("AC-004 · la base rechaza el código de barras repetido");
  }

  // NFR-005: el saldo materializado se recomputa desde el libro y coincide.
  const [usuario] = await db
    .insert(schema.user)
    .values({ id: `verif-${Date.now()}`, email: `verif-${Date.now()}@orbiq.test`, name: "Verificación" })
    .returning();
  const prod = await nuevoProducto("Con libro", null);
  await db.insert(schema.stockMovement).values([
    { productId: prod.id, quantity: 10, type: "initial", userId: usuario!.id },
    { productId: prod.id, quantity: -3, type: "adjustment", reason: "merma", userId: usuario!.id },
  ]);
  await db.update(schema.product).set({ stock: 7 }).where(eq(schema.product.id, prod.id));

  const movimientos = await db
    .select({ quantity: schema.stockMovement.quantity })
    .from(schema.stockMovement)
    .where(eq(schema.stockMovement.productId, prod.id));
  const [leido] = await db
    .select({ stock: schema.product.stock })
    .from(schema.product)
    .where(eq(schema.product.id, prod.id));

  if (saldoDesdeLibro(movimientos) === 7 && saldoCoincide(leido!.stock, movimientos)) {
    ok("NFR-005 · el saldo recomputado desde el libro coincide con product.stock");
  } else {
    fail(`NFR-005 · libro=${saldoDesdeLibro(movimientos)} materializado=${leido!.stock}`);
  }

  // AC-013: un ajuste sin motivo no entra.
  try {
    await db
      .insert(schema.stockMovement)
      .values({ productId: prod.id, quantity: -1, type: "adjustment", userId: usuario!.id });
    fail("AC-013 · la base aceptó un ajuste sin motivo");
  } catch {
    ok("AC-013 · la base rechaza un ajuste sin motivo");
  }

  // El libro no se reescribe: un movimiento de venta exige su venta.
  try {
    await db
      .insert(schema.stockMovement)
      .values({ productId: prod.id, quantity: -1, type: "sale", userId: usuario!.id });
    fail("la base aceptó un movimiento de venta sin venta");
  } catch {
    ok("un movimiento de venta sin venta se rechaza");
  }

  await db.delete(schema.stockMovement).where(eq(schema.stockMovement.productId, prod.id));
  for (const id of creados) {
    await db.delete(schema.productBarcode).where(eq(schema.productBarcode.productId, id));
    await db.delete(schema.product).where(eq(schema.product.id, id));
  }
  await db.delete(schema.user).where(eq(schema.user.id, usuario!.id));
  console.log("  · base devuelta a su estado inicial");
} finally {
  await pool.end();
}
