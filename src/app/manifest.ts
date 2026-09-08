import type { MetadataRoute } from "next";

/**
 * Lo que convierte la pestaña en una aplicación instalada (`D-009`).
 *
 * Sin esto el ícono de la pantalla de inicio es un marcador: al tocarlo abre el navegador con su
 * barra de direcciones. Con `display: standalone` abre en su propia ventana, sin barra y con su
 * tarjeta en el conmutador de aplicaciones. En Android además habilita el WebAPK, que el sistema
 * instala de verdad.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` fija la identidad de la aplicación instalada. Sin él, cambiar `start_url` mañana haría
    // que el navegador la tomara por otra distinta y ofreciera instalarla de nuevo.
    id: "/",
    name: "Orbiq — inventario y ventas",
    // Lo que cabe bajo un ícono en la pantalla de inicio. Doce caracteres o se corta.
    short_name: "Orbiq",
    description: "Qué tienes, a qué precio y qué se está acabando.",
    lang: "es",
    dir: "ltr",
    // La venta es la portada: es lo que el dueño abre cien veces al día (`US-005`).
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Se opera de pie y con una mano; girar el teléfono no es parte del trabajo, pero forzarlo
    // rompería la tablet y el escritorio, así que se deja al dispositivo.
    orientation: "any",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android recorta con la máscara de su lanzador y solo garantiza el 80% central. Sin un
      // ícono `maskable` propio, el sistema encoge el otro y lo deja flotando en un círculo blanco.
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
