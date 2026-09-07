import Link from "next/link";
import { listarCatalogo, ultimoAlta } from "@/domain/catalogo";

/**
 * Portada de andamiaje. La venta con cuadrícula la reemplaza en T-004; hoy sirve de puerta al
 * catálogo y de prueba de que la cadena entera —pantalla, servidor, Neon— responde.
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  const [productos, ultimo] = await Promise.all([listarCatalogo(), ultimoAlta()]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Orbiq</h1>
      <p className="mt-2 text-[color:var(--color-text-muted)]">
        Inventario y ventas. La venta con cuadrícula entra en T-004.
      </p>
      <p className="mt-6" data-testid="catalogo-total">
        {productos.length} productos en el catálogo
      </p>
      <p className="mt-1 text-[color:var(--color-text-muted)]" data-testid="catalogo-ultimo">
        {ultimo ? `Último dado de alta: ${ultimo}` : "Todavía no hay ninguno"}
      </p>
      <Link
        href="/catalogo"
        className="mt-8 flex min-h-12 items-center justify-center rounded-[var(--radius-button)] bg-[color:var(--color-accent)] px-4 font-medium text-[color:var(--color-accent-text)]"
      >
        Ver catálogo
      </Link>
    </main>
  );
}
