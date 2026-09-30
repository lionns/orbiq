"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { auth, CUENTA_DE_BAJA } from "@/lib/auth";

export type EstadoAcceso = { error: string | null };

/**
 * Un solo mensaje para todos los rechazos. Decir «ese correo no existe» le regala al atacante la
 * mitad del trabajo, y Better Auth ya iguala el tiempo de respuesta calculando el hash aunque el
 * usuario no exista (`api/routes/sign-in.mjs`).
 */
const RECHAZO = "Correo o contraseña incorrectos.";

export async function entrar(_estado: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const correo = String(datos.get("correo") ?? "").trim();
  const contrasena = String(datos.get("contrasena") ?? "");

  if (!correo || !contrasena) return { error: "Escribe tu correo y tu contraseña." };

  try {
    await auth.api.signInEmail({
      body: { email: correo, password: contrasena },
      headers: await headers(),
    });
  } catch (error) {
    // Dado de baja (`D-013`): solo llega aquí quien escribió la contraseña correcta, así que decirlo
    // no revela qué correos existen, y le ahorra probar otra vez.
    if (isAPIError(error) && error.body?.code === CUENTA_DE_BAJA) {
      return { error: "Ya no tienes acceso a esta tienda. Habla con el dueño." };
    }
    return { error: RECHAZO };
  }

  redirect("/");
}

export async function salir(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/acceso");
}
