import { and, asc, count, eq, gte, ilike, inArray, lt, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { equivalentes, normalizarCodigo } from "./escaneo";
import type { FiltrosCatalogo } from "./filtros";
import type { AltaDeProducto, CodigoNuevo, EdicionDeProducto } from "./producto";

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
  activo: boolean;
};

export type ResultadoAlta =
  /** `codigoId` es el código con que nació, para que la venta sepa de cuál descontar (`AC-027`). */
  | { ok: true; id: string; codigoId: string | null }
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
  const partes: (SQL | undefined)[] = [];
  // Un producto desactivado sigue existiendo y se puede pedir a propósito; por defecto no aparece
  // (`AC-022`).
  if (!f.incluirDesactivados) partes.push(eq(schema.product.isActive, true));

  // El dueño busca por lo que ve en el empaque: el nombre o cualquiera de sus códigos.
  if (f.busqueda) {
    partes.push(
      or(
        ilike(schema.product.name, `%${f.busqueda}%`),
        inArray(schema.product.id, conCodigoParecido(f.busqueda)),
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
  if (f.existencias === "por-reponer") partes.push(lte(schema.product.stock, 0));

  return and(...partes)!;
}

/**
 * Los productos con algún código que contiene el texto. Subconsulta **sin correlacionar** a
 * propósito: dentro de una plantilla `sql` Drizzle no cualifica los nombres de columna, y una
 * correlación escrita a mano se ataba a la tabla equivocada (ver `ventasPorDia` en `venta.ts`).
 * Un `in (select …)` no tiene ese problema.
 */
export function conCodigoParecido(texto: string) {
  return db
    .select({ id: schema.productBarcode.productId })
    .from(schema.productBarcode)
    .where(ilike(schema.productBarcode.code, `%${texto}%`));
}

export async function listarCatalogo(f: FiltrosCatalogo): Promise<PaginaDelCatalogo> {
  const donde = condiciones(f);

  // Dos consultas y no una: el total tiene que ser el de todos los que cumplen, no el de los que
  // se muestran. Sacarlo con una ventana sobre la misma consulta ahorraría un viaje y costaría
  // entender por qué el número no cuadra el día que cambie el orden.
  const [productos, conteo] = await Promise.all([
    db
      .select({
        id: schema.product.id,
        nombre: schema.product.name,
        precio: schema.product.price,
        existencias: schema.product.stock,
        categoria: schema.category.name,
        activo: schema.product.isActive,
      })
      .from(schema.product)
      .leftJoin(schema.category, eq(schema.product.categoryId, schema.category.id))
      .where(donde)
      .orderBy(asc(schema.product.name))
      .limit(f.ver),
    contarCatalogo(f),
  ]);

  return { productos, total: conteo, hayMas: conteo > productos.length };
}

/**
 * Cuántos productos cumplen unos filtros, sin traerlos. Es lo que dice «Ver 3 productos» mientras
 * se eligen los filtros (`.diseno/cobalto/F-M-Filtros`): se sabe si el filtro deja la lista vacía
 * antes de aplicarlo. Usa las mismas condiciones que la lista, así que el número no puede diferir
 * de lo que se ve al aplicar.
 */
export async function contarCatalogo(f: FiltrosCatalogo): Promise<number> {
  const [conteo] = await db
    .select({ n: count() })
    .from(schema.product)
    .leftJoin(schema.category, eq(schema.product.categoryId, schema.category.id))
    .where(condiciones(f));
  return conteo?.n ?? 0;
}

export type CodigoResuelto = { id: string; numero: string };

export type Resuelto =
  /** El producto **y** el código que se leyó: lo vendido sale de ese código (`AC-027`). */
  | { ok: true; producto: ProductoDelCatalogo; codigo: CodigoResuelto }
  | { ok: false; motivo: "desconocido" | "ilegible"; codigo: string };

/**
 * Un código a un producto. Es la única entrada del escaneo: da igual si lo trajo la cámara, el
 * lector o el dedo (`AC-006`), y por ser función de dominio sirve igual a la pantalla de hoy que a
 * la ruta HTTP de mañana (`D-001`).
 *
 * Un producto desactivado se devuelve igual. Existe, tiene ese código, y decir «desconocido»
 * llevaría al dueño a darlo de alta otra vez y a chocar con la unicidad de `AC-004`.
 */
export async function resolverCodigo(crudo: string): Promise<Resuelto> {
  const codigo = normalizarCodigo(crudo);
  if (codigo === null) return { ok: false, motivo: "ilegible", codigo: crudo.trim() };

  const [fila] = await db
    .select({
      id: schema.product.id,
      nombre: schema.product.name,
      precio: schema.product.price,
      existencias: schema.product.stock,
      categoria: schema.category.name,
      activo: schema.product.isActive,
      codigoId: schema.productBarcode.id,
      numero: schema.productBarcode.code,
    })
    .from(schema.productBarcode)
    .innerJoin(schema.product, eq(schema.product.id, schema.productBarcode.productId))
    .leftJoin(schema.category, eq(schema.product.categoryId, schema.category.id))
    .where(inArray(schema.productBarcode.code, equivalentes(codigo)));

  if (!fila) return { ok: false, motivo: "desconocido", codigo };
  const { codigoId, numero, ...producto } = fila;
  return { ok: true, producto, codigo: { id: codigoId, numero } };
}

/**
 * Quién tiene ya un código, contando sus formas equivalentes: un UPC-A de doce dígitos y su EAN-13
 * con un cero delante son el mismo empaque (`escaneo.ts`). `AC-004` pide nombrarlo.
 */
async function quienLoTiene(
  tx: Escritor,
  codigo: string,
  excepto?: string,
): Promise<{ nombre: string } | undefined> {
  const formas = equivalentes(normalizarCodigo(codigo) ?? codigo);
  const [chocando] = await tx
    .select({ nombre: schema.product.name })
    .from(schema.productBarcode)
    .innerJoin(schema.product, eq(schema.product.id, schema.productBarcode.productId))
    .where(
      excepto
        ? and(inArray(schema.productBarcode.code, formas), ne(schema.productBarcode.id, excepto))
        : inArray(schema.productBarcode.code, formas),
    )
    .limit(1);
  return chocando;
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
      const chocando = await quienLoTiene(tx, alta.codigoDeBarras);
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

    const categoriaId = alta.categoria ? await idDeCategoria(tx, alta.categoria) : null;

    const [producto] = await tx
      .insert(schema.product)
      .values({
        name: alta.nombre,
        price: alta.precio,
        categoryId: categoriaId,
        // Nace en cero. Las existencias entran por el libro, nunca escritas sueltas (`D-002`).
        stock: 0,
      })
      .returning({ id: schema.product.id });
    const id = producto!.id;

    let codigoId: string | null = null;
    try {
      if (alta.codigoDeBarras) {
        const [codigo] = await tx
          .insert(schema.productBarcode)
          .values({ productId: id, code: alta.codigoDeBarras })
          .returning({ id: schema.productBarcode.id });
        codigoId = codigo!.id;
      }
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

    if (alta.existenciasIniciales > 0) {
      await tx.insert(schema.stockMovement).values({
        productId: id,
        barcodeId: codigoId,
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

    return { ok: true as const, id, codigoId };
  });
}

/** Postgres, no Drizzle: el código y el nombre de la restricción vienen del driver. */
function esCodigoDeBarrasRepetido(error: unknown): boolean {
  const causa = error instanceof Error && "cause" in error ? error.cause : error;
  const detalle = causa as { code?: string; constraint?: string } | null;
  return detalle?.code === "23505" && detalle?.constraint === "product_barcode_code_unique";
}

/** El saldo es la suma del libro. Aquí como subconsulta para que nunca se calcule en memoria. */
function saldoDelLibro(productoId: string) {
  return sql`(select sum(${schema.stockMovement.quantity}) from ${schema.stockMovement}
    where ${schema.stockMovement.productId} = ${productoId})`;
}

export type ResultadoEdicion = { ok: true } | { ok: false; campo: string; mensaje: string };

/**
 * Editar un producto. El precio es el único campo cuyo cambio deja rastro: es lo único que afecta a
 * la plata, y lo que ya se cobró está a salvo porque `sale_line` guarda su copia (`AC-009`,
 * decidido con el estudio el 2026-09-07).
 */
export async function editarProducto(
  productoId: string,
  edicion: EdicionDeProducto,
  usuarioId: string,
): Promise<ResultadoEdicion> {
  return db.transaction(async (tx) => {
    const [actual] = await tx
      .select({ precio: schema.product.price })
      .from(schema.product)
      .where(eq(schema.product.id, productoId))
      .limit(1);
    if (!actual) return { ok: false as const, campo: "nombre", mensaje: "Ese producto ya no existe." };

    const categoriaId = edicion.categoria
      ? await idDeCategoria(tx, edicion.categoria)
      : null;

    await tx
      .update(schema.product)
      .set({
        name: edicion.nombre,
        price: edicion.precio,
        categoryId: categoriaId,
        updatedAt: new Date(),
      })
      .where(eq(schema.product.id, productoId));

    // Solo si cambió de verdad: un guardado que no toca el precio no ensucia el historial.
    if (edicion.precio !== actual.precio) {
      await tx.insert(schema.productEvent).values({
        productId: productoId,
        type: "price_change",
        previousPrice: actual.precio,
        newPrice: edicion.precio,
        userId: usuarioId,
      });
    }

    return { ok: true as const };
  });
}

/**
 * Retirar un producto de la venta, o devolverlo. Nunca se borra: los movimientos y las ventas lo
 * nombran para siempre (`data-model.md` § Data Lifecycle, `AC-022`).
 */
export async function cambiarActivacion(
  productoId: string,
  activo: boolean,
  usuarioId: string,
): Promise<ResultadoEdicion> {
  return db.transaction(async (tx) => {
    const [actual] = await tx
      .select({ activo: schema.product.isActive })
      .from(schema.product)
      .where(eq(schema.product.id, productoId))
      .limit(1);
    if (!actual) return { ok: false as const, campo: "activo", mensaje: "Ese producto ya no existe." };
    if (actual.activo === activo) return { ok: true as const };

    await tx
      .update(schema.product)
      .set({ isActive: activo, updatedAt: new Date() })
      .where(eq(schema.product.id, productoId));
    await tx.insert(schema.productEvent).values({
      productId: productoId,
      type: activo ? "reactivated" : "deactivated",
      userId: usuarioId,
    });

    return { ok: true as const };
  });
}

/** Buscar la categoría por nombre o crearla. La misma regla que en el alta (`T-003`). */
async function idDeCategoria(tx: Escritor, nombre: string): Promise<string> {
  const [existente] = await tx
    .select({ id: schema.category.id })
    .from(schema.category)
    .where(eq(schema.category.name, nombre))
    .limit(1);
  if (existente) return existente.id;
  const creada = await tx
    .insert(schema.category)
    .values({ name: nombre })
    .returning({ id: schema.category.id });
  return creada[0]!.id;
}

/** La transacción de Drizzle no es la misma forma que `db`, pero para escribir es intercambiable. */
type Escritor = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ResultadoCodigo =
  | { ok: true; codigoId: string }
  | { ok: false; campo: "codigo" | "llegaron" | "producto"; mensaje: string };

/**
 * Añadir un código a un producto que ya se vende (`D-010`, `AC-026`). Es lo que se hace cuando el
 * proveedor cambió el código: el producto, su precio y su historial siguen siendo los mismos.
 *
 * Lo que llegó con el código entra al libro como `purchase` de ese código, y el total del producto
 * se vuelve a leer del libro (`D-002`). Cero unidades es válido: se añade el código y se cuenta
 * después.
 */
export async function anadirCodigo(
  productoId: string,
  nuevo: CodigoNuevo,
  usuarioId: string,
): Promise<ResultadoCodigo> {
  try {
    return await db.transaction(async (tx) => {
      const [producto] = await tx
        .select({ id: schema.product.id })
        .from(schema.product)
        .where(eq(schema.product.id, productoId))
        .limit(1);
      if (!producto) return { ok: false as const, campo: "producto" as const, mensaje: "Ese producto ya no existe." };

      const chocando = await quienLoTiene(tx, nuevo.codigo);
      if (chocando) {
        return {
          ok: false as const,
          campo: "codigo" as const,
          mensaje: `Ese código ya es de «${chocando.nombre}».`,
        };
      }

      const [codigo] = await tx
        .insert(schema.productBarcode)
        .values({ productId: productoId, code: nuevo.codigo })
        .returning({ id: schema.productBarcode.id });

      if (nuevo.llegaron > 0) {
        await tx.insert(schema.stockMovement).values({
          productId: productoId,
          barcodeId: codigo!.id,
          quantity: nuevo.llegaron,
          type: "purchase",
          userId: usuarioId,
        });
        await tx
          .update(schema.product)
          .set({ stock: sql`coalesce(${saldoDelLibro(productoId)}, 0)` })
          .where(eq(schema.product.id, productoId));
      }

      return { ok: true as const, codigoId: codigo!.id };
    });
  } catch (error) {
    // La misma rendija que en el alta: otro lo añadió entre leer y escribir.
    if (esCodigoDeBarrasRepetido(error)) {
      return { ok: false, campo: "codigo", mensaje: "Ese código ya es de otro producto." };
    }
    throw error;
  }
}

export type ResultadoCorreccion = { ok: true } | { ok: false; mensaje: string };

/**
 * Corregir el número de un código mal tecleado. Sus movimientos siguen siendo suyos: se corrige cómo
 * se llama, no de qué fue cada venta. Un código no se borra, porque el libro lo nombra (`D-010`).
 */
export async function corregirCodigo(
  codigoId: string,
  numeroCrudo: string,
): Promise<ResultadoCorreccion> {
  const numero = numeroCrudo.replace(/\s/g, "");
  if (!numero) return { ok: false, mensaje: "El código no puede quedar vacío." };
  try {
    return await db.transaction(async (tx) => {
      const chocando = await quienLoTiene(tx, numero, codigoId);
      if (chocando) return { ok: false as const, mensaje: `Ese código ya es de «${chocando.nombre}».` };
      await tx
        .update(schema.productBarcode)
        .set({ code: numero })
        .where(eq(schema.productBarcode.id, codigoId));
      return { ok: true as const };
    });
  } catch (error) {
    if (esCodigoDeBarrasRepetido(error)) return { ok: false, mensaje: "Ese código ya es de otro producto." };
    throw error;
  }
}

export type CandidatoParaCodigo = {
  id: string;
  nombre: string;
  precio: number;
  existencias: number;
  codigos: string[];
};

/**
 * Los productos a los que se les puede añadir un código nuevo, buscados por nombre (`AC-025`). Cada
 * uno dice qué códigos tiene ya: es lo que ayuda a reconocer «este es el mismo, cambió el código».
 */
export async function buscarParaAnadirCodigo(texto: string): Promise<CandidatoParaCodigo[]> {
  const limpio = texto.trim();
  if (!limpio) return [];
  const productos = await db
    .select({
      id: schema.product.id,
      nombre: schema.product.name,
      precio: schema.product.price,
      existencias: schema.product.stock,
    })
    .from(schema.product)
    .where(and(eq(schema.product.isActive, true), ilike(schema.product.name, `%${limpio}%`)))
    .orderBy(asc(schema.product.name))
    .limit(12);
  if (productos.length === 0) return [];

  const codigos = await db
    .select({ productoId: schema.productBarcode.productId, numero: schema.productBarcode.code })
    .from(schema.productBarcode)
    .where(inArray(schema.productBarcode.productId, productos.map((p) => p.id)))
    .orderBy(asc(schema.productBarcode.createdAt));

  return productos.map((p) => ({
    ...p,
    codigos: codigos.filter((c) => c.productoId === p.id).map((c) => c.numero),
  }));
}
