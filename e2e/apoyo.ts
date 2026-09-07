import "dotenv/config";
import { expect, type Page } from "@playwright/test";
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

export async function entrarComo(page: Page, dueno: DuenoDePrueba): Promise<void> {
  await entrar(page, dueno.correo, dueno.clave);
  await expect(page.getByTestId("sesion-nombre")).toHaveText(dueno.nombre);
}
