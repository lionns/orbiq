"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

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
  } catch {
    return { error: RECHAZO };
  }

  redirect("/");
}

export async function salir(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/acceso");
}
