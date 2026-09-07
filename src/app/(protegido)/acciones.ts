"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { registrarVenta, type LineaPedida, type ResultadoVenta } from "@/domain/venta";
import { sesionActual } from "@/domain/session";

export async function confirmarVenta(
  ventaId: string,
  lineas: LineaPedida[],
): Promise<ResultadoVenta> {
  // Una acción de servidor es una entrada propia: se alcanza sin pasar por la pantalla (`AC-001`).
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  // Deja subir el error: la pantalla tiene que poder distinguir «no se guardó» de «se guardó».
  // Un fallo convertido en un valor de éxito es exactamente lo que `AC-015` prohíbe.
  return registrarVenta(ventaId, lineas, sesion.usuarioId);
}
