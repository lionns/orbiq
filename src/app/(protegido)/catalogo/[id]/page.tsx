import { comoDireccion, leerFiltros, type ParametrosCrudos } from "@/domain/filtros";
import { conDesde, volverA } from "@/domain/volver";
import { FichaDelProducto } from "./ficha";

export const dynamic = "force-dynamic";

/** La ficha como pantalla propia. */
export default async function PaginaDeLaFicha({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParametrosCrudos & { desde?: string | string[] }>;
}) {
  const [{ id }, crudos] = await Promise.all([params, searchParams]);
  const lista = comoDireccion(leerFiltros(crudos));
  // Se vuelve a donde se estaba: Inicio, una venta, o la lista con sus filtros (`T-036`).
  const volver = volverA(crudos.desde, { href: lista, texto: "Productos" });
  // Esta misma dirección, con su origen: una venta abierta desde aquí vuelve aquí, y de aquí
  // se sigue volviendo al origen.
  const aqui = conDesde(
    `/catalogo/${id}${lista.slice("/catalogo".length)}`,
    volver.href === lista ? null : volver.href,
  );
  return (
    <main className="mx-auto max-w-2xl px-4 pt-1 pb-6 lg:pt-8">
      <FichaDelProducto id={id} volver={volver.href} textoVolver={volver.texto} aqui={aqui} />
    </main>
  );
}

