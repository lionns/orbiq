import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad en toda respuesta (`T-037`). Medido antes: ninguna, y `X-Powered-By`
 * anunciando Next.js.
 *
 * - `frame-ancestors 'none'` y `X-Frame-Options`: nadie puede meter la app dentro de su página
 *   para que el dueño toque «Cobrar» o «Anular» creyendo que toca otra cosa.
 * - `nosniff`: el navegador no adivina el tipo de un archivo.
 * - `Referrer-Policy`: al salir a otro sitio no viaja la dirección entera, que lleva ids de ventas.
 * - `Permissions-Policy`: la cámara, solo para esta app; micrófono y ubicación, para nadie.
 *
 * Sin `Content-Security-Policy` completa a propósito: Next pone scripts en línea al hidratar, y
 * una política estricta necesita nonces por petición. Se decide aparte, no se improvisa.
 */
const CABECERAS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:ruta*", headers: CABECERAS }];
  },

  /**
   * `pg` solo carga `pg-cloudflare` cuando corre en Cloudflare Workers, así que el rastreo de
   * archivos de Next no lo ve y el build de OpenNext falla con «Could not resolve "pg-cloudflare"»
   * (`T-031`). Se incluye a mano; en Node no cambia nada.
   */
  outputFileTracingIncludes: { "/**": ["./node_modules/pg-cloudflare/**"] },

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
