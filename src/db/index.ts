import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Driver por WebSocket, no HTTP. El HTTP de Neon no soporta transacciones interactivas, y AC-008
 * exige que la venta cree venta, líneas y movimientos en una sola transacción o en ninguna.
 * El string es el agrupado: serverless no sostiene conexiones vivas
 * (architecture.md § Known Constraints).
 */
const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL. Ver .env.example");

export const pool = new Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
export { schema };
