/**
 * Quién es el negocio. Mismo argumento que la moneda y la zona horaria, y por eso vive al lado:
 * un despliegue por negocio es un nombre por base (`D-005`).
 *
 * Existe porque la aplicación no decía en ninguna parte de quién era. El esquema guarda el nombre
 * del **dueño** —quien entra—, que no es lo mismo que cómo se llama la tienda, y poner uno donde va
 * el otro es lo que hace que una herramienta se sienta prestada.
 *
 * **Sin `NEGOCIO_NOMBRE` dice «Mi tienda»**, que se ve y se corrige: cambiarlo es una variable del
 * despliegue, no una línea de código.
 */
export const NEGOCIO = {
  /**
   * El de este despliegue (`NEGOCIO_NOMBRE`, por negocio en `wrangler.jsonc`, `T-031`). Se lee en
   * cada uso y no al cargar el módulo: en un Worker las variables llegan con la petición.
   */
  get nombre(): string {
    return process.env.NEGOCIO_NOMBRE?.trim() || "Mi tienda";
  },
};
