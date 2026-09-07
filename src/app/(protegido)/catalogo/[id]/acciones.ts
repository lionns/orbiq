"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cambiarActivacion, editarProducto } from "@/domain/catalogo";
import { ajustarExistencias } from "@/domain/movimientos";
import { validarEdicion } from "@/domain/producto";
import { sesionActual } from "@/domain/session";

export type EstadoAjuste = { error: string | null; hecho: string | null };

export async function ajustar(
  productoId: string,
  _estado: EstadoAjuste,
  datos: FormData,
): Promise<EstadoAjuste> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  const crudo = String(datos.get("conteo") ?? "").trim();
  const conteo = Number(crudo.replace(/\s/g, ""));
  if (!crudo || !Number.isFinite(conteo)) {
    return { error: "Escribe cuántas unidades contaste.", hecho: null };
  }

  const r = await ajustarExistencias(
    productoId,
    conteo,
    String(datos.get("motivo") ?? ""),
    sesion.usuarioId,
  );
  if (!r.ok) return { error: r.mensaje, hecho: null };

  revalidar(productoId);
  return {
    error: null,
    hecho: r.seEscribioMovimiento
      ? `Conteo corregido. Ahora hay ${r.nuevoSaldo}.`
      : `El libro ya decía ${r.nuevoSaldo}. Se corrigió la copia; no hacía falta ningún movimiento.`,
  };
}

export type EstadoEdicion = { errores: Record<string, string>; hecho: boolean };

export async function editar(
  productoId: string,
  _estado: EstadoEdicion,
  datos: FormData,
): Promise<EstadoEdicion> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  const validado = validarEdicion({
    nombre: String(datos.get("nombre") ?? ""),
    precio: String(datos.get("precio") ?? ""),
    categoria: String(datos.get("categoria") ?? ""),
    codigoDeBarras: String(datos.get("codigoDeBarras") ?? ""),
  });
  if (!validado.ok) return { errores: validado.errores, hecho: false };

  const r = await editarProducto(productoId, validado.valor, sesion.usuarioId);
  if (!r.ok) return { errores: { [r.campo]: r.mensaje }, hecho: false };

  revalidar(productoId);
  return { errores: {}, hecho: true };
}

export async function cambiarEstado(productoId: string, activo: boolean): Promise<void> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  await cambiarActivacion(productoId, activo, sesion.usuarioId);
  revalidar(productoId);
}

/** La ficha, el catálogo y la cuadrícula: los tres muestran datos que acaban de cambiar. */
function revalidar(productoId: string) {
  revalidatePath(`/catalogo/${productoId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
}
