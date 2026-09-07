import { count, desc } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Andamiaje. La única razón de que esta pantalla lea la base es probar la cadena completa —
 * pantalla, servidor, Neon por WebSocket, Drizzle — antes de que exista una rebanada real.
 * T-003 la reemplaza por el catálogo de verdad.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [total] = await db.select({ n: count() }).from(schema.product);
  const [ultimo] = await db
    .select({ name: schema.product.name })
    .from(schema.product)
    .orderBy(desc(schema.product.createdAt))
    .limit(1);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Orbiq</h1>
      <p className="mt-2 text-[color:var(--color-text-muted)]">
        Inventario y ventas. Andamiaje en pie; las rebanadas entran por T-002.
      </p>
      <p className="mt-6" data-testid="catalogo-total">
        {total?.n ?? 0} productos en el catálogo
      </p>
      <p className="mt-1 text-[color:var(--color-text-muted)]" data-testid="catalogo-ultimo">
        {ultimo ? `Último dado de alta: ${ultimo.name}` : "Todavía no hay ninguno"}
      </p>
    </main>
  );
}
