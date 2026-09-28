"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { auth } from "@/lib/auth";

export type EstadoAcceso = { error: string | null };

/**
 * Un solo mensaje para todos los rechazos. Decir «ese correo no existe» le regala al atacante la
 * mitad del trabajo, y Better Auth ya iguala el tiempo de respuesta calculando el hash aunque el
 * usuario no exista (`api/routes/sign-in.mjs`).
 */
const RECHAZO = "Correo o contraseña incorrectos.";
const DEMASIADOS = "Demasiados intentos. Espera unos segundos y vuelve a intentarlo.";

/**
 * Las cabeceras que el límite de intentos necesita para saber de qué IP viene la petición
 * (`src/lib/auth.ts` § `ipAddressHeaders`). Nada más: ni la cookie ni el cuerpo de la acción.
 */
const CABECERAS_DE_ORIGEN = ["cf-connecting-ip", "x-forwarded-for", "user-agent"];

/**
 * Entra por la misma puerta que `/api/auth/sign-in/email` (`T-038`).
 *
 * Antes se llamaba `auth.api.signInEmail`, y esa llamada directa **no pasa por el límite de
 * intentos** de Better Auth, que vive en el `onRequest` de su router (`api/index.mjs`): medido, doce
 * contraseñas seguidas desde la misma IP por este formulario, ninguna frenada, mientras `curl` a
 * `/api/auth` daba 429 al cuarto. Cada intento es un scrypt, que además es CPU que se paga.
 *
 * `auth.handler` sí pasa por el router. `nextCookies` no escribe la cookie en ese camino
 * (`_flag === "router"`), así que se copia aquí.
 */
export async function entrar(_estado: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const correo = String(datos.get("correo") ?? "").trim();
  const contrasena = String(datos.get("contrasena") ?? "");

  if (!correo || !contrasena) return { error: "Escribe tu correo y tu contraseña." };

  const entrantes = await headers();
  const base = auth.options.baseURL!;
  const cabeceras = new Headers({
    "content-type": "application/json",
    // Next ya comprobó el origen de la acción de servidor; Better Auth lo vuelve a pedir.
    origin: entrantes.get("origin") ?? new URL(base).origin,
  });
  for (const nombre of CABECERAS_DE_ORIGEN) {
    const valor = entrantes.get(nombre);
    if (valor) cabeceras.set(nombre, valor);
  }

  const respuesta = await auth.handler(
    new Request(new URL("/api/auth/sign-in/email", base), {
      method: "POST",
      headers: cabeceras,
      body: JSON.stringify({ email: correo, password: contrasena }),
    }),
  );

  if (respuesta.status === 429) return { error: DEMASIADOS };
  if (!respuesta.ok) return { error: RECHAZO };

  const almacen = await cookies();
  for (const [nombre, atributos] of parseSetCookieHeader(respuesta.headers.get("set-cookie") ?? "")) {
    almacen.set(nombre, atributos.value, toCookieOptions(atributos));
  }

  redirect("/");
}

export async function salir(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/acceso");
}
