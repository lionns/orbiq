"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { crearProducto } from "@/domain/catalogo";
import { validarAlta } from "@/domain/producto";
import { puede, SIN_PERMISO } from "@/domain/permisos";
import { sesionActual } from "@/domain/session";

export type EstadoAlta = { errores: Record<string, string> };

export async function darDeAlta(_estado: EstadoAlta, datos: FormData): Promise<EstadoAlta> {
  // La guardia del layout ya redirige, pero una acción de servidor es una entrada propia: se
  // alcanza sin pasar por la pantalla (`AC-001`).
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  if (!puede(sesion.rol, "editarProducto")) return { errores: { nombre: SIN_PERMISO } };

  const validado = validarAlta({
    nombre: String(datos.get("nombre") ?? ""),
    precio: String(datos.get("precio") ?? ""),
    categoria: String(datos.get("categoria") ?? ""),
    codigoDeBarras: String(datos.get("codigoDeBarras") ?? ""),
    existenciasIniciales: String(datos.get("existenciasIniciales") ?? ""),
  });
  if (!validado.ok) return { errores: validado.errores };

  const resultado = await crearProducto(validado.valor, sesion.usuarioId);
  if (!resultado.ok) return { errores: { [resultado.campo]: resultado.mensaje } };

  revalidatePath("/catalogo");
  redirect("/catalogo");
}
