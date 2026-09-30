/**
 * Lo que puede hacer cada persona del negocio (`D-013`). Un solo sitio: la pantalla lo consulta para
 * no ofrecer lo que no toca, y cada acción de servidor para rechazarlo. Esconder un botón no es
 * seguridad; esta tabla sí, porque la consulta quien escribe.
 *
 * Un permiso o un rol nuevo es una línea aquí, no una migración: el rol es un texto en `user.role`.
 */
export const ROLES = ["owner", "staff"] as const;
export type Rol = (typeof ROLES)[number];

/** Cómo se llama cada rol en pantalla (validado con el estudio el 2026-09-29). */
export const NOMBRE_DEL_ROL: Record<Rol, string> = { owner: "Dueño", staff: "Empleado" };

export type Accion =
  /** Anular una venta, también «Deshacer» un cobro: es la misma cosa. */
  | "anular"
  /** Precio, nombre, categoría, dejar de vender, añadir, corregir o generar códigos, y dar de alta. */
  | "editarProducto"
  /** Corregir el conteo y registrar lo que llegó: cambian existencias sin que haya venta. */
  | "ajustarConteo"
  | "administrarPersonas";

const DEL_DUENO: readonly Accion[] = ["anular", "editarProducto", "ajustarConteo", "administrarPersonas"];

const PERMISOS: Record<Rol, readonly Accion[]> = {
  owner: DEL_DUENO,
  // Vender, buscar, escanear y ver Inicio y Ventas no están en la lista: los puede todo el que entra.
  staff: [],
};

/** Un rol que no se conoce no puede nada: una fila mal escrita no abre ninguna puerta. */
export function leerRol(valor: unknown): Rol | null {
  return ROLES.includes(valor as Rol) ? (valor as Rol) : null;
}

export function puede(rol: Rol | null | undefined, accion: Accion): boolean {
  return rol ? PERMISOS[rol].includes(accion) : false;
}

/** Lo que dice una acción rechazada. No se llega aquí desde la pantalla: ahí no se ofrece. */
export const SIN_PERMISO = "Eso lo hace el dueño de la tienda.";
