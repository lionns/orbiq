"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_TEMA, COOKIE_TEMA_MAX_EDAD, leerTema } from "@/domain/tema";

/**
 * Guarda la preferencia de tema. No es una acción del negocio: no toca la base, no necesita sesión
 * y funciona igual en la pantalla de acceso, que es donde más blanco hay.
 */
export async function elegirTema(datos: FormData): Promise<void> {
  const tema = leerTema(String(datos.get("tema") ?? ""));
  const almacen = await cookies();

  almacen.set(COOKIE_TEMA, tema, {
    maxAge: COOKIE_TEMA_MAX_EDAD,
    path: "/",
    sameSite: "lax",
    // No es `httpOnly`: no hay nada que proteger y así el día que haya un cambio sin recarga, el
    // cliente puede leerla. Tampoco es `secure` a la fuerza, para que siga sirviendo en local.
    httpOnly: false,
  });

  // La plantilla raíz lee la cookie, así que hay que repintar desde arriba.
  revalidatePath("/", "layout");
}
