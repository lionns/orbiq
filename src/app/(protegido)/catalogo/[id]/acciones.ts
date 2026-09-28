"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { anadirCodigo, cambiarActivacion, corregirCodigo, editarProducto } from "@/domain/catalogo";
import { ajustarExistencias } from "@/domain/movimientos";
import { validarCodigoNuevo, validarEdicion } from "@/domain/producto";
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

  // El grupo contado: un código, o "" para lo que no tiene código (`D-010`).
  const codigoId = String(datos.get("codigoId") ?? "") || null;

  const r = await ajustarExistencias(
    productoId,
    codigoId,
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

  // Los números de código que cambiaron, uno por uno. Cada campo se llama `codigo:<id>` y trae al
  // lado el número que tenía, así que solo se toca lo que el dueño corrigió (`D-010`).
  const errores: Record<string, string> = {};
  for (const [nombre, valor] of datos.entries()) {
    if (!nombre.startsWith("codigo:")) continue;
    const id = nombre.slice("codigo:".length);
    const antes = String(datos.get(`antes:${id}`) ?? "");
    const ahora = String(valor).replace(/\s/g, "");
    if (ahora === antes) continue;
    const c = await corregirCodigo(id, ahora);
    if (!c.ok) errores[nombre] = c.mensaje;
  }
  if (Object.keys(errores).length > 0) {
    revalidar(productoId);
    return { errores, hecho: false };
  }

  revalidar(productoId);
  return { errores: {}, hecho: true };
}

export type EstadoCodigo = { errores: Record<string, string>; hecho: string | null };

/** «Añadir otro código» desde la ficha (`D-010`, `AC-026`). */
export async function anadirOtroCodigo(
  productoId: string,
  _estado: EstadoCodigo,
  datos: FormData,
): Promise<EstadoCodigo> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  const validado = validarCodigoNuevo({
    codigo: String(datos.get("codigo") ?? ""),
    llegaron: String(datos.get("llegaron") ?? ""),
  });
  if (!validado.ok) return { errores: validado.errores, hecho: null };

  const r = await anadirCodigo(productoId, validado.valor, sesion.usuarioId);
  if (!r.ok) return { errores: { [r.campo]: r.mensaje }, hecho: null };

  revalidar(productoId);
  const { codigo, llegaron } = validado.valor;
  return {
    errores: {},
    hecho:
      llegaron > 0
        ? `Código ${codigo} añadido, con ${llegaron} ${llegaron === 1 ? "unidad" : "unidades"}.`
        : `Código ${codigo} añadido.`,
  };
}

export async function cambiarEstado(productoId: string, activo: boolean): Promise<void> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  await cambiarActivacion(productoId, activo, sesion.usuarioId);
  revalidar(productoId);
}

/** La ficha, el catálogo e Inicio: los tres muestran datos que acaban de cambiar. */
function revalidar(productoId: string) {
  revalidatePath(`/catalogo/${productoId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
}
