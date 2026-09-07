import { ESTADOS, type FiltrosCatalogo } from "@/domain/filtros";
import { Boton, BotonEnlace } from "@/ui/boton";
import { Campo, CLASE_CONTROL } from "@/ui/campo";

const ETIQUETA: Record<(typeof ESTADOS)[number], string> = {
  todos: "Todas",
  disponibles: "Con existencias",
  agotados: "Agotados",
  negativos: "En negativo",
};

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
          className={CLASE_CONTROL}
        />
        <Boton type="submit" className="shrink-0">
          Buscar
        </Boton>
      </div>

      <details open={acotado} className="mt-3">
        <summary className="min-h-12 cursor-pointer list-none py-3 underline">
          Filtros{acotado ? " (activos)" : ""}
        </summary>

        <div className="flex flex-col gap-3 pt-1">
          <Campo etiqueta="Categoría" nombre="categoria">
            <select name="categoria" defaultValue={filtros.categoria ?? ""} className={CLASE_CONTROL}>
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Existencias" nombre="existencias">
            <select name="existencias" defaultValue={filtros.existencias} className={CLASE_CONTROL}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA[e]}
                </option>
              ))}
            </select>
          </Campo>

          {/* `min-w-0`: el estilo de fábrica de `fieldset` es `min-inline-size: min-content`, que
              le impide encoger y desborda la pantalla a 360 px. Y el `flex` va en un hijo, porque
              una `legend` dentro de un contenedor flex no se coloca donde uno espera. */}
          <fieldset className="min-w-0">
            <legend className="text-[color:var(--color-text-muted)]">Precio</legend>
            <div className="flex gap-2">
              <Campo
                etiqueta="Precio desde"
                nombre="desde"
                etiquetaOculta
                inputMode="numeric"
                placeholder="Desde"
                defaultValue={filtros.desde ?? ""}
              />
              <Campo
                etiqueta="Precio hasta"
                nombre="hasta"
                etiquetaOculta
                inputMode="numeric"
                placeholder="Hasta"
                defaultValue={filtros.hasta ?? ""}
              />
            </div>
          </fieldset>

          <div className="flex gap-2">
            <Boton type="submit" variante="principal" className="flex-1">
              Aplicar
            </Boton>
            {acotado ? (
              <BotonEnlace href="/catalogo" data-testid="limpiar-filtros">
                Limpiar
              </BotonEnlace>
            ) : null}
          </div>
        </div>
      </details>
    </form>
  );
}
