import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Solo desarrollo. No cambia nada de lo que se despliega.
   *
   * El servidor de desarrollo bloquea sus propios recursos (`/_next/*`, el HMR) cuando la petición
   * llega desde un host distinto al que lo arrancó. El HTML sí se sirve —lo pinta el servidor—,
   * así que la pantalla **se ve pero no responde**: ni las casillas de la venta ni la cámara, que
   * son JavaScript. No hay error visible en la pantalla; el aviso queda en el log del servidor.
   *
   * Pasa al probar en un teléfono, que es exactamente cuando hace falta: por un túnel HTTPS o por
   * la IP de la máquina en la red local.
   *
   * La IP local no se escribe aquí porque es de cada máquina y esto está versionado: va por
   * `DEV_ORIGIN`, p. ej. `DEV_ORIGIN=192.168.1.42 npm run dev`.
   */
  allowedDevOrigins: [
    // Túneles de Cloudflare: el subdominio es distinto en cada arranque.
    "**.trycloudflare.com",
    ...(process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : []),
  ],
};

export default nextConfig;
