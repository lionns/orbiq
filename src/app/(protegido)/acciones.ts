"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  anadirCodigo,
  buscarParaAnadirCodigo,
  contarCatalogo,
  crearProducto,
  resolverCodigo,
  type CandidatoParaCodigo,
  type Resuelto,
  type ResultadoAlta,
  type ResultadoCodigo,
} from "@/domain/catalogo";
import { leerFiltros } from "@/domain/filtros";
import { validarAlta, validarCodigoNuevo } from "@/domain/producto";
import {
  registrarVenta,
  anularVenta,
  resolverEntradaDeVenta,
  type EntradaDeVenta,
  type LineaPedida,
  type ResultadoVenta,
  type ResultadoAnulacion,
} from "@/domain/venta";
import { puede, SIN_PERMISO } from "@/domain/permisos";
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

  // Deshacer un cobro es anularlo: lo mismo que el dueño se reserva en Ventas (`D-013`).
  if (!puede(sesion.rol, "anular")) return { ok: false, mensaje: SIN_PERMISO };

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
 * Pide lo mínimo para poder cobrar —nombre y precio— y, si se sabe, cuántas hay
 * (`.diseno/codigos/Nuevo`). Sin ese número nace en cero: el libro no admite uno inventado
 * (`D-002`), y la venta lo dejará en negativo, que el catálogo ya sabe mostrar. El resto del
 * producto se completa después en su ficha.
 */
export async function altaRapida(
  codigo: string,
  nombre: string,
  precio: string,
  cuantas = "",
): Promise<ResultadoAlta> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  if (!puede(sesion.rol, "editarProducto")) return { ok: false, campo: "nombre", mensaje: SIN_PERMISO };

  const validado = validarAlta({
    nombre,
    precio,
    codigoDeBarras: codigo,
    existenciasIniciales: cuantas,
  });
  if (!validado.ok) {
    const [campo, mensaje] = Object.entries(validado.errores)[0]!;
    return { ok: false, campo, mensaje };
  }

  const resultado = await crearProducto(validado.valor, sesion.usuarioId);
  if (resultado.ok) revalidatePath("/catalogo");
  return resultado;
}

/** Los productos a los que añadirles un código que cambió, buscados por nombre (`AC-025`). */
export async function buscarParaCodigo(texto: string): Promise<CandidatoParaCodigo[]> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  return buscarParaAnadirCodigo(texto);
}

/**
 * Añade el código escaneado a un producto que ya se vende, con lo que llegó (`D-010`, `AC-026`).
 * Sirve igual a la venta, que después lo añade al carrito, que a Productos, que abre su ficha.
 */
export async function anadirCodigoAProducto(
  productoId: string,
  codigo: string,
  llegaron: string,
): Promise<ResultadoCodigo> {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  if (!puede(sesion.rol, "editarProducto")) return { ok: false, campo: "codigo", mensaje: SIN_PERMISO };

  const validado = validarCodigoNuevo({ codigo, llegaron });
  if (!validado.ok) {
    const [campo, mensaje] = Object.entries(validado.errores)[0]!;
    return { ok: false, campo: campo as "codigo" | "llegaron", mensaje };
  }

  const resultado = await anadirCodigo(productoId, validado.valor, sesion.usuarioId);
  if (resultado.ok) {
    revalidatePath(`/catalogo/${productoId}`);
    revalidatePath("/catalogo");
    revalidatePath("/");
  }
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
