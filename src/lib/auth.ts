import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@/db";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) throw new Error("Falta BETTER_AUTH_SECRET. Ver .env.example");

/**
 * D-008. Sesión de servidor con cookie opaca, que es lo que Better Auth hace de fábrica.
 *
 * Verificado el 2026-09-06 contra el código de la versión 1.7.3, no contra su documentación:
 * el token son 32 caracteres de un alfabeto de 62 (~190 bits) sacados de `crypto.getRandomValues`
 * con muestreo por rechazo (`@better-auth/utils/random`), y la cookie sale `httpOnly`,
 * `SameSite=Lax` y `Secure` cuando el `baseURL` es https (`cookies/index.mjs`). Nada del usuario
 * viaja en su valor — `AC-002`.
 *
 * `socialProviders` va vacío a propósito: la puerta la abre el esquema — credenciales en `account`,
 * separadas de `user` — y encender Google después es configuración, no migración.
 *
 * Cuando se encienda, va con `disableSignUp: true`: iniciar sesión con un proveedor no es
 * registrarse, y el callback debe rechazar una cuenta que el estudio no dio de alta.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // Sin registro público (D-008). El alta la hace el estudio: `npm run alta-dueno`.
    disableSignUp: true,
  },
  session: {
    // Treinta días, y cada día de uso la renueva. El dueño abre la tienda, no una aplicación:
    // pedirle la clave cada semana es la vía más corta a que deje de usarla (D-008).
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  /**
   * Límite de intentos (`T-037`): en la base, compartido entre las instancias del Worker, y por la
   * IP que pone Cloudflare (`cf-connecting-ip`), que el cliente no puede falsear. `x-forwarded-for`
   * queda detrás para Node en local. Las reglas son las de fábrica: tres intentos de entrar cada
   * diez segundos por IP, medido en `T-037`.
   */
  rateLimit: { storage: "database" },
  advanced: {
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "owner", input: false },
    },
  },
  // Va de último a propósito: el propio paquete avisa si otro plugin de cookies queda después.
  plugins: [nextCookies()],
});
