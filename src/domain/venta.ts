import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
  TransactionRollbackError,
} from "drizzle-orm";
import { db, schema } from "@/db";
import {
  conCodigoParecido,
  listarCatalogo,
  resolverCodigo,
  type CodigoResuelto,
  type ProductoDelCatalogo,
} from "./catalogo";
import { repartir, type Grupo, type Porcion } from "./codigos";
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

/** Un producto tal como la venta lo necesita: para añadirlo y mostrar su línea. */
export type ProductoParaVender = {
  id: string;
  nombre: string;
  precio: number;
  existencias: number;
};

export type LineaPedida = {
  productoId: string;
  cantidad: number;
  /**
   * El código escaneado, si lo hubo: lo vendido sale de ese código. Sin él, sale del más antiguo
   * que tenga unidades (`AC-027`). Opcional para que una venta guardada antes de `D-010` —sin este
   * campo— se pueda seguir cobrando.
   */
  codigoId?: string | null | undefined;
};

export type ResultadoVenta = {
  ventaId: string;
  total: number;
  /** Verdadero cuando la venta ya estaba registrada y este envío fue un reintento (`AC-010`). */
  yaEstaba: boolean;
};

/**
 * Lo que el dueño escribe en la venta, resuelto. Una sola función decide qué era, y la pantalla no
 * tiene que adivinarlo (`D-001`): un código se busca como código y cualquier otra cosa se busca
 * como nombre.
 */
