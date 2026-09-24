// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { borrarDueno, crearDueno, entrarComo, type DuenoDePrueba } from "./apoyo";

/**
 * T-003 · US-002. El catálogo recorrido entero contra la base real (`D-006`).
 *
 * La base es una sola y las pruebas corren en paralelo, así que cada una marca lo que crea y el
 * listado se consulta filtrado. Una prueba que mira «todo el catálogo» ve además lo de las otras.
 */
let dueno: DuenoDePrueba;
const MARCA = `t3-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const unico = (base: string) => `${base} ${MARCA}-${Math.floor(Math.random() * 1e4)}`;
// La categoría también se marca: se crea con el producto y nadie más la borraría.
const CATEGORIA = `Granos ${MARCA}`;

test.beforeAll(async () => {
  dueno = await crearDueno("catalogo");
});

test.afterAll(async () => {
  // Por marca, no por lo que cada prueba alcanzó a apuntar: si una falla a mitad, su producto
  // también se borra y el siguiente arranque no arrastra basura.
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.product).where(like(schema.product.name, `%${MARCA}%`));
  await db.delete(schema.category).where(like(schema.category.name, `%${MARCA}%`));
  await borrarDueno(dueno);
});

async function darDeAlta(
  page: Page,
  campos: {
    nombre: string;
    precio: string;
    existencias?: string;
    codigo?: string;
    categoria?: string;
  },
) {
  await page.goto("/catalogo/nuevo");
  await page.getByLabel("Nombre").fill(campos.nombre);
  await page.getByLabel("Precio").fill(campos.precio);
  if (campos.existencias) await page.getByLabel("Existencias").fill(campos.existencias);
  if (campos.categoria) await page.getByLabel("Categoría").fill(campos.categoria);
  if (campos.codigo) await page.getByLabel("Código de barras").fill(campos.codigo);
  await page.getByRole("button", { name: /Guardar producto|Guardando/ }).click();
}

/** El listado filtrado por un solo producto: lo que se afirma no depende de las otras pruebas. */
async function verSolo(page: Page, nombre: string) {
  await page.goto(`/catalogo?q=${encodeURIComponent(nombre)}`);
  return page.getByTestId("lista-catalogo");
}

const idDe = async (nombre: string) => {
  const [fila] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(eq(schema.product.name, nombre));
  return fila?.id;
};

test("el catálogo vacío ofrece dar de alta el primero, no una ilustración", async ({ page }) => {
  await entrarComo(page, dueno);
  await page.goto("/catalogo?q=zzz-no-existe-nada-asi");
  await expect(page.getByTestId("catalogo-vacio")).toBeVisible();
});

test("dar de alta con existencias escribe el libro y el saldo sale de ahí", async ({ page }) => {
  const nombre = unico("Arroz");
  await entrarComo(page, dueno);
  await darDeAlta(page, { nombre, precio: "3.500", existencias: "12", categoria: CATEGORIA });
  await expect(page).toHaveURL(/\/catalogo$/);

  const lista = await verSolo(page, nombre);
  await expect(lista).toContainText(nombre);
  await expect(lista).toContainText("3.500");
  await expect(lista).toContainText("Hay 12");
  await expect(lista).toContainText(CATEGORIA);

  const id = await idDe(nombre);
  expect(id).toBeDefined();

  // AC-003: hay un movimiento `initial` y `product.stock` es la suma del libro, no lo tecleado.
  const movimientos = await db
    .select()
    .from(schema.stockMovement)
    .where(eq(schema.stockMovement.productId, id!));
  expect(movimientos).toHaveLength(1);
  expect(movimientos[0]!.type).toBe("initial");
  expect(movimientos[0]!.quantity).toBe(12);

  const [producto] = await db.select().from(schema.product).where(eq(schema.product.id, id!));
  expect(producto!.stock).toBe(12);
  // El precio se guarda como entero en la unidad mínima, aunque se teclee con separador.
  expect(producto!.price).toBe(3500);
});

test("sin existencias iniciales no se escribe ningún movimiento", async ({ page }) => {
  const nombre = unico("Pan");
  await entrarComo(page, dueno);
  await darDeAlta(page, { nombre, precio: "500" });
  await expect(page).toHaveURL(/\/catalogo$/);

  const movimientos = await db
    .select()
    .from(schema.stockMovement)
    .where(eq(schema.stockMovement.productId, (await idDe(nombre))!));
  // El libro solo registra lo que pasó. «Tengo cero» no es un movimiento.
  expect(movimientos).toHaveLength(0);
});

test("dos productos sin código de barras entran los dos", async ({ page }) => {
  const uno = unico("Granel A");
  const dos = unico("Granel B");
  await entrarComo(page, dueno);
  await darDeAlta(page, { nombre: uno, precio: "100" });
  await expect(page).toHaveURL(/\/catalogo$/);
  await darDeAlta(page, { nombre: dos, precio: "200" });
  await expect(page).toHaveURL(/\/catalogo$/);

  // AC-005: varios sin código conviven — granel, pan, huevos.
  await expect(await verSolo(page, uno)).toContainText(uno);
  await expect(await verSolo(page, dos)).toContainText(dos);
});

test("un código de barras repetido se rechaza nombrando al producto que ya lo tiene", async ({
  page,
}) => {
  const codigo = `77${Date.now()}${Math.floor(Math.random() * 100)}`.slice(0, 13);
  const primero = unico("Leche");
  const segundo = unico("Leche impostora");

  await entrarComo(page, dueno);
  await darDeAlta(page, { nombre: primero, precio: "4000", codigo });
  await expect(page).toHaveURL(/\/catalogo$/);

  await darDeAlta(page, { nombre: segundo, precio: "4000", codigo });
  // AC-004: no basta con «código repetido»; hay que decir de quién es.
  await expect(page.getByText(`Ese código ya es de «${primero}».`)).toBeVisible();
  await expect(page).toHaveURL(/\/catalogo\/nuevo$/);

  // Y el segundo no quedó en la base: el choque se detecta antes de escribir nada.
  expect(await idDe(segundo)).toBeUndefined();
});

test("el precio negativo se rechaza en el campo donde se escribió", async ({ page }) => {
  await entrarComo(page, dueno);
  await darDeAlta(page, { nombre: unico("Imposible"), precio: "-1" });
  await expect(page.getByText("El precio no puede ser negativo.")).toBeVisible();
});

test("la búsqueda encuentra por código de barras, no solo por nombre", async ({ page }) => {
  const nombre = unico("Atún");
  const codigo = `78${Date.now()}${Math.floor(Math.random() * 100)}`.slice(0, 13);
  await entrarComo(page, dueno);
  await darDeAlta(page, { nombre, precio: "6000", codigo });
  await expect(page).toHaveURL(/\/catalogo$/);

  await page.goto("/catalogo");
  await page.getByLabel("Buscar en el catálogo").fill(codigo);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByTestId("lista-catalogo")).toContainText(nombre);
});

test("la pantalla del catálogo se opera a 360 px sin desbordarse", async ({ page }) => {
  const nombre = unico("Producto de nombre bastante largo para probar el desbordamiento");
  await entrarComo(page, dueno);
  await darDeAlta(page, { nombre, precio: "12500", existencias: "3" });
  await expect(page).toHaveURL(/\/catalogo$/);

  await page.setViewportSize({ width: 360, height: 740 });
  await verSolo(page, nombre);

  // AC-X01: a 360 px nada empuja la página de lado.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

  // «Nuevo» vive arriba, junto al título (`.diseno/cobalto/U-M-Productos`, validado en `T-029`):
  // abajo está la barra de secciones, y dar de alta no es parte del flujo de venta, que es lo que la
  // regla del pulgar protege. Sigue siendo un blanco que se acierta.
  const caja = await page.getByRole("link", { name: "Nuevo", exact: true }).boundingBox();
  expect(caja!.height).toBeGreaterThanOrEqual(48);
});

/**
 * T-005 · US-012. Acotar y recorrer. Los productos los siembra la base: la pantalla de alta ya
 * tiene sus propias pruebas y pasar por ella treinta veces solo haría la suite más lenta.
 */
test.describe("acotar y recorrer el catálogo", () => {
  const CAT_A = `Bebidas ${MARCA}`;
  const CAT_B = `Aseo ${MARCA}`;
  let sembrados = false;

  async function sembrar() {
    if (sembrados) return;
    sembrados = true;
    const categorias = new Map<string, string>();
    for (const nombre of [CAT_A, CAT_B]) {
      const [c] = await db
        .insert(schema.category)
        .values({ name: nombre })
        .returning({ id: schema.category.id });
      categorias.set(nombre, c!.id);
    }
    // Treinta, para que la primera tanda de 24 no alcance.
    const filas = Array.from({ length: 30 }, (_, i) => ({
      name: `Recorrer ${MARCA} ${String(i).padStart(2, "0")}`,
      price: (i + 1) * 1000,
      categoryId: categorias.get(i % 2 === 0 ? CAT_A : CAT_B)!,
      stock: i === 0 ? 0 : i === 1 ? -3 : i,
    }));
    await db.insert(schema.product).values(filas);
  }

  test.beforeEach(async () => {
    await sembrar();
  });

  const soloMios = `/catalogo?q=${encodeURIComponent(`Recorrer ${MARCA}`)}`;

  test("dice cuántos quedaron y muestra la primera tanda", async ({ page }) => {
    await entrarComo(page, dueno);
    await page.goto(soloMios);
    // AC-016: el conteo es de todos los que cumplen, no de los que se ven.
    await expect(page.getByTestId("conteo")).toContainText("30 productos");
    await expect(page.getByTestId("conteo")).toContainText("se ven 24");
    await expect(page.getByTestId("lista-catalogo").locator("li")).toHaveCount(24);
  });

  test("ver más suma a lo ya visto y deja de ofrecerse al final", async ({ page }) => {
    await entrarComo(page, dueno);
    await page.goto(soloMios);
    const primero = await page.getByTestId("lista-catalogo").locator("li").first().innerText();

    await page.getByTestId("ver-mas").click();
    await expect(page).toHaveURL(/ver=48/);

    // AC-017: suma, no reemplaza — lo primero que se vio sigue arriba.
    await expect(page.getByTestId("lista-catalogo").locator("li")).toHaveCount(30);
    expect(await page.getByTestId("lista-catalogo").locator("li").first().innerText()).toBe(primero);
    // Y ya no queda nada por mostrar.
    await expect(page.getByTestId("ver-mas")).toHaveCount(0);
    await expect(page.getByTestId("conteo")).not.toContainText("se ven");
  });

  test("los tres filtros se combinan y se cumplen a la vez", async ({ page }) => {
    await entrarComo(page, dueno);
    // Categoría A son los pares: precios 1000, 3000, 5000… Entre 5000 y 15000 caben 5000, 7000,
    // 9000, 11000, 13000 y 15000 — seis.
    await page.goto(
      `${soloMios}&categoria=${encodeURIComponent(CAT_A)}&desde=5000&hasta=15000`,
    );
    await expect(page.getByTestId("conteo")).toContainText("6 productos");
    const textos = await page.getByTestId("lista-catalogo").locator("li").allInnerTexts();
    expect(textos).toHaveLength(6);
    expect(textos.every((t) => t.includes(CAT_A))).toBe(true);
  });

  test("el filtro de existencias encuentra lo agotado y lo que quedó en negativo", async ({
    page,
  }) => {
    await entrarComo(page, dueno);
    await page.goto(`${soloMios}&existencias=agotados`);
    await expect(page.getByTestId("conteo")).toContainText("1 producto");
    // Desde Cobalto (`T-029`) el cero también alerta en el catálogo: «Agotado», en rojo, como en
    // la venta y en Inicio. Antes cada pantalla lo decidía distinto (`src/ui/cifras.tsx`). Cada
    // fila lleva dos enlaces —celular y computador— y solo uno se ve: se cuentan los visibles.
    await expect(page.getByTestId("lista-catalogo")).toContainText("Agotado");
    await expect(page.getByTestId("lista-catalogo").locator("[data-alerta]:visible")).toHaveCount(1);

    await page.goto(`${soloMios}&existencias=negativos`);
    await expect(page.getByTestId("conteo")).toContainText("1 producto");
    await expect(page.getByTestId("lista-catalogo")).toContainText("Conteo en -3");
    await expect(page.getByTestId("lista-catalogo").locator("[data-alerta]:visible")).toHaveCount(1);
  });

  test("recargar la dirección acotada muestra exactamente lo mismo", async ({ page }) => {
    // AC-018: el estado vive en la dirección, así que el enlace se puede compartir.
    await entrarComo(page, dueno);
    const url = `${soloMios}&existencias=disponibles&desde=20000&ver=48`;
    await page.goto(url);
    const antes = await page.getByTestId("lista-catalogo").allInnerTexts();
    await page.reload();
    expect(await page.getByTestId("lista-catalogo").allInnerTexts()).toEqual(antes);
  });

  test("una dirección escrita a mano con valores imposibles no tumba la pantalla", async ({
    page,
  }) => {
    await entrarComo(page, dueno);
    await page.goto(`${soloMios}&existencias=carísimos&desde=hola&hasta=&ver=999999999`);
    // Los parámetros imposibles se ignoran; el resto sigue valiendo.
    await expect(page.getByTestId("conteo")).toContainText("30 productos");
  });

  test("limpiar quita los filtros y vuelve al catálogo entero", async ({ page }) => {
    await entrarComo(page, dueno);
    await page.goto(`${soloMios}&existencias=agotados`);
    // Los filtros activos se cuentan en su botón; «Limpiar» vive dentro, con ellos.
    await expect(page.getByTestId("abrir-filtros")).toContainText("1");
    await page.getByTestId("abrir-filtros").click();
    await page.getByTestId("limpiar-filtros").click();
    await expect(page).toHaveURL(/\/catalogo$/);
  });

  test("acotar por la pantalla deja el resultado en la dirección", async ({ page }) => {
    await entrarComo(page, dueno);
    await page.goto("/catalogo");
    await page.getByLabel("Buscar en el catálogo").fill(`Recorrer ${MARCA}`);
    // Los filtros arrancan plegados. Sin listas desplegables: las opciones están a la vista
    // (`.diseno/cobalto/F-M-Filtros`), y cada una es un radio de verdad dentro del formulario.
    await page.getByTestId("abrir-filtros").click();
    await page.getByRole("radio", { name: "En negativo" }).check({ force: true });
    await page.getByRole("button", { name: "Ver productos" }).click();

    await expect(page).toHaveURL(/existencias=negativos/);
    await expect(page.getByTestId("conteo")).toContainText("1 producto");
  });

  test("los filtros a 360 px no empujan la lista fuera de la pantalla", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await entrarComo(page, dueno);
    await page.goto(soloMios);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
    // Cerrados por defecto: cinco campos abiertos siempre dejarían la lista abajo del pliegue.
    const primero = await page.getByTestId("lista-catalogo").locator("li").first().boundingBox();
    expect(primero!.y).toBeLessThan(740);
  });
});
