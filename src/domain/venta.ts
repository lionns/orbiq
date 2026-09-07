import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** La transacción de Drizzle no es la misma forma que `db`, pero para escribir es intercambiable. */
type Escritor = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * El registro de una venta. Es el sitio donde `D-002` se paga: el libro se escribe entero o no se
 * escribe, y el saldo se recalcula desde él — nunca se resta a mano.
 */

/** Ventana de «reciente» para ordenar la cuadrícula. Pendiente de validar con un dueño usándolo. */
export const VENTANA_DIAS = 30;
/** Casillas de la cuadrícula. Dos columnas en celular: doce filas de alcance con el pulgar. */
export const CASILLAS = 24;

export type CasillaDeVenta = {
  id: string;
  nombre: string;
  precio: number;
  existencias: number;
};

export type LineaPedida = { productoId: string; cantidad: number };

export type ResultadoVenta = {
  ventaId: string;
  total: number;
  /** Verdadero cuando la venta ya estaba registrada y este envío fue un reintento (`AC-010`). */
  yaEstaba: boolean;
};

/**
 * Lo que el dueño ve al abrir. Ordena por lo más vendido en la ventana reciente y, mientras no
 * haya historial, cae en el catálogo por nombre: una tienda nueva la ve llena desde el primer día
 * sin administrar favoritos (decidido con el estudio el 2026-09-06).
 */
export async function cuadricula(): Promise<CasillaDeVenta[]> {
  const vendidoReciente = sql<number>`coalesce((
    select sum(${schema.saleLine.quantity})
    from ${schema.saleLine}
    join ${schema.sale} on ${schema.sale.id} = ${schema.saleLine.saleId}
    where ${schema.saleLine.productId} = ${schema.product.id}
      and ${schema.sale.voidedAt} is null
      and ${schema.sale.createdAt} > now() - ${`${VENTANA_DIAS} days`}::interval
  ), 0)`;

  return db
    .select({
      id: schema.product.id,
      nombre: schema.product.name,
      precio: schema.product.price,
      existencias: schema.product.stock,
    })
    .from(schema.product)
    .where(eq(schema.product.isActive, true))
    .orderBy(desc(vendidoReciente), asc(schema.product.name))
    .limit(CASILLAS);
}

export async function registrarVenta(
  ventaId: string,
  lineas: LineaPedida[],
  usuarioId: string,
): Promise<ResultadoVenta> {
  if (lineas.length === 0) throw new Error("Una venta tiene al menos una línea.");

  const yaRegistrada = await buscarVenta(ventaId);
  if (yaRegistrada) return yaRegistrada;

  try {
    // AC-008: venta, líneas y movimientos entran juntos o no entra nada. Es la razón por la que el
    // driver de Neon es el de WebSocket y no el HTTP (`architecture.md` § Data).
    return await db.transaction(async (tx) => {
      const ids = lineas.map((l) => l.productoId);
      const productos = await tx
        .select({ id: schema.product.id, precio: schema.product.price })
        .from(schema.product)
        .where(inArray(schema.product.id, ids));

      const precioDe = new Map(productos.map((p) => [p.id, p.precio]));
      const faltante = ids.find((id) => !precioDe.has(id));
      if (faltante) throw new Error(`El producto ${faltante} ya no existe.`);

      // AC-009: el precio se copia del catálogo al momento de vender, no de lo que mandó la
      // pantalla. Subirlo mañana no puede reescribir lo que se cobró hoy.
      const conPrecio = lineas.map((l) => ({ ...l, precio: precioDe.get(l.productoId)! }));
      const total = conPrecio.reduce((suma, l) => suma + l.precio * l.cantidad, 0);

      await tx.insert(schema.sale).values({ id: ventaId, total, userId: usuarioId });
      await tx.insert(schema.saleLine).values(
        conPrecio.map((l) => ({
          saleId: ventaId,
          productId: l.productoId,
          quantity: l.cantidad,
          unitPrice: l.precio,
        })),
      );
      await tx.insert(schema.stockMovement).values(
        conPrecio.map((l) => ({
          productId: l.productoId,
          // Con signo: vender descuenta. El libro no se edita, se le suma (`D-002`).
          quantity: -l.cantidad,
          type: "sale" as const,
          saleId: ventaId,
          userId: usuarioId,
        })),
      );
      await recalcularSaldos(tx, ids);

      return { ventaId, total, yaEstaba: false };
    });
  } catch (error) {
    // Dos envíos a la vez con el mismo identificador: uno gana y el otro choca contra la clave
    // primaria. No es un error del dueño, es el mismo reintento (`AC-010`).
    if (esVentaRepetida(error)) {
      const existente = await buscarVenta(ventaId);
      if (existente) return existente;
    }
    throw error;
  }
}

async function buscarVenta(ventaId: string): Promise<ResultadoVenta | null> {
  const [venta] = await db
    .select({ id: schema.sale.id, total: schema.sale.total })
    .from(schema.sale)
    .where(and(eq(schema.sale.id, ventaId), isNull(schema.sale.voidedAt)))
    .limit(1);
  return venta ? { ventaId: venta.id, total: venta.total, yaEstaba: true } : null;
}

/**
 * El saldo sale del libro, no de restar lo vendido a lo que había. Dos ventas simultáneas del mismo
 * producto no se pisan: cada una suma su movimiento y el saldo se vuelve a leer entero.
 */
async function recalcularSaldos(tx: Escritor, ids: string[]): Promise<void> {
  await tx
    .update(schema.product)
    .set({
      stock: sql`(select coalesce(sum(${schema.stockMovement.quantity}), 0)
        from ${schema.stockMovement}
        where ${schema.stockMovement.productId} = ${schema.product.id})`,
    })
    .where(inArray(schema.product.id, ids));
}

/** Postgres, no Drizzle: el código y el nombre de la restricción vienen del driver. */
function esVentaRepetida(error: unknown): boolean {
  const causa = error instanceof Error && "cause" in error ? error.cause : error;
  const detalle = causa as { code?: string; constraint?: string } | null;
  return detalle?.code === "23505" && detalle?.constraint === "sale_pkey";
}
