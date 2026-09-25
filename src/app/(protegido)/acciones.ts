"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  contarCatalogo,
  crearProducto,
  resolverCodigo,
  type Resuelto,
  type ResultadoAlta,
} from "@/domain/catalogo";
import { leerFiltros } from "@/domain/filtros";
import { validarAlta } from "@/domain/producto";
import {
  registrarVenta,
  anularVenta,
  resolverEntradaDeVenta,
  type EntradaDeVenta,
  type LineaPedida,
  type ResultadoVenta,
  type ResultadoAnulacion,
} from "@/domain/venta";
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

/** La anulación recién cobrada y la del detalle comparten dominio, sesión y revalidación. */
export async function deshacerVenta(ventaId: string): Promise<ResultadoAnulacion> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  const resultado = await anularVenta(ventaId, sesion.usuarioId);
  if (!resultado.ok) return resultado;

  revalidatePath(`/ventas/${ventaId}`);
  revalidatePath("/ventas");
  revalidatePath("/");
  revalidatePath("/catalogo", "layout");
  return resultado;
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

/**
 * Lo que el dueño escribe o escanea en la venta, resuelto en un solo viaje (`FR-015`, `AC-023`).
 *
 * Un viaje y no dos —primero código, luego nombre— porque `NFR-002` cuenta segundos: una venta de
 * tres artículos entera tiene que caber en veinte.
 */
export async function buscarEnVenta(texto: string): Promise<EntradaDeVenta> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  return resolverEntradaDeVenta(texto);
}

/**
 * Cuántos productos dejarían unos filtros aún sin aplicar: la consulta del formulario, tal cual.
 * Pasa por `leerFiltros`, así que un valor inventado se ignora igual que en la dirección.
 */
export async function contarProductos(consulta: string): Promise<number> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  return contarCatalogo(leerFiltros(Object.fromEntries(new URLSearchParams(consulta))));
}
