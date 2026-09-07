import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, pool, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { registrarVenta } from "../src/domain/venta";

/**
 * Catálogo de demostración: una tienda de barrio, precios en pesos colombianos.
 *
 * No es parte del producto. Existe para que la cuadrícula se vea llena y ordenada por lo más
 * vendido, que es lo que un dueño encontraría después de una semana usándola — y lo que una base
 * recién creada no puede mostrar.
 *
 *   npm run sembrar-demo            da de alta el catálogo y algunas ventas
 *   npm run sembrar-demo -- --forzar   lo hace aunque ya haya productos
 */
const CATALOGO = [
  { nombre: "Arroz Diana 500 g", precio: 3200, existencias: 40, categoria: "Granos", codigo: "7702001010011" },
  { nombre: "Panela cuadrada", precio: 4500, existencias: 25, categoria: "Granos", codigo: null },
  { nombre: "Aceite Premier 1 L", precio: 12900, existencias: 18, categoria: "Despensa", codigo: "7702001020022" },
  { nombre: "Leche Colanta 1 L", precio: 4300, existencias: 30, categoria: "Lácteos", codigo: "7702001030033" },
  { nombre: "Huevos AA (unidad)", precio: 700, existencias: 120, categoria: "Lácteos", codigo: null },
  { nombre: "Pan tajado grande", precio: 6800, existencias: 12, categoria: "Panadería", codigo: "7702001040044" },
  { nombre: "Café Sello Rojo 250 g", precio: 11500, existencias: 15, categoria: "Despensa", codigo: "7702001050055" },
  { nombre: "Azúcar Manuelita 1 kg", precio: 5200, existencias: 22, categoria: "Despensa", codigo: "7702001060066" },
  { nombre: "Gaseosa 400 ml", precio: 3000, existencias: 48, categoria: "Bebidas", codigo: "7702001070077" },
  { nombre: "Agua botella 600 ml", precio: 2200, existencias: 60, categoria: "Bebidas", codigo: "7702001080088" },
  { nombre: "Galletas Festival", precio: 2500, existencias: 35, categoria: "Mecato", codigo: "7702001090099" },
  { nombre: "Papas Margarita 25 g", precio: 2000, existencias: 50, categoria: "Mecato", codigo: "7702001100100" },
  { nombre: "Atún Van Camps", precio: 6900, existencias: 20, categoria: "Despensa", codigo: "7702001110111" },
  { nombre: "Jabón Rey barra", precio: 3400, existencias: 26, categoria: "Aseo", codigo: "7702001120122" },
  { nombre: "Papel higiénico x4", precio: 8900, existencias: 14, categoria: "Aseo", codigo: "7702001130133" },
  { nombre: "Bolsa de leche en polvo", precio: 15900, existencias: 8, categoria: "Lácteos", codigo: null },
];

/** Ventas de ejemplo, para que la cuadrícula tenga por qué ordenarse. */
const VENTAS_DE_EJEMPLO = [
  ["Pan tajado grande", "Leche Colanta 1 L", "Huevos AA (unidad)"],
  ["Gaseosa 400 ml", "Papas Margarita 25 g"],
  ["Pan tajado grande", "Café Sello Rojo 250 g"],
  ["Huevos AA (unidad)", "Arroz Diana 500 g"],
  ["Gaseosa 400 ml", "Galletas Festival"],
  ["Pan tajado grande", "Huevos AA (unidad)"],
];

async function principal() {
  const forzar = process.argv.includes("--forzar");

  const [dueno] = await db.select().from(schema.user).limit(1);
  if (!dueno) {
    throw new Error("No hay ningún dueño. Créalo primero con: npm run alta-dueno -- --correo=...");
  }

  const [conteo] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.product);
  const yaHay = conteo?.n ?? 0;
  if (yaHay > 0 && !forzar) {
    console.log(`Ya hay ${yaHay} productos. Usa --forzar si igual quieres sembrar encima.`);
    return;
  }

  const porNombre = new Map<string, string>();
  for (const item of CATALOGO) {
    let categoriaId: string | null = null;
    const [existente] = await db
      .select({ id: schema.category.id })
      .from(schema.category)
      .where(eq(schema.category.name, item.categoria));
    categoriaId =
      existente?.id ??
      (
        await db
          .insert(schema.category)
          .values({ name: item.categoria })
          .returning({ id: schema.category.id })
      )[0]!.id;

    const [producto] = await db
      .insert(schema.product)
      .values({
        name: item.nombre,
        price: item.precio,
        categoryId: categoriaId,
        barcode: item.codigo,
        stock: 0,
      })
      .returning({ id: schema.product.id });

    // Las existencias entran por el libro, igual que en el alta real (`D-002`).
    await db.insert(schema.stockMovement).values({
      productId: producto!.id,
      quantity: item.existencias,
      type: "initial",
      userId: dueno.id,
    });
    await db
      .update(schema.product)
      .set({ stock: item.existencias })
      .where(eq(schema.product.id, producto!.id));

    porNombre.set(item.nombre, producto!.id);
  }

  for (const venta of VENTAS_DE_EJEMPLO) {
    await registrarVenta(
      nuevoId(),
      venta.map((nombre) => ({ productoId: porNombre.get(nombre)!, cantidad: 1 })),
      dueno.id,
    );
  }

  console.log(
    `Sembrado: ${CATALOGO.length} productos y ${VENTAS_DE_EJEMPLO.length} ventas de ejemplo.`,
  );
  console.log("La cuadrícula arranca con el pan, los huevos y la gaseosa arriba.");
}

try {
  await principal();
} finally {
  await pool.end();
}
