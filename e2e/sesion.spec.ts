// Primero que nada: los módulos se evalúan en el orden en que se importan, y `../src/db` exige
// DATABASE_URL al cargarse.
import "dotenv/config";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { auth } from "../src/lib/auth";
import { borrarDueno, crearDueno, entrar, entrarPorPantalla, type DuenoDePrueba } from "./apoyo";

/**
 * T-002 · US-001. La rebanada de la sesión, recorrida entera contra la base real (`D-006`).
 */
let dueno: DuenoDePrueba;

const sesionesDe = (id: string) =>
  db.select().from(schema.session).where(eq(schema.session.userId, id));

test.beforeAll(async () => {
  dueno = await crearDueno("sesion");
});

test.afterAll(async () => {
  await borrarDueno(dueno);
});

test("sin sesión, la pantalla del negocio no se abre ni se asoma", async ({ page }) => {
  const respuesta = await page.goto("/");
  await expect(page).toHaveURL(/\/acceso$/);
  // AC-001: no basta con redirigir; el cuerpo servido no puede traer datos del negocio.
  expect(await respuesta!.text()).not.toContain(dueno.nombre);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("la contraseña incorrecta se rechaza sin decir si el correo existe", async ({ page }) => {
  await entrar(page, dueno.correo, "esta-no-es");
  await expect(page.getByTestId("acceso-error")).toHaveText("Correo o contraseña incorrectos.");
  await expect(page).toHaveURL(/\/acceso$/);

  // Y no queda rastro: un rechazo no crea sesión.
  expect(await sesionesDe(dueno.id)).toHaveLength(0);
});

test("un correo que no existe da exactamente el mismo mensaje", async ({ page }) => {
  await entrar(page, "nadie@orbiq.test", dueno.clave);
  await expect(page.getByTestId("acceso-error")).toHaveText("Correo o contraseña incorrectos.");
});

test("entra, la cookie es opaca, y al recargar sigue dentro", async ({ page, context }) => {
  await entrarPorPantalla(page, dueno);
  await expect(page).toHaveURL(/\/$/);
  // Quién entró: el nombre viaja en la página, aunque solo lo lea un lector de pantalla.
  await expect(page.getByTestId("sesion-nombre")).toHaveText(dueno.nombre);

  // AC-002: la sesión vive en el servidor.
  const sesiones = await sesionesDe(dueno.id);
  expect(sesiones).toHaveLength(1);

  const galleta = (await context.cookies()).find((c) => c.name.includes("session_token"));
  expect(galleta, "debe existir la cookie de sesión").toBeDefined();
  expect(galleta!.httpOnly, "httpOnly evita que un script la lea").toBe(true);
  expect(galleta!.sameSite).toBe("Lax");
  // Su valor no dice nada del usuario: es un identificador, no una credencial con datos dentro.
  expect(galleta!.value).not.toContain(dueno.correo);
  expect(galleta!.value).not.toContain(dueno.id);
  expect(galleta!.value).not.toContain(dueno.nombre);
  expect(decodeURIComponent(galleta!.value).startsWith(sesiones[0]!.token)).toBe(true);

  // D-006: recargar no debe pedir la clave otra vez.
  await page.reload();
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
});

test("una sesión vencida se trata como ausente, no como inválida", async ({ page }) => {
  await entrarPorPantalla(page, dueno);

  // Envejecer la fila es la única forma honesta de probarlo: la cookie sigue siendo la misma y el
  // navegador la sigue mandando. Quien decide es el servidor.
  await db
    .update(schema.session)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(schema.session.userId, dueno.id));

  await page.goto("/");
  await expect(page).toHaveURL(/\/acceso$/);
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("salir cierra la sesión en el servidor, no solo en el navegador", async ({ page }) => {
  await entrarPorPantalla(page, dueno);

  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/acceso$/);

  expect(await sesionesDe(dueno.id)).toHaveLength(0);
});

/**
 * `Secure` no se puede ver en local: se sirve por http y la cookie saldría sin él con razón. Lo que
 * sí se puede fijar es la regla que lo decide, para que una actualización de Better Auth no la
 * cambie en silencio — es el riesgo anotado en `T-002` § Risks.
 */
test.describe("la cookie de sesión", () => {
  test("en local sale sin Secure, y con httpOnly, Lax y los 30 días configurados", async () => {
    const { name, attributes } = (await auth.$context).authCookies.sessionToken;
    expect(name).toBe("better-auth.session_token");
    expect(attributes.httpOnly).toBe(true);
    expect(attributes.sameSite).toBe("lax");
    expect(attributes.path).toBe("/");
    expect(attributes.secure).toBe(false);
    expect(attributes.maxAge).toBe(60 * 60 * 24 * 30);
  });

  test("servida por https sale con Secure y con el prefijo __Secure-", async () => {
    const enProduccion = betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema }),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: "https://orbiq.example.com",
    });
    const { name, attributes } = (await enProduccion.$context).authCookies.sessionToken;
    expect(attributes.secure).toBe(true);
    expect(name).toBe("__Secure-better-auth.session_token");
  });
});
