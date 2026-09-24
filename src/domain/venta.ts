import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { listarCatalogo, resolverCodigo, type ProductoDelCatalogo } from "./catalogo";
import { normalizarCodigo } from "./escaneo";
import { leerFiltros } from "./filtros";
import { resumirDias, type ResumenDelRango } from "./resumen";
import { diaDelNegocio, ZONA_DEL_NEGOCIO } from "./zona";

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
  /**
   * Uniones de verdad y no una subconsulta correlacionada escrita a mano.
   *
   * Drizzle **no cualifica** los nombres de columna dentro de una plantilla `sql` en un `select`:
   * emitía `where "product_id" = "id"`, y ahí `"id"` se ata a `sale_line.id`, no a `product.id`.
   * La comparación no acertaba nunca y la cuadrícula ordenaba todo por cero. En un `update` sí
   * cualifica, que es por lo que el saldo del libro siempre estuvo bien.
   */
  const vendidoReciente = sql<number>`coalesce(sum(
    case when ${schema.sale.voidedAt} is null
          and ${schema.sale.createdAt} > now() - ${`${VENTANA_DIAS} days`}::interval
         then ${schema.saleLine.quantity} else 0 end
  ), 0)::int`;

  return db
    .select({
      id: schema.product.id,
      nombre: schema.product.name,
      precio: schema.product.price,
      existencias: schema.product.stock,
    })
    .from(schema.product)
    .leftJoin(schema.saleLine, eq(schema.saleLine.productId, schema.product.id))
    .leftJoin(schema.sale, eq(schema.sale.id, schema.saleLine.saleId))
    .where(eq(schema.product.isActive, true))
    .groupBy(schema.product.id)
    .orderBy(desc(vendidoReciente), asc(schema.product.name))
    .limit(CASILLAS);
}

/**
 * Lo que el dueño escribe en la venta, resuelto. Una sola función decide qué era, y la pantalla no
 * tiene que adivinarlo (`D-001`): un código se busca como código y cualquier otra cosa se busca
 * como nombre.
 */
export type EntradaDeVenta =
  | { tipo: "producto"; producto: CasillaDeVenta }
  | { tipo: "codigoDesconocido"; codigo: string }
  | { tipo: "resultados"; texto: string; resultados: CasillaDeVenta[] };

/** Suficientes para encontrar lo que se busca, pocos para que quepan sin empujar el total. */
export const RESULTADOS = 12;

