import { comoDireccion, type FiltrosCatalogo } from "@/domain/filtros";
import { Boton, BotonEnlace } from "@/ui/boton";
import { CerrarDetalles } from "@/ui/cerrar-detalles";
import { Campo } from "@/ui/campo";
import { Icono } from "@/ui/iconos";
import { Interruptor, Opciones } from "@/ui/opciones";
import { BuscadorPorCodigo } from "./buscador-por-codigo";

const EXISTENCIAS = [
  { valor: "todos", texto: "Todas" },
  { valor: "disponibles", texto: "Hay" },
  { valor: "por-reponer", texto: "Por reponer" },
  { valor: "agotados", texto: "Agotados" },
  { valor: "negativos", texto: "En negativo" },
] as const;

/** Cuántos filtros hay puestos, sin contar la búsqueda: lo que dice el botón «Filtros». */
function activos(f: FiltrosCatalogo): number {
  return (
    (f.categoria ? 1 : 0) +
    (f.existencias !== "todos" ? 1 : 0) +
    (f.desde !== null || f.hasta !== null ? 1 : 0) +
    (f.incluirDesactivados ? 1 : 0)
  );
}

/**
 * Un formulario `GET`, no una acción de cliente: acotar tiene que funcionar con la red a medias, y
 * el resultado tiene que quedar en la dirección para poder compartirlo (`AC-018`).
 *
 * Los filtros viven en un `<details>`, que se abre y se cierra sin JavaScript. Abierto, en el
 * celular es una hoja que sube desde abajo, y en computador un panel a la derecha
 * (`.diseno/cobalto/F-M-Filtros`, `F-D-Filtros`). Cerrarlo es volver a la misma dirección: el
 * `<details>` no se abre solo, así que la página vuelve con él cerrado.
 */
export function Filtros({
  filtros,
  categorias,
  volverA,
}: {
  filtros: FiltrosCatalogo;
  categorias: string[];
  /** Adónde vuelve «Cerrar». Por defecto, la misma lista; con una ficha abierta al lado, la ficha. */
  volverA?: string;
}) {
  const n = activos(filtros);
  const aqui = volverA ?? comoDireccion(filtros);

  return (
    <form className="mt-4 flex flex-col gap-2" role="search">
      <Campo
        etiqueta="Buscar en el catálogo"
        etiquetaOculta
        nombre="q"
        type="search"
        defaultValue={filtros.busqueda ?? ""}
        placeholder="Nombre o código"
        icono="buscar"
        cola={
          <Boton type="submit" variante="secundario" className="min-h-10 border-0 px-3 text-accent">
            Buscar
          </Boton>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:flex">
        <div className="flex flex-wrap gap-2 [&>div]:flex-1 [&_button]:w-full lg:[&_button]:w-auto">
          <BuscadorPorCodigo />
        </div>

        <details className="group lg:relative">
          <summary
            className="flex min-h-12 cursor-pointer list-none items-center justify-center gap-2 rounded-button border border-border-strong bg-surface px-4 font-semibold [&::-webkit-details-marker]:hidden"
            data-testid="abrir-filtros"
          >
            <Icono nombre="filtros" />
            Filtros
            {n ? (
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-sm font-bold text-accent-text tabular-nums">
                {n}
              </span>
            ) : null}
          </summary>

          {/* El velo del celular: tocar fuera cierra, que es volver a la misma dirección. */}
          <CerrarDetalles
            href={aqui}
            aria-label="Cerrar los filtros"
            // En computador, transparente: tocar fuera del panel también lo cierra.
            className="fixed inset-0 z-40 bg-text/40 lg:bg-transparent"
            conEsc
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-5 overflow-y-auto rounded-t-card bg-surface px-4 pt-2 pb-5 lg:absolute lg:inset-x-auto lg:right-0 lg:bottom-auto lg:mt-2 lg:w-110 lg:rounded-card lg:border lg:border-border lg:p-7 lg:shadow-[0_24px_48px_rgba(15,20,25,0.16)]">
            <span className="h-1 w-10 self-center rounded-full bg-border lg:hidden" />
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Filtros</h2>
              <CerrarDetalles
                href={aqui}
                className="flex min-h-12 items-center gap-1.5 px-1 font-semibold text-accent"
              >
                <Icono nombre="cerrar" />
                Cerrar
              </CerrarDetalles>
            </div>

            <Opciones
              etiqueta="Existencias"
              nombre="existencias"
              opciones={EXISTENCIAS}
              elegida={filtros.existencias}
            />
            <Opciones
              etiqueta="Categoría"
              nombre="categoria"
              opciones={[{ valor: "", texto: "Todas" }, ...categorias.map((c) => ({ valor: c, texto: c }))]}
              elegida={filtros.categoria ?? ""}
            />

            <fieldset className="min-w-0">
              <legend className="mb-2.5 text-lg font-bold">Precio</legend>
              <div className="grid grid-cols-2 gap-3">
                <Campo
                  etiqueta="Precio desde"
                  etiquetaOculta
                  nombre="desde"
                  inputMode="numeric"
                  prefijo="$"
                  placeholder="Desde"
                  defaultValue={filtros.desde ?? ""}
                />
                <Campo
                  etiqueta="Precio hasta"
                  etiquetaOculta
                  nombre="hasta"
                  inputMode="numeric"
                  prefijo="$"
                  placeholder="Hasta"
                  defaultValue={filtros.hasta ?? ""}
                />
              </div>
            </fieldset>

            <Interruptor
              etiqueta="Incluir los que ya no se venden"
              ayuda="Aparecen marcados."
              nombre="desactivados"
              marcado={filtros.incluirDesactivados}
            />

            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <BotonEnlace href="/catalogo" data-testid="limpiar-filtros">
                Limpiar
              </BotonEnlace>
              <Boton type="submit" variante="principal" tamano="alto">
                Ver productos
              </Boton>
            </div>
          </div>
        </details>
      </div>
    </form>
  );
}
