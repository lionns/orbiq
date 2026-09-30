import Link from "next/link";
import { categoriasExistentes, listarCatalogo, type ProductoDelCatalogo } from "@/domain/catalogo";
import { comoDireccion, hayFiltros, siguienteTanda, type FiltrosCatalogo } from "@/domain/filtros";
import { puede } from "@/domain/permisos";
import { aQuienAvisar } from "@/domain/personas";
import { BotonEnlace } from "@/ui/boton";
import { Existencias, Precio } from "@/ui/cifras";
import { Icono } from "@/ui/iconos";
import { sesionDeLaPeticion } from "../sesion";
import { Filtros } from "./filtros";

/** La lista con un panel abierto al lado (computador): la ficha de un producto o el alta. */
export function enPanel(filtros: FiltrosCatalogo, clave: "ficha" | "nuevo", valor: string): string {
  const direccion = comoDireccion(filtros);
  return `${direccion}${direccion.includes("?") ? "&" : "?"}${clave}=${encodeURIComponent(valor)}`;
}

/** La consulta de la lista, para que los enlaces a una ficha no la pierdan. */
function consulta(filtros: FiltrosCatalogo): string {
  const direccion = comoDireccion(filtros);
  const i = direccion.indexOf("?");
  return i === -1 ? "" : direccion.slice(i);
}

/**
 * Productos: la búsqueda, los filtros y la lista (`.diseno/cobalto/U-M-Productos`, `U-D-Productos`).
 *
 * Es un componente y no solo la página porque en computador la ficha y el alta se abren **al lado**
 * de la lista, en su misma pantalla; en el celular cada una sigue siendo su propia pantalla.
 */
export async function PantallaDeProductos({
  filtros,
  seleccionado,
  volverA,
}: {
  filtros: FiltrosCatalogo;
  /** La ficha abierta al lado, para marcarla en la lista. */
  seleccionado?: string;
  volverA?: string;
}) {
  const [{ productos, total, hayMas }, categorias, sesion] = await Promise.all([
    listarCatalogo(filtros),
    categoriasExistentes(),
    sesionDeLaPeticion(),
  ]);
  // Dar de alta es del dueño (`D-013`); a un empleado, un código desconocido le dice a quién avisar.
  const darDeAlta = puede(sesion?.rol, "editarProducto");
  const dueno = darDeAlta ? "" : await aQuienAvisar();
  const acotado = hayFiltros(filtros);
  const q = consulta(filtros);

  return (
    <div className="px-4 pt-4 pb-6 lg:px-12 lg:pt-10">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Productos</h1>
        {/* «Nuevo producto» es una acción, no un lugar: vive aquí y en Inicio, no en el menú
            (`.diseno/cobalto`, punto 10). */}
        {/* Dos enlaces y no uno: en el celular el alta es su propia pantalla; en computador se abre
            al lado de la lista, sin cargar otra. Solo se ve uno a la vez. */}
        {darDeAlta ? (
          <>
            <BotonEnlace href={`/catalogo/nuevo${q}`} variante="principal" className="px-4 lg:hidden">
              <Icono nombre="nuevo" />
              Nuevo
            </BotonEnlace>
            <BotonEnlace
              href={enPanel(filtros, "nuevo", "1")}
              variante="principal"
              className="px-4 max-lg:hidden"
            >
              <Icono nombre="nuevo" />
              Nuevo producto
            </BotonEnlace>
          </>
        ) : null}
      </div>

      <Filtros
        filtros={filtros}
        categorias={categorias}
        volverA={volverA}
        total={total}
        darDeAlta={darDeAlta}
        dueno={dueno}
      />

      <div className="mt-3 mb-1 flex min-h-12 items-center justify-between gap-3">
        <p className="font-medium text-text-muted" data-testid="conteo">
          {total === 0 ? "Ningún producto" : total === 1 ? "1 producto" : `${total} productos`}
          {productos.length < total ? `, se ven ${productos.length}` : ""}
        </p>
        {/* `.diseno/etiquetas/Etiquetas-1-Entrada`: al lado del conteo, porque se eligen desde aquí
            con la misma búsqueda (`D-012`). */}
        <Link
          href="/catalogo/etiquetas"
          className="flex min-h-12 shrink-0 items-center gap-1.5 font-semibold text-accent"
          data-testid="ir-a-etiquetas"
        >
          <Icono nombre="imprimir" />
          Imprimir etiquetas
        </Link>
      </div>

      {productos.length === 0 ? (
        <EstadoVacio acotado={acotado} />
      ) : (
        // Una sola tarjeta con filas y no una tarjeta por producto: la lista se lee como un objeto
        // y no como veinte bordes. Por eso la marca de tarjeta va en la lista y no en cada fila.
        <ul
          className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
          data-testid="lista-catalogo"
          data-tarjeta
        >
          {productos.map((p) => (
            <li key={p.id}>
              {/* Igual que «Nuevo»: la ficha es su pantalla en el celular y un panel en computador. */}
              <FilaDeProducto
                producto={p}
                href={`/catalogo/${p.id}${q}`}
                elegido={false}
                className="lg:hidden"
              />
              <FilaDeProducto
                producto={p}
                href={enPanel(filtros, "ficha", p.id)}
                elegido={p.id === seleccionado}
                className="max-lg:hidden"
              />
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
    </div>
  );
}

function FilaDeProducto({
  producto: p,
  href,
  elegido,
  className,
}: {
  producto: ProductoDelCatalogo;
  href: string;
  elegido: boolean;
  className: string;
}) {
  return (
    <Link
      href={href}
      aria-current={elegido ? "page" : undefined}
      className={`flex min-h-18 items-center gap-3 py-2.5 pr-3 pl-4 lg:px-5 ${elegido ? "bg-accent-soft" : ""} ${className}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-semibold">{p.nombre}</span>
        <span className="flex min-w-0 items-center gap-2">
          {p.activo ? (
            <Existencias cantidad={p.existencias} alertarEnCero className="shrink-0" />
          ) : (
            <span className="shrink-0 rounded-full bg-bg px-2.5 py-0.5 font-semibold text-text-muted">
              Ya no se vende
            </span>
          )}
          <span className="truncate text-text-muted">
            {p.categoria ?? "Sin categoría"}
          </span>
        </span>
      </span>
      <Precio valor={p.precio} className="shrink-0 text-lg font-bold" />
      <Icono nombre="siguiente" className="text-text-muted" />
    </Link>
  );
}

function EstadoVacio({ acotado }: { acotado: boolean }) {
  // design-handoff.md § Interaction States: el catálogo vacío ofrece dar de alta el primero.
  return (
    <p className="mt-6 text-text-muted" data-testid="catalogo-vacio">
      {acotado
        ? "Ningún producto cumple lo que buscas. Quita algún filtro."
        : "Todavía no hay productos. Da de alta el primero para empezar a vender."}
    </p>
  );
}
