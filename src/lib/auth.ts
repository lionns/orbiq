import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@/db";

/**
 * D-008. Sesión de servidor con cookie opaca, que es lo que Better Auth hace de fábrica.
 *
 * `socialProviders` va vacío a propósito: la puerta la abre el esquema — credenciales en `account`,
 * separadas de `user` — y encender Google después es configuración, no migración.
 *
 * Cuando se encienda, va con `disableSignUp: true`: iniciar sesión con un proveedor no es
 * registrarse, y el callback debe rechazar una cuenta que el estudio no dio de alta.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Sin registro público (D-008). El alta la hace el estudio.
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "owner", input: false },
    },
  },
});
