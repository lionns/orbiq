import "dotenv/config";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { eq, inArray, type SQL } from "drizzle-orm";
import { db, schema } from "../src/db";
import { auth } from "../src/lib/auth";

/**
 * El alta de un dueño la hace el estudio, no un registro público (`D-008`), así que las pruebas
 * tampoco pueden registrarse: crean la fila por el mismo camino que `scripts/alta-dueno.mts`.
 * Tercer sitio que lo necesita, así que ahora sí es una función compartida (`D-003`).
 */
export type DuenoDePrueba = { id: string; correo: string; nombre: string; clave: string };

export async function crearDueno(etiqueta: string): Promise<DuenoDePrueba> {
  // La hora sola no basta: con la suite en paralelo dos trabajadores caían en el mismo milisegundo
  // y chocaban contra el correo único (`andamiaje`, `navegacion` repetidas).
  const correo = `prueba-${etiqueta}-${Date.now()}-${Math.floor(Math.random() * 1e9)}@orbiq.test`;
  const nombre = "Dueña de prueba";
  const clave = "clave-de-prueba-2026";

  const ctx = await auth.$context;
  const usuario = await ctx.internalAdapter.createUser(
    { email: correo, name: nombre, emailVerified: true },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: await ctx.password.hash(clave),
  });

  return { id: usuario.id, correo, nombre, clave };
}

/** Una IP de la red de documentación (RFC 5737). Cuatro entradas en la misma, en diez segundos, es
 * lo que haría falta para que dos pruebas se estorben: no pasa. */
function ipDePrueba(): string {
  return `203.0.113.${1 + Math.floor(Math.random() * 254)}`;
}

export async function borrarDueno(dueno: DuenoDePrueba | undefined): Promise<void> {
  if (!dueno) return;
  await db.delete(schema.session).where(eq(schema.session.userId, dueno.id));
  await db.delete(schema.account).where(eq(schema.account.userId, dueno.id));
  await db.delete(schema.user).where(eq(schema.user.id, dueno.id));
}

export async function entrar(page: Page, correo: string, clave: string): Promise<void> {
  // Cada inicio de sesión por pantalla llega desde su propia IP, como cada dueño real: el límite de
  // intentos es por IP (`T-038`), y la suite en paralelo saldría toda de 127.0.0.1 y se gastaría el
  // cupo entre sus propias pruebas.
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ipDePrueba() });
  await page.goto("/acceso");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/**
 * Inicia sesión una sola vez por trabajador y reparte la cookie a las demás pruebas.
 *
 * Hacerlo por la pantalla en cada prueba corría scrypt otra vez, y scrypt es caro **a propósito**:
 * cuatro trabajadores en paralelo contra un solo servidor Node lo convertían en una suite que
 * fallaba a veces. Un dueño real inicia sesión una vez al mes, no una vez por acción — así que
 * esto además se parece más a la verdad. El recorrido completo del formulario lo prueba
 * `sesion.spec.ts`, que es de quien es esa responsabilidad.
 */
const cookiesPorDueno = new Map<string, string>();

async function cookieDeSesion(dueno: DuenoDePrueba): Promise<string> {
  const guardada = cookiesPorDueno.get(dueno.id);
  if (guardada) return guardada;

  const respuesta = await auth.api.signInEmail({
    body: { email: dueno.correo, password: dueno.clave },
    asResponse: true,
  });
  const cabecera = respuesta.headers.get("set-cookie");
  if (!cabecera) throw new Error("Better Auth no devolvió cookie de sesión.");
  cookiesPorDueno.set(dueno.id, cabecera);
  return cabecera;
}

/**
 * Inicio de sesión por la pantalla, con su propia sesión. Lo usan las pruebas del ciclo de vida de
 * la sesión: comparten dueño, y una que cierra sesión o la vence dejaría la cookie compartida
 * inservible para las demás.
 */
export async function entrarPorPantalla(page: Page, dueno: DuenoDePrueba): Promise<void> {
  await entrar(page, dueno.correo, dueno.clave);
  // Dentro: la navegación de las secciones aparece. «Salir» ya no vive en la cabecera, sino en
  // Ajustes (`T-029`, punto 7).
  await expect(page.getByRole("navigation", { name: "Secciones" }).first()).toBeVisible();
}

export async function entrarComo(page: Page, dueno: DuenoDePrueba): Promise<void> {
  const cabecera = await cookieDeSesion(dueno);
  const [par] = cabecera.split(";");
  const [nombre, valor] = par!.split("=");
  await (page.context() as BrowserContext).addCookies([
    { name: nombre!, value: valor!, domain: "localhost", path: "/" },
  ]);
  // Aterriza en la venta, que es lo que casi todas las pruebas vienen a recorrer. Inicio (`/`) lo
  // visita quien lo prueba.
  await page.goto("/vender");
  await expect(page.getByTestId("sesion-nombre")).toBeAttached();
}

/**
 * Borra productos de prueba con sus códigos. Desde `D-010` los códigos viven en su tabla y cuelgan
 * del producto, así que la base no deja borrar uno sin los otros. Los movimientos van antes: cada
 * prueba los borra primero, porque nombran a los dos.
 */
export async function borrarProductos(donde: SQL | undefined): Promise<void> {
  const ids = db.select({ id: schema.product.id }).from(schema.product).where(donde);
  await db.delete(schema.productBarcode).where(inArray(schema.productBarcode.productId, ids));
  await db.delete(schema.product).where(donde);
}

/** Le da un código a un producto sembrado, como lo haría el alta. Devuelve el id del código. */
export async function sembrarCodigo(productoId: string, codigo: string): Promise<string> {
  const [c] = await db
    .insert(schema.productBarcode)
    .values({ productId: productoId, code: codigo })
    .returning({ id: schema.productBarcode.id });
  return c!.id;
}
