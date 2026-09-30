import { categoriasExistentes } from "@/domain/catalogo";
import { comoDireccion, leerFiltros, type ParametrosCrudos } from "@/domain/filtros";
import { puede } from "@/domain/permisos";
import { sesionDeLaPeticion } from "../sesion";
import { FichaDelProducto } from "./[id]/ficha";
import { PantallaDeProductos, enPanel } from "./lista";
import { FormularioProducto } from "./nuevo/formulario";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Productos. En computador, la ficha o el alta se abren **al lado** de la lista
 * (`.diseno/cobalto/U-D-Productos`, `F-D-Nuevo`): la dirección lleva `ficha=` o `nuevo=1` y la
 * lista conserva sus filtros. En el celular esos enlaces no existen —la ficha y el alta son su
 * propia pantalla—, así que el panel solo se dibuja a partir de 1024 px.
 */
export default async function Catalogo({
  searchParams,
}: {
  searchParams: Promise<ParametrosCrudos & { ficha?: string; nuevo?: string }>;
}) {
  const crudos = await searchParams;
  const filtros = leerFiltros(crudos);
  const lista = comoDireccion(filtros);
  const ficha = typeof crudos.ficha === "string" && UUID.test(crudos.ficha) ? crudos.ficha : null;
  const alta = !ficha && crudos.nuevo === "1" && puede((await sesionDeLaPeticion())?.rol, "editarProducto");
  const aqui = ficha ? enPanel(filtros, "ficha", ficha) : alta ? enPanel(filtros, "nuevo", "1") : lista;

  return (
    <div className="mx-auto max-w-7xl lg:flex lg:items-start">
      <main className="min-w-0 flex-1">
        <PantallaDeProductos filtros={filtros} seleccionado={ficha ?? undefined} volverA={aqui} />
      </main>
      {ficha ? (
        <aside className={PANEL} aria-label="Ficha del producto">
          <FichaDelProducto id={ficha} volver={lista} aqui={aqui} enPanel />
        </aside>
      ) : null}
      {alta ? (
        <aside className={PANEL} aria-label="Nuevo producto">
          <h2 className="text-2xl font-bold tracking-tight">Nuevo producto</h2>
          <FormularioProducto categorias={await categoriasExistentes()} cancelar={lista} />
        </aside>
      ) : null}
    </div>
  );
}

const PANEL =
  "hidden lg:sticky lg:top-6 lg:m-6 lg:block lg:max-h-[calc(100dvh-3rem)] lg:w-110 lg:shrink-0 lg:overflow-y-auto lg:rounded-card lg:border lg:border-border lg:bg-surface lg:p-7";
