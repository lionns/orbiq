"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearProducto, resolverCodigo, type Resuelto, type ResultadoAlta } from "@/domain/catalogo";
import { validarAlta } from "@/domain/producto";
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

/**
 * Resuelve un código venido del objetivo de escaneo. Envuelve la función de dominio y no decide
 * nada por su cuenta: la regla vive en `resolverCodigo` y así sirve igual a esta pantalla que a la
 * ruta HTTP que algún día la exponga (`D-001`).
 */
export async function buscarPorCodigo(codigo: string): Promise<Resuelto> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  return resolverCodigo(codigo);
}

/**
 * El alta desde un código desconocido, sin salir de la venta (`FR-003`, `AC-007`).
 *
 * Pide lo mínimo para poder cobrar —nombre y precio—; el resto del producto se completa después en
 * su ficha. Nace sin existencias a propósito: lo que hay en el mostrador no se sabe, y el libro no
 * admite un número inventado (`D-002`). La venta lo dejará en negativo, que es justamente lo que el
 * catálogo ya sabe mostrar.
 */
export async function altaRapida(
  codigo: string,
  nombre: string,
  precio: string,
): Promise<ResultadoAlta> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  const validado = validarAlta({
    nombre,
    precio,
    codigoDeBarras: codigo,
    existenciasIniciales: "0",
  });
  if (!validado.ok) {
    const [campo, mensaje] = Object.entries(validado.errores)[0]!;
    return { ok: false, campo, mensaje };
  }

  const resultado = await crearProducto(validado.valor, sesion.usuarioId);
  if (resultado.ok) revalidatePath("/catalogo");
  return resultado;
}
