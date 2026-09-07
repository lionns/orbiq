import "dotenv/config";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { auth } from "../src/lib/auth";

/**
 * El alta de un dueño la hace el estudio, no un registro público (`D-008`), así que las pruebas
 * tampoco pueden registrarse: crean la fila por el mismo camino que `scripts/alta-dueno.mts`.
 * Tercer sitio que lo necesita, así que ahora sí es una función compartida (`D-003`).
 */
export type DuenoDePrueba = { id: string; correo: string; nombre: string; clave: string };

export async function crearDueno(etiqueta: string): Promise<DuenoDePrueba> {
  const correo = `prueba-${etiqueta}-${Date.now()}@orbiq.test`;
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

export async function borrarDueno(dueno: DuenoDePrueba | undefined): Promise<void> {
  if (!dueno) return;
  await db.delete(schema.session).where(eq(schema.session.userId, dueno.id));
  await db.delete(schema.account).where(eq(schema.account.userId, dueno.id));
  await db.delete(schema.user).where(eq(schema.user.id, dueno.id));
}

export async function entrar(page: Page, correo: string, clave: string): Promise<void> {
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
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
}

export async function entrarComo(page: Page, dueno: DuenoDePrueba): Promise<void> {
  const cabecera = await cookieDeSesion(dueno);
  const [par] = cabecera.split(";");
  const [nombre, valor] = par!.split("=");
  await (page.context() as BrowserContext).addCookies([
    { name: nombre!, value: valor!, domain: "localhost", path: "/" },
  ]);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
}
