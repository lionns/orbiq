// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { anadirCodigo } from "../src/domain/catalogo";
import { nuevoId } from "../src/domain/ids";
import { ajustarExistencias } from "../src/domain/movimientos";
import { anularVenta, registrarVenta } from "../src/domain/venta";
import { borrarDueno, borrarProductos, crearDueno, sembrarCodigo, type DuenoDePrueba } from "./apoyo";
import { codigoAleatorio } from "./apoyo/ean13";

/**
 * T-037. Lo que pasa cuando dos cosas tocan el mismo producto a la vez. Se llama al dominio, que es
 * donde vive la garantía: por la pantalla no se provocan veinte cobros en el mismo instante.
 *
 * Las dos primeras fallaban antes de `T-037`: el saldo se pisaba entre ventas simultáneas, y la
 * misma venta se podía anular varias veces con varios toques rápidos.
 */
let dueno: DuenoDePrueba;
const MARCA = `t37-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test.beforeAll(async () => {
  dueno = await crearDueno("concurrencia");
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  const ventas = sql`select id from ${schema.sale} where ${schema.sale.userId} = ${dueno.id}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${ventas})`);
  await db.delete(schema.sale).where(eq(schema.sale.userId, dueno.id));
  await borrarProductos(like(schema.product.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

async function sembrar(nombre: string, existencias: number) {
  const [p] = await db
    .insert(schema.product)
    .values({ name: `${nombre} ${MARCA}`, price: 1000, stock: existencias })
    .returning({ id: schema.product.id });
  const codigoId = await sembrarCodigo(p!.id, codigoAleatorio());
  await db.insert(schema.stockMovement).values({
    productId: p!.id,
    barcodeId: codigoId,
    quantity: existencias,
    type: "initial",
    userId: dueno.id,
  });
  return { id: p!.id, codigoId };
}

/** El saldo guardado y el del libro. Tienen que ser el mismo número siempre (`D-002`). */
async function saldos(productoId: string) {
  const [s] = await db
    .select({
      guardado: schema.product.stock,
      libro: sql<number>`(select coalesce(sum(quantity), 0)::int from stock_movement where product_id = ${productoId})`,
    })
    .from(schema.product)
    .where(eq(schema.product.id, productoId));
  return s!;
}

test("20 ventas a la vez del mismo producto: el saldo guardado es el del libro", async () => {
  const p = await sembrar("Simultáneo", 15);
  const resultados = await Promise.allSettled(
    Array.from({ length: 20 }, (_, i) =>
      registrarVenta(nuevoId(), [{ productoId: p.id, cantidad: 1, codigoId: i % 2 ? p.codigoId : null }], dueno.id),
    ),
  );
  expect(resultados.filter((r) => r.status === "rejected")).toEqual([]);
  expect(await saldos(p.id)).toEqual({ guardado: -5, libro: -5 });
});

test("la misma venta anulada 5 veces a la vez devuelve una sola vez", async () => {
  const p = await sembrar("Anulable", 10);
  const ventaId = nuevoId();
  await registrarVenta(ventaId, [{ productoId: p.id, cantidad: 3 }], dueno.id);
  const resultados = await Promise.all(Array.from({ length: 5 }, () => anularVenta(ventaId, dueno.id)));
  expect(resultados.filter((r) => r.ok)).toHaveLength(1);
  expect(resultados.filter((r) => !r.ok).map((r) => !r.ok && r.mensaje)).toEqual(
    Array(4).fill("Esa venta ya está anulada."),
  );
  expect(await saldos(p.id)).toEqual({ guardado: 10, libro: 10 });
});

test("ventas, un conteo y un código nuevo a la vez sobre el mismo producto: el saldo cuadra", async () => {
  const p = await sembrar("Mezcla", 50);
  await Promise.all([
    ...Array.from({ length: 8 }, () => registrarVenta(nuevoId(), [{ productoId: p.id, cantidad: 2 }], dueno.id)),
    ajustarExistencias(p.id, p.codigoId, 40, "Error al contar", dueno.id),
    anadirCodigo(p.id, { codigo: codigoAleatorio(), llegaron: 12 }, dueno.id),
  ]);
  const s = await saldos(p.id);
  expect(s.guardado).toBe(s.libro);
});

test("anular una venta que no existe no escribe nada", async () => {
  const r = await anularVenta(nuevoId(), dueno.id);
  expect(r).toEqual({ ok: false, mensaje: "Esa venta no existe." });
});
