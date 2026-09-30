"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { puede, SIN_PERMISO } from "@/domain/permisos";
import { validarContrasena, validarPersona } from "@/domain/persona";
import { cambiarContrasena, darDeAltaPersona, darDeBaja, persona, reactivar } from "@/domain/personas";
import { sesionActual, type Sesion } from "@/domain/session";

/**
 * Personas (`D-013`). Solo el dueño: cada acción lo comprueba, porque se alcanza sin pasar por la
 * pantalla (`AC-001`). La regla de quién puede vive en `permisos.ts`; aquí solo se pregunta.
 */
async function delDueno(): Promise<Sesion | null> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  return puede(sesion.rol, "administrarPersonas") ? sesion : null;
}

function revalidar(id?: string) {
  revalidatePath("/ajustes/personas");
  if (id) revalidatePath(`/ajustes/personas/${id}`);
}

export type EstadoAlta = { errores: Record<string, string> };

export async function darDeAltaEmpleado(_estado: EstadoAlta, datos: FormData): Promise<EstadoAlta> {
  if (!(await delDueno())) return { errores: { nombre: SIN_PERMISO } };

  const validado = validarPersona({
    nombre: String(datos.get("nombre") ?? ""),
    correo: String(datos.get("correo") ?? ""),
    contrasena: String(datos.get("contrasena") ?? ""),
  });
  if (!validado.ok) return { errores: validado.errores };

  // Desde aquí solo se dan de alta empleados; un dueño lo da de alta el estudio (`alta-dueno`).
  const r = await darDeAltaPersona(validado.valor, "staff");
  if (!r.ok) return { errores: { [r.campo]: r.mensaje } };

  revalidar();
  redirect(`/ajustes/personas/${r.id}?alta=1`);
}

export type EstadoClave = { error: string | null; hecho: string | null };

export async function cambiarClave(
  id: string,
  _estado: EstadoClave,
  datos: FormData,
): Promise<EstadoClave> {
  const sesion = await delDueno();
  if (!sesion) return { error: SIN_PERMISO, hecho: null };
  // La de otro dueño la restablece el estudio (`alta-dueno`), no esta pantalla.
  const quien = await persona(id);
  if (!quien || (quien.rol === "owner" && quien.id !== sesion.usuarioId)) {
    return { error: SIN_PERMISO, hecho: null };
  }
  const contrasena = String(datos.get("contrasena") ?? "");
  const mala = validarContrasena(contrasena);
  if (mala) return { error: mala, hecho: null };
  const cerradas = await cambiarContrasena(id, contrasena);
  revalidar(id);
  return {
    error: null,
    hecho:
      cerradas > 0
        ? "Contraseña cambiada. Se le cerró la sesión: entra otra vez con la nueva."
        : "Contraseña cambiada.",
  };
}

export type EstadoBaja = { error: string | null };

export async function bajaDeEmpleado(id: string, _estado: EstadoBaja, _datos: FormData): Promise<EstadoBaja> {
  const sesion = await delDueno();
  if (!sesion) return { error: SIN_PERMISO };
  const r = await darDeBaja(id, sesion.usuarioId);
  if (!r.ok) return { error: r.mensaje };
  revalidar(id);
  return { error: null };
}

export async function reactivarEmpleado(id: string): Promise<void> {
  if (!(await delDueno())) return;
  const quien = await persona(id);
  if (quien?.rol !== "staff") return;
  await reactivar(id);
  revalidar(id);
}
