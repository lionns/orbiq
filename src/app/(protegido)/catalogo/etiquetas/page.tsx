import Link from "next/link";
import { buscarParaEtiquetas, categoriasExistentes, productosMarcados } from "@/domain/catalogo";
import { cola } from "@/domain/codigos";
import { alternar, leerMarcados } from "@/domain/etiquetas";
import { leerFiltros, type FiltrosCatalogo, type ParametrosCrudos } from "@/domain/filtros";
import { BarraInferior } from "@/ui/barra-inferior";
import { BotonEnlace } from "@/ui/boton";
import { Existencias, Precio } from "@/ui/cifras";
import { Icono } from "@/ui/iconos";

export const dynamic = "force-dynamic";

/** Esta pantalla con otra búsqueda o con otros marcados. Lo marcado viaja siempre en `m`. */
function direccion(f: Pick<FiltrosCatalogo, "busqueda" | "categoria">, marcados: readonly string[]) {
  const p = new URLSearchParams();
  if (f.busqueda) p.set("q", f.busqueda);
  if (f.categoria) p.set("categoria", f.categoria);
  if (marcados.length) p.set("m", marcados.join(","));
  const texto = p.toString();
  return texto ? `/catalogo/etiquetas?${texto}` : "/catalogo/etiquetas";
}

/**
 * Elegir qué etiquetar (`.diseno/etiquetas/Etiquetas-2-Buscar`). Se busca como en Productos —nombre,
 * código o categoría—, se marca, y se vuelve a buscar: lo marcado vive en la dirección, así que otra
 * búsqueda no lo borra. Con cientos de productos no hay lista que recorrer, hay una búsqueda.
 */
export default async function ElegirEtiquetas({
  searchParams,
}: {
  searchParams: Promise<ParametrosCrudos & { m?: string | string[] }>;
}) {
  const crudos = await searchParams;
  const filtros = leerFiltros(crudos);
  const marcados = leerMarcados(crudos.m);
  const [{ productos, hayMas }, categorias, elegidos] = await Promise.all([
    buscarParaEtiquetas(filtros),
    categoriasExistentes(),
    productosMarcados(marcados),
  ]);
  const buscando = Boolean(filtros.busqueda || filtros.categoria);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-1 pb-40 lg:pt-8 lg:pb-8">
      <div className="flex min-h-12 items-center justify-between">
        <Link href="/catalogo" className="font-semibold text-accent">
          Cancelar
        </Link>
        <h1 className="font-bold">Imprimir etiquetas</h1>
        <span className="w-16" />
      </div>

      <form action="/catalogo/etiquetas" className="mt-3 flex flex-col gap-2">
        {marcados.length ? <input type="hidden" name="m" value={marcados.join(",")} /> : null}
        <label className="flex min-h-13 items-center gap-3 rounded-button border border-border-strong bg-surface px-4 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft" data-control>
          <Icono nombre="buscar" className="text-text-muted" />
          <span className="sr-only">Buscar por nombre o código</span>
          <input
            name="q"
            type="search"
            defaultValue={filtros.busqueda ?? ""}
            placeholder="Nombre o código"
            className="min-w-0 flex-1 bg-transparent text-lg outline-none"
            data-testid="buscar-etiquetas"
          />
        </label>
        <div className="flex gap-2">
          <label
            className="flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-button border border-border-strong bg-surface px-3 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft"
            data-control
          >
            <Icono nombre="categoria" className="text-text-muted" />
            <span className="sr-only">Categoría</span>
            <select
              name="categoria"
              defaultValue={filtros.categoria ?? ""}
              className="min-w-0 flex-1 bg-transparent font-medium outline-none"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex min-h-12 items-center gap-2 rounded-button border border-accent bg-accent-soft px-4 font-semibold active:translate-y-px"
          >
            <Icono nombre="buscar" />
            Buscar
          </button>
        </div>
      </form>

      <p className="mt-4 mb-2 flex items-center gap-2 font-medium text-text-muted" data-testid="conteo-etiquetas">
        <Icono nombre="escanear" className="text-accent" />
        {productos.length === 0
          ? buscando
            ? "Nada con código de la tienda cumple la búsqueda."
            : "Ningún producto tiene código de la tienda todavía."
          : `${productos.length}${hayMas ? "+" : ""} con código de la tienda${hayMas ? ". Afina la búsqueda para ver el resto." : ""}`}
      </p>

      {productos.length === 0 && !buscando ? (
        <p className="text-text-muted">
          Se genera desde la ficha de un producto sin código, con «Generar código».
        </p>
      ) : null}

      {productos.length > 0 ? (
        <ul
          className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
          data-testid="resultados-etiquetas"
        >
          {productos.map((p) => {
            const marcado = marcados.includes(p.id);
            return (
              <li key={p.id}>
                {/* Un enlace y no una casilla de formulario: marcar cambia la dirección, y así lo
                    marcado sobrevive a la siguiente búsqueda sin JavaScript (`AC-018`). */}
                <Link
                  href={direccion(filtros, alternar(marcados, p.id))}
                  scroll={false}
                  replace
                  aria-pressed={marcado}
                  className="flex min-h-18 items-center gap-3.5 py-2.5 pr-3 pl-4"
                  data-testid="marcar-etiqueta"
                >
                  <span
                    className={`grid size-6.5 shrink-0 place-items-center rounded-lg ${
                      marcado ? "bg-accent text-accent-text" : "border-2 border-border-strong"
                    }`}
                  >
                    {marcado ? <Icono nombre="cobrar" className="size-4" /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate font-semibold">{p.nombre}</span>
                    <span className="flex min-w-0 items-center gap-2">
                      <Existencias cantidad={p.existencias} className="shrink-0" />
                      <span className="truncate text-text-muted tabular-nums">{cola(p.codigo)}</span>
                    </span>
                  </span>
                  <Precio valor={p.precio} className="shrink-0 text-lg font-bold" />
                  <span className="sr-only">{marcado ? "Marcado. Tocar para quitarlo" : "Tocar para marcarlo"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      <BarraInferior className="p-4 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <p className="flex justify-between gap-3 text-text-muted" data-testid="marcados">
            <span className="shrink-0 tabular-nums">
              {elegidos.length === 0
                ? "Ninguno marcado"
                : elegidos.length === 1
                  ? "1 producto marcado"
                  : `${elegidos.length} productos marcados`}
            </span>
            <span className="truncate">{elegidos.map((p) => p.nombre).join(", ")}</span>
          </p>
          {elegidos.length > 0 ? (
            <BotonEnlace
              href={`/catalogo/etiquetas/cuantas?m=${elegidos.map((p) => p.id).join(",")}`}
              variante="principal"
              tamano="alto"
              className="w-full text-lg"
              data-testid="siguiente-etiquetas"
            >
              Siguiente
              <Icono nombre="siguiente" />
            </BotonEnlace>
          ) : (
            <span className="grid min-h-14 place-items-center rounded-button bg-bg font-semibold text-text-muted">
              Marca lo que quieres etiquetar
            </span>
          )}
        </div>
      </BarraInferior>
    </main>
  );
}
