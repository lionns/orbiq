import { and, asc, count, eq, gte, ilike, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { FiltrosCatalogo } from "./filtros";
import type { AltaDeProducto } from "./producto";

/**
 * El catálogo contra la base. Consulta con Drizzle directamente: sin puertos ni repositorios
 * (`D-003`). Las reglas que no necesitan base viven en `producto.ts` y se prueban aparte.
 */
export type ProductoDelCatalogo = {
  id: string;
  nombre: string;
  precio: number;
  existencias: number;
  categoria: string | null;
  codigoDeBarras: string | null;
};

export type ResultadoAlta =
  | { ok: true; id: string }
  | { ok: false; campo: string; mensaje: string };

export type PaginaDelCatalogo = {
  productos: ProductoDelCatalogo[];
  /** Cuántos cumplen los filtros en total, no cuántos se están mostrando (`AC-016`). */
  total: number;
  /** Verdadero mientras quede algo por mostrar (`AC-017`). */
  hayMas: boolean;
};

/** Un solo sitio donde se traducen los filtros a SQL: la lista y el conteo no pueden discrepar. */
function condiciones(f: FiltrosCatalogo): SQL {
  const partes: (SQL | undefined)[] = [eq(schema.product.isActive, true)];

  // El dueño busca por lo que ve en el empaque: el nombre o el código impreso.
  if (f.busqueda) {
    partes.push(
      or(
        ilike(schema.product.name, `%${f.busqueda}%`),
        ilike(schema.product.barcode, `%${f.busqueda}%`),
      ),
    );
  }
  if (f.categoria) partes.push(eq(schema.category.name, f.categoria));
  if (f.desde !== null) partes.push(gte(schema.product.price, f.desde));
  if (f.hasta !== null) partes.push(lte(schema.product.price, f.hasta));

  if (f.existencias === "disponibles") partes.push(gte(schema.product.stock, 1));
  if (f.existencias === "agotados") partes.push(eq(schema.product.stock, 0));
  // Negativo es lo que el libro dice que se vendió de más: existe porque decidimos permitirlo.
  if (f.existencias === "negativos") partes.push(lt(schema.product.stock, 0));

  return and(...partes)!;
}

export async function listarCatalogo(f: FiltrosCatalogo): Promise<PaginaDelCatalogo> {
  const donde = condiciones(f);

  // Dos consultas y no una: el total tiene que ser el de todos los que cumplen, no el de los que
  // se muestran. Sacarlo con una ventana sobre la misma consulta ahorraría un viaje y costaría
  // entender por qué el número no cuadra el día que cambie el orden.
  const [productos, [conteo]] = await Promise.all([
    db
      .select({
        id: schema.product.id,
        nombre: schema.product.name,
        precio: schema.product.price,
        existencias: schema.product.stock,
        categoria: schema.category.name,
        codigoDeBarras: schema.product.barcode,
      })
      .from(schema.product)
      .leftJoin(schema.category, eq(schema.product.categoryId, schema.category.id))
      .where(donde)
      .orderBy(asc(schema.product.name))
      .limit(f.ver),
    db
      .select({ n: count() })
      .from(schema.product)
      .leftJoin(schema.category, eq(schema.product.categoryId, schema.category.id))
      .where(donde),
  ]);

  const total = conteo?.n ?? 0;
  return { productos, total, hayMas: total > productos.length };
}

export async function categoriasExistentes(): Promise<string[]> {
  const filas = await db
    .select({ nombre: schema.category.name })
    .from(schema.category)
    .orderBy(asc(schema.category.name));
  return filas.map((f) => f.nombre);
}

export async function crearProducto(
  alta: AltaDeProducto,
  usuarioId: string,
): Promise<ResultadoAlta> {
  // Una sola transacción: el producto y su movimiento inicial entran juntos o no entra ninguno.
  // El driver es el de WebSocket precisamente por esto (`architecture.md` § Data).
  return db.transaction(async (tx) => {
    if (alta.codigoDeBarras) {
      const [chocando] = await tx
        .select({ nombre: schema.product.name })
        .from(schema.product)
        .where(eq(schema.product.barcode, alta.codigoDeBarras))
        .limit(1);
      // AC-004: nombrar el producto que ya lo tiene. «Código repetido» a secas obliga a buscarlo
      // a mano con alguien esperando en el mostrador.
      if (chocando) {
        return {
          ok: false as const,
          campo: "codigoDeBarras",
          mensaje: `Ese código ya es de «${chocando.nombre}».`,
        };
      }
    }

    let categoriaId: string | null = null;
    if (alta.categoria) {
      const [existente] = await tx
        .select({ id: schema.category.id })
        .from(schema.category)
        .where(eq(schema.category.name, alta.categoria))
        .limit(1);
      categoriaId =
        existente?.id ??
        (
          await tx
            .insert(schema.category)
            .values({ name: alta.categoria })
            .returning({ id: schema.category.id })
        )[0]!.id;
    }

    let producto;
    try {
      [producto] = await tx
        .insert(schema.product)
        .values({
          name: alta.nombre,
          price: alta.precio,
          categoryId: categoriaId,
          barcode: alta.codigoDeBarras,
          // Nace en cero. Las existencias entran por el libro, nunca escritas sueltas (`D-002`).
          stock: 0,
        })
        .returning({ id: schema.product.id });
    } catch (error) {
      // La comprobación de arriba deja una rendija: entre leer y escribir cabe otra alta con el
      // mismo código. La restricción de la base la cierra, y aquí se traduce a un mensaje en vez
      // de a un error 500. Sin nombre del otro producto, porque en esta rama no lo tenemos.
      if (esCodigoDeBarrasRepetido(error)) {
        return {
          ok: false as const,
          campo: "codigoDeBarras",
          mensaje: "Ese código ya es de otro producto.",
        };
      }
      throw error;
    }

    const id = producto!.id;

    if (alta.existenciasIniciales > 0) {
      await tx.insert(schema.stockMovement).values({
        productId: id,
        quantity: alta.existenciasIniciales,
        type: "initial",
        userId: usuarioId,
      });
      // El saldo se recalcula desde el libro, no se copia de lo que dijo el formulario (`AC-003`).
      await tx
        .update(schema.product)
        .set({ stock: sql`coalesce(${saldoDelLibro(id)}, 0)` })
        .where(eq(schema.product.id, id));
    }

    return { ok: true as const, id };
  });
}

/** Postgres, no Drizzle: el código y el nombre de la restricción vienen del driver. */
function esCodigoDeBarrasRepetido(error: unknown): boolean {
  const causa = error instanceof Error && "cause" in error ? error.cause : error;
  const detalle = causa as { code?: string; constraint?: string } | null;
  return detalle?.code === "23505" && detalle?.constraint === "product_barcode_unique";
}

/** El saldo es la suma del libro. Aquí como subconsulta para que nunca se calcule en memoria. */
function saldoDelLibro(productoId: string) {
  return sql`(select sum(${schema.stockMovement.quantity}) from ${schema.stockMovement}
    where ${schema.stockMovement.productId} = ${productoId})`;
}