export async function resolverEntradaDeVenta(texto: string): Promise<EntradaDeVenta> {
  const limpio = texto.trim();

  // Si tiene forma de código, es un código. Escanear y teclear el código no pueden dar resultados
  // distintos (`AC-006`), así que este camino es el mismo de `T-016`.
  const codigo = normalizarCodigo(limpio);
  if (codigo !== null) {
    const resuelto = await resolverCodigo(codigo);
    if (!resuelto.ok) return { tipo: "codigoDesconocido", codigo };
    const { id, nombre, precio, existencias } = resuelto.producto;
    return { tipo: "producto", producto: { id, nombre, precio, existencias } };
  }

  if (!limpio) return { tipo: "resultados", texto: limpio, resultados: [] };

  const resultados = await db
    .select({
      id: schema.product.id,
      nombre: schema.product.name,
      precio: schema.product.price,
      existencias: schema.product.stock,
    })
    .from(schema.product)
    // Un producto retirado no se vende (`T-012`), así que no puede aparecer aquí.
    .where(
      and(
        eq(schema.product.isActive, true),
        // También por código: un trozo de código —«7702»— no es un código válido y caería aquí.
        or(
          ilike(schema.product.name, `%${limpio}%`),
          ilike(schema.product.barcode, `%${limpio}%`),
        ),
      ),
    )
    .orderBy(asc(schema.product.name))
    .limit(RESULTADOS);

  return { tipo: "resultados", texto: limpio, resultados };
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

/* ------------------------------------------------------------------ historial de ventas (T-014) */

export type VentaDelDia = {
  id: string;
  total: number;
  cuando: Date;
  anulada: boolean;
  articulos: number;
};

export type DiaDeVentas = {
  /** `YYYY-MM-DD` en la zona del negocio (`zona.ts`), no en la de la base ni la del servidor. */
  dia: string;
  /** Suma solo de las no anuladas: una venta anulada no es plata que entró (`AC-019`). */
  total: number;
  ventas: VentaDelDia[];
};

export type RangoDeFechas = { desde: string | null; hasta: string | null };

/**
 * El instante en que empieza un día del negocio. `timezone(zona, timestamp)` interpreta una fecha
 * sin zona **como** de esa zona y devuelve el instante: es la conversión que `new Date("...")` hacía
 * en la zona del proceso, hecha donde sí se sabe cuál es la zona correcta.
 *
 * Se convierten los extremos y no la columna a propósito. Envolver `created_at` en una expresión
 * dejaría fuera a `sale_created_at_idx`; así la comparación sigue siendo contra un instante y el
 * índice sigue sirviendo.
 */
const medianoche = (fecha: string, masDias = 0) =>
  // Los `::text` y el `::int` no sobran: un parámetro llega a Postgres sin tipo, y `$1::date + $2`
  // no resuelve a ningún operador. Comprobado contra la base, no deducido.
  sql`timezone(${ZONA_DEL_NEGOCIO}::text, ((${fecha}::text)::date + ${masDias}::int)::timestamp)`;

export async function ventasPorDia(rango: RangoDeFechas): Promise<DiaDeVentas[]> {
  const condiciones = [];
  if (rango.desde) condiciones.push(gte(schema.sale.createdAt, medianoche(rango.desde)));
  // Hasta la medianoche del día siguiente, sin incluirla. `23:59:59.999` dejaba fuera lo ocurrido
  // en el último milisegundo del día, que existe porque el instante guardado tiene microsegundos.
  if (rango.hasta) condiciones.push(lt(schema.sale.createdAt, medianoche(rango.hasta, 1)));

  const filas = await db
    .select({
      id: schema.sale.id,
      total: schema.sale.total,
      cuando: schema.sale.createdAt,
      anuladaEn: schema.sale.voidedAt,
      // En la zona del negocio: `to_char` a secas usaba la de la sesión de Postgres, que en Neon es
      // UTC, y ahí una venta de las nueve de la noche en Bogotá ya es del día siguiente.
      dia: sql<string>`to_char(timezone(${ZONA_DEL_NEGOCIO}, ${schema.sale.createdAt}), 'YYYY-MM-DD')`,
      // Por unión y no por subconsulta correlacionada: ver el comentario de `cuadricula`.
      articulos: sql<number>`coalesce(sum(${schema.saleLine.quantity}), 0)::int`,
    })
    .from(schema.sale)
    .leftJoin(schema.saleLine, eq(schema.saleLine.saleId, schema.sale.id))
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    .groupBy(schema.sale.id)
    .orderBy(desc(schema.sale.createdAt));

  const porDia = new Map<string, DiaDeVentas>();
  for (const f of filas) {
    const dia = porDia.get(f.dia) ?? { dia: f.dia, total: 0, ventas: [] };
    const anulada = f.anuladaEn !== null;
    dia.ventas.push({ id: f.id, total: f.total, cuando: f.cuando, anulada, articulos: f.articulos });
    if (!anulada) dia.total += f.total;
    porDia.set(f.dia, dia);
  }
  return [...porDia.values()];
}

/** Una consulta para que la página de Ventas reciba sus días y la suma del mismo rango. */
export async function ventasDelRango(rango: RangoDeFechas): Promise<{
  dias: DiaDeVentas[];
  resumen: ResumenDelRango;
}> {
  const dias = await ventasPorDia(rango);
  return { dias, resumen: resumirDias(dias) };
}

export type ResumenDelDia = {
  dia: string;
  total: number;
  numeroVentas: number;
  ultimasVentas: VentaDelDia[];
  porReponer: { total: number; productos: ProductoDelCatalogo[] };
};

/** Una llamada del servidor reúne lo que necesita Inicio. El corte y el filtro se comparten. */
export async function resumenDelDia(instante = new Date()): Promise<ResumenDelDia> {
  const dia = diaDelNegocio(instante);
  const [dias, catalogo] = await Promise.all([
    ventasPorDia({ desde: dia, hasta: dia }),
    listarCatalogo(leerFiltros({ existencias: "por-reponer" })),
  ]);
  const ventas = dias[0]?.ventas ?? [];
  const resumen = resumirDias(dias);
  return {
    dia,
    total: resumen.total,
    numeroVentas: resumen.numeroVentas,
    ultimasVentas: ventas.slice(0, 4),
    porReponer: { total: catalogo.total, productos: catalogo.productos.slice(0, 3) },
  };
}

export type LineaDeLaVenta = {
  productoId: string;
  nombre: string;
  cantidad: number;
  /** Lo que se cobró, no lo que cuesta hoy (`AC-009`, `AC-020`). */
  precioCobrado: number;
};

export type DetalleDeVenta = {
  id: string;
  total: number;
  cuando: Date;
  anulada: boolean;
  anuladaEn: Date | null;
  quien: string;
  lineas: LineaDeLaVenta[];
};

export async function detalleDeVenta(ventaId: string): Promise<DetalleDeVenta | null> {
  const [venta] = await db
    .select({
      id: schema.sale.id,
      total: schema.sale.total,
      cuando: schema.sale.createdAt,
      anuladaEn: schema.sale.voidedAt,
      quien: schema.user.name,
    })
    .from(schema.sale)
    .innerJoin(schema.user, eq(schema.user.id, schema.sale.userId))
    .where(eq(schema.sale.id, ventaId))
    .limit(1);
  if (!venta) return null;

  const lineas = await db
    .select({
      productoId: schema.saleLine.productId,
      nombre: schema.product.name,
      cantidad: schema.saleLine.quantity,
      precioCobrado: schema.saleLine.unitPrice,
    })
    .from(schema.saleLine)
    .innerJoin(schema.product, eq(schema.product.id, schema.saleLine.productId))
    .where(eq(schema.saleLine.saleId, ventaId))
    .orderBy(asc(schema.product.name));

  return {
    id: venta.id,
    total: venta.total,
    cuando: venta.cuando,
    anulada: venta.anuladaEn !== null,
    anuladaEn: venta.anuladaEn,
    quien: venta.quien,
    lineas,
  };
}

export type ResultadoAnulacion = { ok: true } | { ok: false; mensaje: string };

/**
 * Anular no deshace: compensa. Se escriben movimientos `sale_void` que devuelven exactamente lo
 * vendido y los originales se quedan donde estaban — el registro de que se vendió y se anuló es
 * parte de la historia (`D-002`, `AC-011`).
 */
export async function anularVenta(ventaId: string, usuarioId: string): Promise<ResultadoAnulacion> {
  return db.transaction(async (tx) => {
    const [venta] = await tx
      .select({ anuladaEn: schema.sale.voidedAt })
      .from(schema.sale)
      .where(eq(schema.sale.id, ventaId))
      .limit(1);
    if (!venta) return { ok: false as const, mensaje: "Esa venta no existe." };
    // AC-012: anular dos veces devolvería las existencias dos veces.
    if (venta.anuladaEn !== null) return { ok: false as const, mensaje: "Esa venta ya está anulada." };

    const lineas = await tx
      .select({ productoId: schema.saleLine.productId, cantidad: schema.saleLine.quantity })
      .from(schema.saleLine)
      .where(eq(schema.saleLine.saleId, ventaId));
    if (lineas.length === 0) return { ok: false as const, mensaje: "Esa venta no tiene líneas." };

    await tx
      .update(schema.sale)
      .set({ voidedAt: new Date(), voidedBy: usuarioId })
      .where(eq(schema.sale.id, ventaId));

    await tx.insert(schema.stockMovement).values(
      lineas.map((l) => ({
        productId: l.productoId,
        // Positivo: devuelve lo que la venta se llevó.
        quantity: l.cantidad,
        type: "sale_void" as const,
        saleId: ventaId,
        userId: usuarioId,
      })),
    );
    await recalcularSaldos(tx, lineas.map((l) => l.productoId));

    return { ok: true as const };
  });
}
