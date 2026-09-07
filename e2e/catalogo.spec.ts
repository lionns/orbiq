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
  if (campos.existencias) await page.getByLabel("Existencias iniciales").fill(campos.existencias);
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
  await expect(lista).toContainText("12 en existencia");
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

  // La acción vive abajo, al alcance del pulgar (design-handoff.md § Responsive Behavior).
  const caja = await page.getByRole("link", { name: "Nuevo producto" }).boundingBox();
  expect(caja!.y).toBeGreaterThan(740 / 3);
  expect(caja!.height).toBeGreaterThanOrEqual(48);
});
