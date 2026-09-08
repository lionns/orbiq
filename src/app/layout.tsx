import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { atributosDeTema, COOKIE_TEMA, leerTema } from "@/domain/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbiq",
  description: "Inventario y ventas",
  // iOS no lee los íconos del manifest: quiere el suyo, en PNG y sin transparencia (`D-009`).
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Orbiq", statusBarStyle: "default" },
};

// D-009: instalable en pantalla de inicio, en Android y en iPhone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // El manifest solo admite un `theme_color`, y esto pinta la barra de estado. El par claro/oscuro
  // va aquí porque sigue al dispositivo — y el tema de la aplicación lo decide una cookie en el
  // servidor (`T-007`), que es otra cosa: quien fuerza claro con el teléfono en oscuro ve la barra
  // oscura. Es lo correcto: la barra es del sistema, no de la pantalla.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1917" },
  ],
};

/**
 * El tema se decide aquí, en el servidor, leyendo la cookie. Es lo que hace que la primera pintura
 * ya salga con el tema correcto: sin esto haría falta un script que bloquee la pintura para evitar
 * el destello, y en un celular con datos lentos el script es peor que el destello.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <html lang="es" {...atributosDeTema(tema)}>
      <body className="bg-bg font-sans text-text">{children}</body>
    </html>
  );
}
