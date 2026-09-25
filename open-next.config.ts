import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Sin caché incremental: todas las pantallas son dinámicas (`force-dynamic`) porque leen la sesión
// y datos que cambian con cada venta. No hay nada que guardar en R2 entre peticiones.
export default defineCloudflareConfig({});
