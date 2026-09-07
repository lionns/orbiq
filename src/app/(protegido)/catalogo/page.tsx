import Link from "next/link";
import { categoriasExistentes, listarCatalogo } from "@/domain/catalogo";
import {
  comoDireccion,
  hayFiltros,
  leerFiltros,
  siguienteTanda,
  type ParametrosCrudos,
} from "@/domain/filtros";
import { BarraInferior } from "@/ui/barra-inferior";
import { BotonEnlace } from "@/ui/boton";
import { Existencias, Precio } from "@/ui/cifras";
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

      <p className="mt-4 text-text-muted" data-testid="conteo">
        {total === 0 ? "Ningún producto" : total === 1 ? "1 producto" : `${total} productos`}
        {productos.length < total ? ` · mostrando ${productos.length}` : ""}
      </p>

      {productos.length === 0 ? (
        <EstadoVacio acotado={acotado} />
      ) : (
        <ul className="mt-4 flex flex-col gap-2" data-testid="lista-catalogo">
          {productos.map((p) => (
            <li key={p.id}>
              {/* Toda la tarjeta es el enlace: en un celular, un blanco de 48 px de alto se acierta
                  y uno de nombre no. */}
              <Link
                href={`/catalogo/${p.id}`}
                data-tarjeta
                className="flex items-baseline justify-between gap-4 rounded-card border border-border bg-surface p-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.nombre}</span>
                  <span className="block text-text-muted">
                    {p.categoria ?? "Sin categoría"}
                    {p.codigoDeBarras ? ` · ${p.codigoDeBarras}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <Precio valor={p.precio} className="block font-medium" />
                  <Existencias cantidad={p.existencias} className="block" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Un enlace, no un botón: suma a lo ya visto, conserva los filtros y funciona sin
          JavaScript. El estado vive en la dirección (`AC-017`, `AC-018`). */}
      {hayMas ? (
        <BotonEnlace
          href={comoDireccion(filtros, { ver: siguienteTanda(filtros) })}
          data-testid="ver-mas"
          className="mt-4 w-full"
        >
          Ver más
        </BotonEnlace>
      ) : null}

      {/* Regla del pulgar: la acción vive abajo, no en el tercio superior. */}
      <BarraInferior className="p-4">
        <BotonEnlace
          href="/catalogo/nuevo"
          variante="principal"
          className="mx-auto w-full max-w-2xl"
        >
          Nuevo producto
        </BotonEnlace>
      </BarraInferior>
    </main>
  );
}

function EstadoVacio({ acotado }: { acotado: boolean }) {
  // design-handoff.md § Interaction States: el catálogo vacío ofrece dar de alta el primero.
  return (
    <p className="mt-8 text-text-muted" data-testid="catalogo-vacio">
      {acotado
        ? "Ningún producto cumple lo que buscas. Quita algún filtro."
        : "Todavía no hay productos. Da de alta el primero para empezar a vender."}
    </p>
  );
}
