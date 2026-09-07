import Link from "next/link";
import { listarCatalogo } from "@/domain/catalogo";
import { formatearPrecio } from "@/domain/moneda";

export const dynamic = "force-dynamic";

export default async function Catalogo({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const productos = await listarCatalogo(q);
  const buscando = Boolean(q?.trim());

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>

      {/* GET, no acción de cliente: buscar tiene que funcionar con la red a medias. */}
      <form className="mt-4 flex gap-2" role="search">
        <input
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="Nombre o código"
          aria-label="Buscar en el catálogo"
          className="min-h-12 flex-1 rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] px-4"
        />
        <button
          type="submit"
          className="min-h-12 rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] px-4"
        >
          Buscar
        </button>
      </form>

      {productos.length === 0 ? (
        <EstadoVacio buscando={buscando} />
      ) : (
        <ul className="mt-6 flex flex-col gap-2" data-testid="lista-catalogo">
          {productos.map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between gap-4 rounded-[var(--radius-card)] border border-[color:var(--color-border)] p-4"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.nombre}</span>
                <span className="block text-[color:var(--color-text-muted)]">
                  {p.categoria ?? "Sin categoría"}
                  {p.codigoDeBarras ? ` · ${p.codigoDeBarras}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-medium tabular-nums">{formatearPrecio(p.precio)}</span>
                <span
                  className={`block tabular-nums ${
                    p.existencias < 0
                      ? "text-[color:var(--color-danger)]"
                      : "text-[color:var(--color-text-muted)]"
                  }`}
                >
                  {p.existencias} en existencia
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Regla del pulgar: la acción vive abajo, no en el tercio superior. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
        <Link
          href="/catalogo/nuevo"
          className="mx-auto flex min-h-12 max-w-2xl items-center justify-center rounded-[var(--radius-button)] bg-[color:var(--color-accent)] px-4 font-medium text-[color:var(--color-accent-text)]"
        >
          Nuevo producto
        </Link>
      </div>
    </main>
  );
}

function EstadoVacio({ buscando }: { buscando: boolean }) {
  // design-handoff.md § Interaction States: el catálogo vacío ofrece dar de alta el primero.
  return (
    <p className="mt-8 text-[color:var(--color-text-muted)]" data-testid="catalogo-vacio">
      {buscando
        ? "Ningún producto coincide con esa búsqueda."
        : "Todavía no hay productos. Da de alta el primero para empezar a vender."}
    </p>
  );
}
