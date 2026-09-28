import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { listarCatalogo } from "../src/domain/catalogo";
import { leerFiltros } from "../src/domain/filtros";
import { resumenDelDia, registrarVenta, ventasDelRango } from "../src/domain/venta";
import { borrarDueno, borrarProductos, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/** T-028: datos reales, consulta de dominio y las rutas existentes de catálogo y ventas. */
let dueno: DuenoDePrueba;
const marca = `t28-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const productos: string[] = [];
const ventas: string[] = [];

test.beforeAll(async () => {
  dueno = await crearDueno("resumen");
});

test.afterAll(async () => {
  if (productos.length) await db.delete(schema.stockMovement).where(inArray(schema.stockMovement.productId, productos));
  if (ventas.length) {
    await db.delete(schema.saleLine).where(inArray(schema.saleLine.saleId, ventas));
    await db.delete(schema.sale).where(inArray(schema.sale.id, ventas));
  }
  if (productos.length) await borrarProductos(inArray(schema.product.id, productos));
  await borrarDueno(dueno);
});

async function producto(nombre: string, stock: number, activo = true) {
  const [p] = await db.insert(schema.product).values({
    name: `${nombre} ${marca}`, price: 1000, stock, isActive: activo,
  }).returning({ id: schema.product.id });
  productos.push(p!.id);
  if (stock !== 0) await db.insert(schema.stockMovement).values({
    productId: p!.id, quantity: stock, type: "adjustment", reason: "Preparación de prueba", userId: dueno.id,
  });
  return p!.id;
}

test("Inicio y Ventas comparten el día, el total, el deshacer y lo que hay por reponer", async ({ page }) => {
  // Con holgura: las cuatro ventas se llevan 10, y con 10 justas quedaría en 0 y contaría como
  // «por reponer», que es otra cosa de la que esta prueba mide.
  const principal = await producto("Principal", 20);
  const cero = await producto("Cero", 0);
  const negativo = await producto("Negativo", -2);
  const retirado = await producto("Retirado", -1, false);

  const noche = new Date("2035-01-02T02:30:00Z"); // 21:30 del 1 de enero en Bogotá
  for (const [i, cantidad] of [1, 2, 3, 4].entries()) {
    const id = nuevoId();
    ventas.push(id);
    await registrarVenta(id, [{ productoId: principal, cantidad }], dueno.id);
    await db.update(schema.sale).set({ createdAt: new Date(noche.getTime() + i * 60_000) }).where(eq(schema.sale.id, id));
  }

  const antes = await resumenDelDia(noche);
  expect(antes.dia).toBe("2035-01-01");
  expect(antes.total).toBe(10_000);
  expect(antes.numeroVentas).toBe(4);
  expect(antes.ultimasVentas.map((v) => v.id)).toHaveLength(4);
  expect(antes.porReponer.total).toBeGreaterThanOrEqual(2);
  expect(antes.porReponer.productos.length).toBeLessThanOrEqual(3);
  const nuestros = await listarCatalogo(leerFiltros({ existencias: "por-reponer", q: marca }));
  expect(nuestros.productos.map((p) => p.id)).toEqual(expect.arrayContaining([cero, negativo]));
  expect(nuestros.total).toBe(2);
  expect(antes.porReponer.productos.map((p) => p.id)).not.toContain(retirado);

  await entrarComo(page, dueno);
  await page.goto(`/catalogo?q=${encodeURIComponent(marca)}&existencias=por-reponer`);
  await expect(page.getByTestId("lista-catalogo")).toContainText("Cero");
  await expect(page.getByTestId("lista-catalogo")).toContainText("Negativo");
  await expect(page.getByTestId("lista-catalogo")).not.toContainText("Retirado");
  await expect(page.getByTestId("conteo")).toContainText("2 productos");

  // El detalle usa la misma acción pública que Deshacer invocará desde Vender en T-029.
  await page.goto(`/ventas/${ventas[3]}`);
  await page.getByTestId("abrir-anular").locator("summary").click();
  await page.getByTestId("anular").click();
  await expect(page.getByTestId("anulada")).toBeVisible();

  const despues = await resumenDelDia(noche);
  expect(despues.total).toBe(6000);
  expect(despues.numeroVentas).toBe(3);
  expect(despues.ultimasVentas).toHaveLength(4);
  expect(despues.ultimasVentas.find((v) => v.id === ventas[3])?.anulada).toBe(true);
  const rango = await ventasDelRango({ desde: "2035-01-01", hasta: "2035-01-01" });
  expect(rango.resumen).toEqual({ total: 6000, numeroVentas: 3, anuladas: 1 });
  expect(rango.resumen.total).toBe(rango.dias.reduce((suma, d) => suma + d.total, 0));
  expect((await resumenDelDia(new Date("2035-01-02T05:00:00Z"))).numeroVentas).toBe(0);

  await page.goto("/ventas?desde=2035-01-01&hasta=2035-01-01");
  await expect(page.getByTestId(`venta-${ventas[3]}`)).toContainText("Anulada");
  await expect(page.getByTestId("total-2035-01-01")).toContainText("6.000");
  const [saldo] = await db.select({ stock: schema.product.stock }).from(schema.product).where(eq(schema.product.id, principal));
  expect(saldo!.stock).toBe(14);
  const movimientos = await db.select().from(schema.stockMovement).where(eq(schema.stockMovement.saleId, ventas[3]!));
  expect(movimientos.map((m) => [m.type, m.quantity])).toEqual(expect.arrayContaining([["sale", -4], ["sale_void", 4]]));
});
