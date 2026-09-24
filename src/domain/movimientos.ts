import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { saldoCoincide, saldoDesdeLibro } from "./stock";

/**
 * El libro de un producto. Es la pantalla que hace visible `D-002`: hasta ahora el libro existía y
 * nadie podía leerlo, y un libro que no se puede leer no sirve de garantía a nadie.
 */
export type Movimiento = {
  id: string;
  tipo: "initial" | "sale" | "sale_void" | "adjustment";
  cantidad: number;
  motivo: string | null;
  ventaId: string | null;
  quien: string;
  cuando: Date;
};

export type EventoDelProducto =
  | ({ clase: "movimiento" } & Movimiento)
  | {
      clase: "precio";
      id: string;
      anterior: number;
      nuevo: number;
      quien: string;
      cuando: Date;
    }
  | { clase: "activacion"; id: string; activo: boolean; quien: string; cuando: Date };

export type LibroDelProducto = {
  producto: {
    id: string;
    nombre: string;
    precio: number;
    activo: boolean;
    categoria: string | null;
    codigoDeBarras: string | null;
  };
  movimientos: Movimiento[];
  /**
   * Movimientos y eventos en una sola línea de tiempo. El dueño no distingue «esto es del libro de
   * existencias y esto de la otra bitácora»: pregunta qué le pasó a este producto (`T-012`).
   */
  linea: EventoDelProducto[];
  /** El saldo recomputado sumando el libro entero. Es la verdad (`D-002`). */
  saldoDelLibro: number;
  /** La copia rápida que vive en `product.stock`. */
  saldoMaterializado: number;
  /** Falso cuando los dos no coinciden. Se muestra, no se esconde (`NFR-005`). */
  cuadra: boolean;
};

export async function libroDelProducto(productoId: string): Promise<LibroDelProducto | null> {
  const [producto] = await db
    .select({
      id: schema.product.id,
      nombre: schema.product.name,
      precio: schema.product.price,
      activo: schema.product.isActive,
      stock: schema.product.stock,
      categoria: schema.category.name,
      codigoDeBarras: schema.product.barcode,
    })
    .from(schema.product)
    .leftJoin(schema.category, eq(schema.product.categoryId, schema.category.id))
    .where(eq(schema.product.id, productoId))
    .limit(1);
  if (!producto) return null;

  const filas = await db
    .select({
      id: schema.stockMovement.id,
      tipo: schema.stockMovement.type,
      cantidad: schema.stockMovement.quantity,
      motivo: schema.stockMovement.reason,
      ventaId: schema.stockMovement.saleId,
      quien: schema.user.name,
      cuando: schema.stockMovement.occurredAt,
    })
    .from(schema.stockMovement)
    .innerJoin(schema.user, eq(schema.user.id, schema.stockMovement.userId))
    .where(eq(schema.stockMovement.productId, productoId))
    // Del más reciente al más antiguo: lo que se pregunta es «qué pasó ahora», no «qué pasó al
    // principio». `id` desempata porque dos movimientos de la misma venta comparten instante.
    .orderBy(desc(schema.stockMovement.occurredAt), desc(schema.stockMovement.id));

  // `stock.ts` es la única definición de «cuánto hay»; se le pasa el libro en su forma, no se
  // reimplementa la suma aquí.
  const cantidades = filas.map((f) => ({ quantity: f.cantidad }));

  const eventos = await db
    .select({
      id: schema.productEvent.id,
      tipo: schema.productEvent.type,
      anterior: schema.productEvent.previousPrice,
      nuevo: schema.productEvent.newPrice,
      quien: schema.user.name,
      cuando: schema.productEvent.occurredAt,
    })
    .from(schema.productEvent)
    .innerJoin(schema.user, eq(schema.user.id, schema.productEvent.userId))
    .where(eq(schema.productEvent.productId, productoId));

  const linea: EventoDelProducto[] = [
    ...filas.map((m) => ({ clase: "movimiento" as const, ...m })),
    ...eventos.map((e) =>
      e.tipo === "price_change"
        ? {
            clase: "precio" as const,
            id: e.id,
            // La restricción de la base garantiza que en un cambio de precio los dos existen.
            anterior: e.anterior!,
            nuevo: e.nuevo!,
            quien: e.quien,
            cuando: e.cuando,
          }
        : {
            clase: "activacion" as const,
            id: e.id,
            activo: e.tipo === "reactivated",
            quien: e.quien,
            cuando: e.cuando,
          },
    ),
  ].sort((a, b) => b.cuando.getTime() - a.cuando.getTime());

  return {
    linea,
    producto: {
      id: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      activo: producto.activo,
      categoria: producto.categoria,
      codigoDeBarras: producto.codigoDeBarras,
    },
    movimientos: filas,
    saldoDelLibro: saldoDesdeLibro(cantidades),
    saldoMaterializado: producto.stock,
    cuadra: saldoCoincide(producto.stock, cantidades),
  };
}

