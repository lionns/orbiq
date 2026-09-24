"use client";

import { useSyncExternalStore } from "react";
import { unidades, type Carrito } from "@/domain/carrito";

/**
 * La venta en curso, guardada en el dispositivo hasta cobrarla o vaciarla (`T-029`, punto 1).
 *
 * Antes vivía solo en el estado de la pantalla de venta: ir a mirar un precio y volver la perdía
 * sin avisar. Se guarda aquí y no en el servidor porque todavía no es una venta —no toca existencias
 * ni el libro— y porque tiene que sobrevivir a una recarga con la red caída.
 *
 * El identificador viaja con ella: reintentar tras recargar sigue siendo el mismo envío y no cobra
 * dos veces (`AC-010`).
 */
const CLAVE = "orbiq.venta";
/** `storage` solo avisa a las otras pestañas; este evento avisa a la misma (la insignia de Vender). */
const EVENTO = "orbiq:venta";

function esCarrito(x: unknown): x is Carrito {
  if (!x || typeof x !== "object") return false;
  const c = x as Carrito;
  return (
    typeof c.id === "string" &&
    Array.isArray(c.articulos) &&
    c.articulos.every(
      (a) =>
        typeof a?.productoId === "string" &&
        typeof a.nombre === "string" &&
        Number.isInteger(a.precio) &&
        Number.isInteger(a.cantidad) &&
        a.cantidad > 0,
    )
  );
}

/** Lo guardado, o nada. Un valor roto —otra versión, alguien que lo editó— se ignora. */
export function leerVentaGuardada(): Carrito | null {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    const valor: unknown = JSON.parse(texto);
    return esCarrito(valor) ? valor : null;
  } catch {
    return null;
  }
}

/** Una venta vacía no se guarda: vaciar o cobrar la borra. */
export function guardarVenta(carrito: Carrito): void {
  try {
    if (carrito.articulos.length) localStorage.setItem(CLAVE, JSON.stringify(carrito));
    else localStorage.removeItem(CLAVE);
  } catch {
    // Navegación privada o almacenamiento lleno: la venta sigue en pantalla, solo no sobrevive a
    // una recarga. No es motivo para interrumpir a quien está cobrando.
  }
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(avisar: () => void): () => void {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function articulosGuardados(): number {
  const carrito = leerVentaGuardada();
  return carrito ? unidades(carrito) : 0;
}

/** Cuántos artículos lleva la venta en curso. En el servidor, cero: ahí no hay dispositivo. */
export function useArticulosEnVenta(): number {
  return useSyncExternalStore(suscribir, articulosGuardados, () => 0);
}
