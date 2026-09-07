"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sesionActual } from "@/domain/session";
import { anularVenta } from "@/domain/venta";

export type EstadoAnulacion = { error: string | null };

export async function anular(
  ventaId: string,
  _estado: EstadoAnulacion,
  _datos: FormData,
): Promise<EstadoAnulacion> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  const r = await anularVenta(ventaId, sesion.usuarioId);
  if (!r.ok) return { error: r.mensaje };

  // La venta, el listado, la cuadrícula y las fichas de los productos: todo cambió.
  revalidatePath(`/ventas/${ventaId}`);
  revalidatePath("/ventas");
  revalidatePath("/");
  revalidatePath("/catalogo", "layout");
  return { error: null };
}
