"use server";

import { deshacerVenta } from "../../acciones";

export type EstadoAnulacion = { error: string | null };

export async function anular(
  ventaId: string,
  _estado: EstadoAnulacion,
  _datos: FormData,
): Promise<EstadoAnulacion> {
  const r = await deshacerVenta(ventaId);
  if (!r.ok) return { error: r.mensaje };
  return { error: null };
}