export type ResultadoAjuste =
  | { ok: true; nuevoSaldo: number; seEscribioMovimiento: boolean }
  | { ok: false; mensaje: string };

/**
 * Corregir el conteo. No se escribe el saldo nuevo: se escribe **la diferencia** como un movimiento
 * y el saldo se vuelve a leer del libro. Es la misma regla que en la venta y en el alta (`D-002`).
 */
export async function ajustarExistencias(
  productoId: string,
  saldoContado: number,
  motivo: string,
  usuarioId: string,
): Promise<ResultadoAjuste> {
  const limpio = motivo.trim();
  // AC-013. La base también lo impide, pero aquí el dueño recibe una frase en vez de un error.
  if (!limpio) return { ok: false, mensaje: "Escribe por qué estás corrigiendo el conteo." };
  if (!Number.isInteger(saldoContado)) {
    return { ok: false, mensaje: "El conteo tiene que ser un número entero." };
  }

  return db.transaction(async (tx) => {
    const [producto] = await tx
      .select({ id: schema.product.id })
      .from(schema.product)
      .where(eq(schema.product.id, productoId))
      .limit(1);
    if (!producto) return { ok: false as const, mensaje: "Ese producto ya no existe." };

    /**
     * La diferencia se calcula contra **el libro**, no contra `product.stock`.
     *
     * Parece lo mismo mientras los dos coinciden, y deja de serlo justo cuando más importa: si la
     * copia se desvió, restarle el conteo propaga el error en vez de corregirlo — el dueño cuenta 8,
     * la copia dice 50, y el ajuste escribiría −42 dejando el libro en −34. Contra el libro escribe
     * exactamente lo que falta (`D-002`).
     */
    const [suma] = await tx
      .select({ total: sql<number>`coalesce(sum(${schema.stockMovement.quantity}), 0)::int` })
      .from(schema.stockMovement)
      .where(eq(schema.stockMovement.productId, productoId));

    const enElLibro = suma?.total ?? 0;
    const diferencia = saldoContado - enElLibro;

    // Tres casos, no dos. Cuando el conteo ya coincide con el libro pero la copia se había
    // desviado, no hay nada que registrar —no pasó nada en el mundo— pero sí hay que reparar la
    // copia. Rechazarlo dejaría al dueño mirando un aviso que no puede quitar.
    if (diferencia !== 0) {
      await tx.insert(schema.stockMovement).values({
        productId: productoId,
        quantity: diferencia,
        type: "adjustment",
        reason: limpio,
        userId: usuarioId,
      });
    }

    await tx
      .update(schema.product)
      .set({
        stock: sql`(select coalesce(sum(${schema.stockMovement.quantity}), 0)
          from ${schema.stockMovement}
          where ${schema.stockMovement.productId} = ${productoId})`,
      })
      .where(eq(schema.product.id, productoId));

    const [despues] = await tx
      .select({ stock: schema.product.stock })
      .from(schema.product)
      .where(eq(schema.product.id, productoId));
    return { ok: true as const, nuevoSaldo: despues!.stock, seEscribioMovimiento: diferencia !== 0 };
  });
}

export const ETIQUETA_MOVIMIENTO: Record<Movimiento["tipo"], string> = {
  initial: "Existencias iniciales",
  sale: "Venta",
  sale_void: "Venta anulada",
  // «Conteo corregido» y no «Ajuste»: es la acción que el dueño hizo, con el nombre que ve al hacerla
  // («Corregir el conteo», `T-029`).
  adjustment: "Conteo corregido",
};