export type EntradaDeVenta =
  | { tipo: "producto"; producto: ProductoParaVender; codigo: CodigoResuelto }
  | { tipo: "codigoDesconocido"; codigo: string }
  | { tipo: "resultados"; texto: string; resultados: ProductoParaVender[] };

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
    return { tipo: "producto", producto: { id, nombre, precio, existencias }, codigo: resuelto.codigo };
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
          inArray(schema.product.id, conCodigoParecido(limpio)),
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
      /**
       * `FOR UPDATE`: dos ventas del mismo producto a la vez se ponen en fila (`T-037`). Sin el
       * bloqueo, cada una recalculaba el saldo sin ver el movimiento de la otra y la última pisaba
       * a la primera: medido, 20 ventas simultáneas dejaban el saldo en 3 con el libro en −5. En
       * orden de id, para que dos ventas con los mismos productos no se bloqueen en cruz.
       */
      const productos = await tx
        .select({ id: schema.product.id, precio: schema.product.price })
        .from(schema.product)
        .where(inArray(schema.product.id, ids))
        .orderBy(asc(schema.product.id))
        .for("update");

      const precioDe = new Map(productos.map((p) => [p.id, p.precio]));
      const faltante = ids.find((id) => !precioDe.has(id));
      if (faltante) throw new Error(`El producto ${faltante} ya no existe.`);

      const salidas = await deQueCodigoSale(tx, lineas);

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
        salidas.map((p) => ({
          productId: p.productoId,
          barcodeId: p.codigoId,
          // Con signo: vender descuenta. El libro no se edita, se le suma (`D-002`).
          quantity: -p.cantidad,
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

/**
 * De qué código sale cada unidad vendida (`AC-027`). Lo escaneado sale de su código; lo que se
 * añadió sin escanear se reparte desde el más antiguo con unidades (`codigos.ts`).
 *
 * Primero lo escaneado y después lo demás, y sobre el mismo saldo: si en la venta van dos del código
 * viejo escaneadas y una sin escanear, esa una ya no cuenta con las dos que se van.
 */
async function deQueCodigoSale(
  tx: Escritor,
  lineas: LineaPedida[],
): Promise<(Porcion & { productoId: string })[]> {
  const ids = [...new Set(lineas.map((l) => l.productoId))];
  const [codigos, saldos] = await Promise.all([
    tx
      .select({
        id: schema.productBarcode.id,
        productoId: schema.productBarcode.productId,
        desde: schema.productBarcode.createdAt,
      })
      .from(schema.productBarcode)
      .where(inArray(schema.productBarcode.productId, ids)),
    tx
      .select({
        productoId: schema.stockMovement.productId,
        codigoId: schema.stockMovement.barcodeId,
        cantidad: sql<number>`sum(${schema.stockMovement.quantity})::int`,
      })
      .from(schema.stockMovement)
      .where(inArray(schema.stockMovement.productId, ids))
      .groupBy(schema.stockMovement.productId, schema.stockMovement.barcodeId),
  ]);

  const grupos = new Map<string, Grupo[]>();
  for (const id of ids) {
    const sinCodigo = saldos.find((s) => s.productoId === id && s.codigoId === null);
    grupos.set(id, [
      ...(sinCodigo ? [{ id: null, desde: 0, cantidad: sinCodigo.cantidad }] : []),
      ...codigos
        .filter((c) => c.productoId === id)
        .map((c) => ({
          id: c.id,
          desde: c.desde.getTime(),
          cantidad: saldos.find((s) => s.codigoId === c.id)?.cantidad ?? 0,
        })),
    ]);
  }

  const salidas: (Porcion & { productoId: string })[] = [];
  const descontar = (productoId: string, codigoId: string | null, cantidad: number) => {
    salidas.push({ productoId, codigoId, cantidad });
    const g = grupos.get(productoId)!.find((x) => x.id === codigoId);
    if (g) g.cantidad -= cantidad;
  };

  for (const l of lineas.filter((x) => x.codigoId)) {
    const esSuyo = grupos.get(l.productoId)!.some((g) => g.id === l.codigoId);
    // Un código que no es del producto —una venta guardada vieja, un envío fabricado— no se cree:
    // se reparte como si no se hubiera escaneado.
    if (esSuyo) descontar(l.productoId, l.codigoId!, l.cantidad);
    else for (const p of repartir(grupos.get(l.productoId)!, l.cantidad)) descontar(l.productoId, p.codigoId, p.cantidad);
  }
  for (const l of lineas.filter((x) => !x.codigoId)) {
    for (const p of repartir(grupos.get(l.productoId)!, l.cantidad)) {
      descontar(l.productoId, p.codigoId, p.cantidad);
    }
  }
  return salidas;
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
      // Por unión y no por subconsulta correlacionada. Drizzle **no cualifica** los nombres de
      // columna dentro de una plantilla `sql` en un `select`: una correlación escrita a mano emitía
      // `where "product_id" = "id"`, y ahí `"id"` se ataba a `sale_line.id`. Nunca acertaba y la
      // antigua cuadrícula ordenaba todo por cero. En un `update` sí cualifica.
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

/** Días de ventas que se enseñan de una vez; «Ver más días» suma otros tantos (`T-037`). */
export const DIAS_POR_PAGINA = 7;

/**
 * Los días de Ventas y la suma del rango, sin traer más ventas de las que se enseñan (`T-037`).
 *
 * Antes se traían todas las ventas del rango, y sin rango, todas las de la historia: medido con
 * 20.000 ventas, la página pesaba 60 MB y tardaba 2 s. Ahora la suma sale de la base agrupada por
 * día —una fila por día, no por venta— y las ventas se piden solo para los días que caben.
 */
export async function ventasDelRango(
  rango: RangoDeFechas,
  maxDias: number = DIAS_POR_PAGINA,
): Promise<{ dias: DiaDeVentas[]; resumen: ResumenDelRango; hayMas: boolean }> {
  const condiciones = [];
  if (rango.desde) condiciones.push(gte(schema.sale.createdAt, medianoche(rango.desde)));
  if (rango.hasta) condiciones.push(lt(schema.sale.createdAt, medianoche(rango.hasta, 1)));
  const dia = sql<string>`to_char(timezone(${ZONA_DEL_NEGOCIO}::text, ${schema.sale.createdAt}), 'YYYY-MM-DD')`;

  const porDia = await db
    .select({
      dia,
      total: sql<number>`coalesce(sum(${schema.sale.total}) filter (where ${schema.sale.voidedAt} is null), 0)::int`,
      ventas: sql<number>`(count(*) filter (where ${schema.sale.voidedAt} is null))::int`,
      anuladas: sql<number>`(count(*) filter (where ${schema.sale.voidedAt} is not null))::int`,
    })
    .from(schema.sale)
    .where(condiciones.length > 0 ? and(...condiciones) : undefined)
    // Por posición y no repitiendo la expresión: cada vez que aparece, Drizzle manda la zona como un
    // parámetro nuevo, y Postgres no reconoce que el `group by` es la columna del `select`.
    .groupBy(sql`1`)
    .orderBy(sql`1 desc`);

  const resumen = porDia.reduce(
    (r, d) => ({ total: r.total + d.total, numeroVentas: r.numeroVentas + d.ventas, anuladas: r.anuladas + d.anuladas }),
    { total: 0, numeroVentas: 0, anuladas: 0 } as ResumenDelRango,
  );
  const visibles = porDia.slice(0, maxDias);
  const masAntiguo = visibles.at(-1)?.dia;
  const dias = masAntiguo ? await ventasPorDia({ desde: masAntiguo, hasta: rango.hasta }) : [];
  return { dias, resumen, hayMas: porDia.length > visibles.length };
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
    // Se compensa lo que el libro dice que salió, código por código: cada unidad vuelve al código
    // del que se fue (`D-010`). Las líneas de venta no lo saben; los movimientos sí.
    const salidas = await tx
      .select({
        productoId: schema.stockMovement.productId,
        codigoId: schema.stockMovement.barcodeId,
        cantidad: schema.stockMovement.quantity,
      })
      .from(schema.stockMovement)
      .where(and(eq(schema.stockMovement.saleId, ventaId), eq(schema.stockMovement.type, "sale")));

    /**
     * AC-012: anular dos veces devolvería las existencias dos veces. Comprobar y marcar van en una
     * sola sentencia (`T-037`): leer «no está anulada» y luego marcarla dejaba que cinco toques a la
     * vez leyeran lo mismo, y medido, las cinco anulaciones pasaban y devolvían cinco veces. Ahora
     * solo una encuentra la fila sin marcar; las demás no escriben nada.
     */
    const marcada = await tx
      .update(schema.sale)
      .set({ voidedAt: new Date(), voidedBy: usuarioId })
      .where(and(eq(schema.sale.id, ventaId), isNull(schema.sale.voidedAt)))
      .returning({ id: schema.sale.id });
    if (marcada.length === 0) {
      const [existe] = await tx
        .select({ id: schema.sale.id })
        .from(schema.sale)
        .where(eq(schema.sale.id, ventaId))
        .limit(1);
      return {
        ok: false as const,
        mensaje: existe ? "Esa venta ya está anulada." : "Esa venta no existe.",
      };
    }
    // Una venta sin movimientos no se puede compensar: se deshace la marca en vez de dejarla puesta.
    if (salidas.length === 0) tx.rollback();

    const ids = [...new Set(salidas.map((l) => l.productoId))];
    // Los mismos bloqueos que la venta, en el mismo orden: el saldo se recalcula en fila (`T-037`).
    await tx
      .select({ id: schema.product.id })
      .from(schema.product)
      .where(inArray(schema.product.id, ids))
      .orderBy(asc(schema.product.id))
      .for("update");

    await tx.insert(schema.stockMovement).values(
      salidas.map((l) => ({
        productId: l.productoId,
        barcodeId: l.codigoId,
        // Positivo: devuelve exactamente lo que la venta se llevó.
        quantity: -l.cantidad,
        type: "sale_void" as const,
        saleId: ventaId,
        userId: usuarioId,
      })),
    );
    await recalcularSaldos(tx, ids);

    return { ok: true as const };
  }).catch((error: unknown) => {
    if (error instanceof TransactionRollbackError) {
      return { ok: false as const, mensaje: "Esa venta no tiene líneas." };
    }
    throw error;
  });
}
