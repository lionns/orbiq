import Link from "next/link";
import { categoriasExistentes, listarCatalogo } from "@/domain/catalogo";
import {
  comoDireccion,
  hayFiltros,
  leerFiltros,
  siguienteTanda,
  type ParametrosCrudos,
} from "@/domain/filtros";
import { formatearPrecio } from "@/domain/moneda";
import { Filtros } from "./filtros";

export const dynamic = "force-dynamic";

export default async function Catalogo({
  searchParams,
}: {
  searchParams: Promise<ParametrosCrudos>;
}) {
  const filtros = leerFiltros(await searchParams);
  const [{ productos, total, hayMas }, categorias] = await Promise.all([
    listarCatalogo(filtros),
    categoriasExistentes(),
  ]);
  const acotado = hayFiltros(filtros);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>

      <Filtros filtros={filtros} categorias={categorias} acotado={acotado} />

      <p className="mt-4 text-[color:var(--color-text-muted)]" data-testid="conteo">
        {total === 0
          ? "Ningún producto"
          : total === 1
            ? "1 producto"
            : `${total} productos`}
        {productos.length < total ? ` · mostrando ${productos.length}` : ""}
      </p>

      {productos.length === 0 ? (
        <EstadoVacio acotado={acotado} />
      ) : (
        <ul className="mt-4 flex flex-col gap-2" data-testid="lista-catalogo">
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

      {/* Un enlace, no un botón: suma a lo ya visto, conserva los filtros y funciona sin
          JavaScript. El estado vive en la dirección (`AC-017`, `AC-018`). */}
      {hayMas ? (
        <Link
          href={comoDireccion(filtros, { ver: siguienteTanda(filtros) })}
          data-testid="ver-mas"
          className="mt-4 flex min-h-12 items-center justify-center rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] px-4"
        >
          Ver más
        </Link>
      ) : null}

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

function EstadoVacio({ acotado }: { acotado: boolean }) {
  // design-handoff.md § Interaction States: el catálogo vacío ofrece dar de alta el primero.
  return (
    <p className="mt-8 text-[color:var(--color-text-muted)]" data-testid="catalogo-vacio">
      {acotado
        ? "Ningún producto cumple lo que buscas. Quita algún filtro."
        : "Todavía no hay productos. Da de alta el primero para empezar a vender."}
    </p>
  );
}
