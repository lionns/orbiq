/**
 * Quién es el negocio. Mismo argumento que la moneda y la zona horaria, y por eso vive al lado:
 * un despliegue por negocio es un nombre por base (`D-005`).
 *
 * Existe porque la aplicación no decía en ninguna parte de quién era. El esquema guarda el nombre
 * del **dueño** —quien entra—, que no es lo mismo que cómo se llama la tienda, y poner uno donde va
 * el otro es lo que hace que una herramienta se sienta prestada.
 *
 * **`nombre` es un marcador, no un dato real.** Se pone el del primer cliente cuando lo haya;
 * hasta entonces dice «Mi tienda», que se ve y se corrige. Cambiarlo es esta línea.
 */
export const NEGOCIO = {
  nombre: "Mi tienda",
} as const;
