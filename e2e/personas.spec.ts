// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { eq, like, sql } from "drizzle-orm";
import { db, schema } from "../src/db";
import { nuevoId } from "../src/domain/ids";
import { darDeBaja } from "../src/domain/personas";
import { registrarVenta } from "../src/domain/venta";
import {
  borrarDueno,
  borrarProductos,
  crearDueno,
  entrar,
  entrarComo,
  entrarPorPantalla,
  type DuenoDePrueba,
} from "./apoyo";

/**
 * T-039 · `D-013`. El dueño da de alta a quien atiende por él; el empleado vende pero no anula, no
 * edita ni corrige el conteo —ni por la pantalla ni llamando a la acción directo—, y una baja lo
 * saca en el momento. Contra la base real (`D-006`).
 */
let dueno: DuenoDePrueba;
let empleado: DuenoDePrueba;
const MARCA = `t39-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let productoId: string;
let ventaId: string;
const creados: string[] = [];

test.beforeAll(async () => {
  dueno = await crearDueno("personas");
  empleado = await crearDueno("personas-empleado", "staff");
  const [p] = await db
    .insert(schema.product)
    .values({ name: `Yuca ${MARCA}`, price: 2000, stock: 50 })
    .returning({ id: schema.product.id });
  productoId = p!.id;
  await db
    .insert(schema.stockMovement)
    .values({ productId: productoId, quantity: 50, type: "initial", userId: dueno.id });
  // La cobró el empleado: su nombre tiene que seguir en ella después de la baja.
  ventaId = nuevoId();
  await registrarVenta(ventaId, [{ productoId, cantidad: 1 }], empleado.id);
});

test.afterAll(async () => {
  const mios = sql`select id from ${schema.product} where ${schema.product.name} like ${`%${MARCA}%`}`;
  const ventas = sql`select id from ${schema.sale} where ${schema.sale.userId} in (${dueno.id}, ${empleado.id})`;
  await db.delete(schema.stockMovement).where(sql`${schema.stockMovement.productId} in (${mios})`);
  await db.delete(schema.saleLine).where(sql`${schema.saleLine.saleId} in (${ventas})`);
  await db.delete(schema.sale).where(sql`${schema.sale.userId} in (${dueno.id}, ${empleado.id})`);
  await borrarProductos(like(schema.product.name, `%${MARCA}%`));
  for (const id of creados) {
    await db.delete(schema.session).where(eq(schema.session.userId, id));
    await db.delete(schema.account).where(eq(schema.account.userId, id));
    await db.delete(schema.user).where(eq(schema.user.id, id));
  }
  await borrarDueno(empleado);
  await borrarDueno(dueno);
});

/** Otra ventana, con su propia sesión: la del empleado mientras el dueño usa la suya. */
async function otraVentana(browser: Browser): Promise<Page> {
  const contexto = await browser.newContext({ baseURL: "http://localhost:3000" });
  return contexto.newPage();
}

test("AC-032 · el dueño da de alta a un empleado desde Personas, y el empleado entra", async ({
  page,
  browser,
}) => {
  const correo = `maria-${MARCA}@orbiq.test`;
  await entrarComo(page, dueno);
  await page.goto("/ajustes");
  await page.getByTestId("ir-a-personas").click();
  await page.getByTestId("anadir-persona").click();
  await page.getByLabel("Nombre").fill("María");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("maria-clave-2026");
  await expect(page.getByTestId("dar-de-alta-persona")).toHaveText(/Dar de alta a María/);
  await page.getByTestId("dar-de-alta-persona").click();

  await expect(page.getByTestId("alta-lista")).toContainText("María ya puede entrar");
  await expect(page.getByTestId("estado-persona")).toHaveText("Empleado");
  const [fila] = await db.select().from(schema.user).where(eq(schema.user.email, correo));
  creados.push(fila!.id);
  expect(fila!.role).toBe("staff");

  // El mismo correo otra vez se rechaza en su campo, sin perder lo escrito.
  await page.goto("/ajustes/personas/nueva");
  await page.getByLabel("Nombre").fill("María otra");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("maria-clave-2026");
  await page.getByTestId("dar-de-alta-persona").click();
  await expect(page.getByText("Ese correo ya entra a la tienda.")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("María otra");

  // Ella entra con lo que le dio el dueño, y en Ajustes no ve Personas.
  const suya = await otraVentana(browser);
  await entrar(suya, correo, "maria-clave-2026");
  await expect(suya.getByRole("navigation", { name: "Secciones" }).first()).toBeVisible();
  await suya.goto("/ajustes");
  await expect(suya.getByText("Empleado ·")).toBeVisible();
  await expect(suya.getByTestId("ir-a-personas")).toHaveCount(0);
  await suya.goto("/ajustes/personas");
  await expect(suya).toHaveURL(/\/ajustes$/);
  await suya.context().close();
});

test("AC-033 · el empleado no ve lo que no le toca: ficha, Productos, alta, venta y código desconocido", async ({
  page,
}) => {
  await entrarComo(page, empleado);

  await page.goto(`/catalogo/${productoId}`);
  await expect(page.getByTestId("pedir-al-dueno")).toContainText(/avísale (a .+|al dueño)/);
  for (const id of ["abrir-ajuste", "abrir-edicion", "abrir-estado", "abrir-codigo", "generar-codigo"]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }

  await page.goto("/catalogo");
  await expect(page.getByRole("link", { name: /^Nuevo/ })).toHaveCount(0);
  await page.goto("/catalogo/nuevo");
  await expect(page).toHaveURL(/\/catalogo$/);

  await page.goto(`/ventas/${ventaId}`);
  await expect(page.getByTestId("abrir-anular")).toHaveCount(0);
  await expect(page.getByTestId("anular-lo-hace-el-dueno")).toContainText(/avísale (a .+|al dueño)/);

  // Vender: cobra, pero sin «Deshacer»; un código que no está le dice a quién avisar.
  await page.goto("/vender");
  await page.getByTestId("codigo-tecleado").fill(`Yuca ${MARCA}`);
  await page.getByTestId("codigo-tecleado").press("Enter");
  await page.getByRole("button", { name: new RegExp(`Yuca ${MARCA}`) }).click();
  await expect(page.getByTestId(`cantidad-${productoId}`)).toHaveText("1");
  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("venta-anterior")).toBeVisible();
  await expect(page.getByTestId("deshacer")).toHaveCount(0);

  await page.getByTestId("codigo-tecleado").fill("7707211908815");
  await page.getByTestId("codigo-tecleado").press("Enter");
  await expect(page.getByTestId("codigo-desconocido")).toContainText("no está en la tienda");
  await expect(page.getByTestId("avisar-al-dueno")).toContainText(/avísale (a .+|al dueño)/);
  await expect(page.getByTestId("camino-nuevo")).toHaveCount(0);
});

test("AC-033 · llamar a anular directo, como empleado, no anula; la misma llamada del dueño sí", async ({
  page,
  browser,
}) => {
  const venta = nuevoId();
  await registrarVenta(venta, [{ productoId, cantidad: 1 }], dueno.id);

  // El dueño toca «Anular», y la petición se captura y se corta antes de llegar al servidor.
  await entrarComo(page, dueno);
  await page.goto(`/ventas/${venta}`);
  let capturada: { url: string; headers: Record<string, string>; cuerpo: Buffer } | null = null;
  await page.route(`**/ventas/${venta}*`, async (ruta) => {
    const r = ruta.request();
    if (r.method() !== "POST") return ruta.continue();
    const { cookie: _, ...headers } = await r.allHeaders();
    capturada = { url: r.url(), headers, cuerpo: r.postDataBuffer()! };
    await ruta.abort();
  });
  await page.getByTestId("abrir-anular").click();
  await page.getByTestId("anular").click();
  await expect.poll(() => capturada).not.toBeNull();
  const peticion = capturada!;

  // La misma petición, con la sesión del empleado: se rechaza y la venta sigue viva.
  const suya = await otraVentana(browser);
  await entrarComo(suya, empleado);
  await suya.request.post(peticion.url, { headers: peticion.headers, data: peticion.cuerpo });
  const [tras] = await db.select().from(schema.sale).where(eq(schema.sale.id, venta));
  expect(tras!.voidedAt).toBeNull();
  await suya.context().close();

  // Control: la misma petición con la sesión del dueño sí anula. Si no, la prueba de arriba no
  // estaría probando nada.
  await page.unroute(`**/ventas/${venta}*`);
  await page.request.post(peticion.url, { headers: peticion.headers, data: peticion.cuerpo });
  const [anulada] = await db.select().from(schema.sale).where(eq(schema.sale.id, venta));
  expect(anulada!.voidedAt).not.toBeNull();
});

test("AC-034 · AC-035 · la baja saca al empleado en el momento, no vuelve a entrar y sus ventas siguen con su nombre", async ({
  page,
  browser,
}) => {
  const juana = await crearDueno("personas-baja", "staff");
  creados.push(juana.id);
  const venta = nuevoId();
  await registrarVenta(venta, [{ productoId, cantidad: 1 }], juana.id);

  // Ella con su sesión abierta en su celular.
  const suya = await otraVentana(browser);
  await entrarPorPantalla(suya, juana);

  // El dueño la da de baja.
  await entrarComo(page, dueno);
  await page.goto("/ajustes/personas");
  await page.getByTestId(`persona-${juana.id}`).click();
  await page.getByTestId("abrir-baja").click();
  await page.getByTestId("confirmar-baja").click();
  await expect(page.getByTestId("estado-persona")).toHaveText("De baja");
  await expect(page.getByTestId("reactivar")).toBeVisible();

  // Lo siguiente que toca en su celular la saca, y no puede volver a entrar.
  await suya.goto("/vender");
  await expect(suya).toHaveURL(/\/acceso/);
  await entrar(suya, juana.correo, juana.clave);
  await expect(suya.getByTestId("acceso-error")).toContainText("Ya no tienes acceso a esta tienda");
  await suya.context().close();

  // Su venta sigue diciendo quién la cobró.
  await page.goto(`/ventas/${venta}`);
  await expect(page.getByText(`Registrada por ${juana.nombre}`)).toBeVisible();

  // Y aparece abajo, con los dados de baja.
  await page.goto("/ajustes/personas");
  await expect(page.getByTestId("personas-de-baja")).toContainText(juana.nombre);

  await db.delete(schema.saleLine).where(eq(schema.saleLine.saleId, venta));
  await db.delete(schema.stockMovement).where(eq(schema.stockMovement.saleId, venta));
  await db.delete(schema.sale).where(eq(schema.sale.id, venta));
});

test("el dueño no puede darse de baja a sí mismo, ni a otro dueño", async () => {
  expect(await darDeBaja(dueno.id, dueno.id)).toEqual({
    ok: false,
    mensaje: "No puedes darte de baja a ti mismo.",
  });
  const otro = await crearDueno("personas-otro-dueno");
  creados.push(otro.id);
  expect((await darDeBaja(otro.id, dueno.id)).ok).toBe(false);
  const [sigue] = await db.select().from(schema.user).where(eq(schema.user.id, otro.id));
  expect(sigue!.disabledAt).toBeNull();
});
