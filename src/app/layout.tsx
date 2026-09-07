import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { atributosDeTema, COOKIE_TEMA, leerTema } from "@/domain/tema";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbiq",
  description: "Inventario y ventas",
};

// D-007: corre en pestaña del navegador, no se declara instalable en iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
      <body>{children}</body>
    </html>
  );
}
