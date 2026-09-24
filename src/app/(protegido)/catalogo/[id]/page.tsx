import { comoDireccion, leerFiltros, type ParametrosCrudos } from "@/domain/filtros";
import { FichaDelProducto } from "./ficha";

export const dynamic = "force-dynamic";

/** La ficha como pantalla propia. */
export default async function PaginaDeLaFicha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParametrosCrudos>;
}) {
  const [{ id }, crudos] = await Promise.all([params, searchParams]);
  const lista = comoDireccion(leerFiltros(crudos));
  const aqui = `/catalogo/${id}${lista.slice("/catalogo".length)}`;
  return (
    <main className="mx-auto max-w-2xl px-4 pt-1 pb-6 lg:pt-8">
      <FichaDelProducto id={id} volver={lista} aqui={aqui} />
    </main>
  );
}

