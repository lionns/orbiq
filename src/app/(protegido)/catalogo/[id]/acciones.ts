"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ajustarExistencias } from "@/domain/movimientos";
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

  revalidatePath(`/catalogo/${productoId}`);
  revalidatePath("/catalogo");
  revalidatePath("/");
  return {
    error: null,
    hecho: r.seEscribioMovimiento
      ? `Conteo corregido. Ahora hay ${r.nuevoSaldo}.`
      : `El libro ya decía ${r.nuevoSaldo}. Se corrigió la copia; no hacía falta ningún movimiento.`,
  };
}
