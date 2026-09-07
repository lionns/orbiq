import Link from "next/link";
import { ESTADOS, type FiltrosCatalogo } from "@/domain/filtros";

const ETIQUETA: Record<(typeof ESTADOS)[number], string> = {
  todos: "Todas",
  disponibles: "Con existencias",
  agotados: "Agotados",
  negativos: "En negativo",
};

const claseCampo =
  "min-h-12 rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] px-3";

/**
 * Un formulario `GET`, no una acción de cliente: acotar tiene que funcionar con la red a medias, y
 * el resultado tiene que quedar en la dirección para poder compartirlo (`AC-018`).
 *
 * Va dentro de un `<details>` que se abre solo cuando ya hay algo acotado. En un celular, cinco
 * campos abiertos siempre empujarían la lista fuera de la pantalla.
 */
export function Filtros({
  filtros,
  categorias,
  acotado,
}: {
  filtros: FiltrosCatalogo;
  categorias: string[];
  acotado: boolean;
}) {
  return (
    <form className="mt-4" role="search">
      <div className="flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={filtros.busqueda ?? ""}
          placeholder="Nombre o código"
          aria-label="Buscar en el catálogo"
          className={`${claseCampo} flex-1`}
        />
        <button type="submit" className={claseCampo}>
          Buscar
        </button>
      </div>

      <details open={acotado} className="mt-3">
        <summary className="min-h-12 cursor-pointer list-none py-3 underline">
          Filtros{acotado ? " (activos)" : ""}
        </summary>

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex flex-col gap-1">
            <span className="text-[color:var(--color-text-muted)]">Categoría</span>
            <select name="categoria" defaultValue={filtros.categoria ?? ""} className={claseCampo}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[color:var(--color-text-muted)]">Existencias</span>
            <select name="existencias" defaultValue={filtros.existencias} className={claseCampo}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA[e]}
                </option>
              ))}
            </select>
          </label>

          {/* `min-w-0`: el estilo de fábrica de `fieldset` es `min-inline-size: min-content`, que
              le impide encoger y desborda la pantalla a 360 px. Y el `flex` va en un hijo, porque
              una `legend` dentro de un contenedor flex no se coloca donde uno espera. */}
          <fieldset className="min-w-0">
            <legend className="text-[color:var(--color-text-muted)]">Precio</legend>
            <div className="flex gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="sr-only">Precio desde</span>
                <input
                  name="desde"
                  inputMode="numeric"
                  placeholder="Desde"
                  defaultValue={filtros.desde ?? ""}
                  className={`${claseCampo} w-full`}
                />
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="sr-only">Precio hasta</span>
                <input
                  name="hasta"
                  inputMode="numeric"
                  placeholder="Hasta"
                  defaultValue={filtros.hasta ?? ""}
                  className={`${claseCampo} w-full`}
                />
              </label>
            </div>
          </fieldset>

          <div className="flex gap-2">
            <button
              type="submit"
              className={`${claseCampo} flex-1 bg-[color:var(--color-accent)] font-medium text-[color:var(--color-accent-text)]`}
            >
              Aplicar
            </button>
            {acotado ? (
              <Link
                href="/catalogo"
                data-testid="limpiar-filtros"
                className={`${claseCampo} flex items-center justify-center`}
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </div>
      </details>
    </form>
  );
}
