import Link from "next/link";
import { notFound } from "next/navigation";
import { categoriasExistentes } from "@/domain/catalogo";
import {
  ETIQUETA_MOVIMIENTO,
  libroDelProducto,
  type EventoDelProducto,
} from "@/domain/movimientos";
import { formatearPrecio } from "@/domain/moneda";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { SeccionPlegable } from "@/ui/seccion-plegable";
import { Cantidad, Existencias, Precio } from "@/ui/cifras";
import { Icono, type NombreDeIcono } from "@/ui/iconos";
import { cambiarEstado } from "./acciones";
import { FormularioAjuste } from "./ajuste";
import { FormularioEdicion } from "./edicion";

const cuando = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  // El libro se lee para reconstruir qué pasó y cuándo; en la zona del negocio, como todo lo demás.
  timeZone: ZONA_DEL_NEGOCIO,
});

/**
 * La ficha (`.diseno/cobalto/U-M-Ficha`, `U-D-Productos`). Se usa en dos sitios: como pantalla
 * propia —el celular, o un enlace directo— y como panel al lado de la lista en computador
 * (`/catalogo?ficha=…`). Así el celular nunca carga una lista que no se ve.
 *
 * El historial va **antes** que las acciones: se entra a esta pantalla a mirar (`T-013`).
 */
export async function FichaDelProducto({
  id,
  volver,
  aqui,
  enPanel = false,
}: {
  id: string;
  /** La lista de la que se vino, con sus filtros. */
  volver: string;
  /** Esta misma dirección: adónde vuelve «Cerrar» de una hoja. */
  aqui: string;
  enPanel?: boolean;
}) {
  const [libro, categorias] = await Promise.all([libroDelProducto(id), categoriasExistentes()]);
  if (!libro) notFound();
  const p = libro.producto;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        {enPanel ? (
          <>
            <p className="font-medium text-text-muted">{p.categoria ?? "Sin categoría"}</p>
            <Link
              href={volver}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-bg px-3.5 font-semibold text-text-muted"
            >
              <Icono nombre="cerrar" />
              Cerrar
            </Link>
          </>
        ) : (
          <Link
            href={volver}
            className="-ml-1 flex min-h-12 items-center gap-1.5 pr-3 font-semibold text-text-muted"
          >
            <Icono nombre="volver" />
            Productos
          </Link>
        )}
      </div>

      {/* El precio manda: es lo que se viene a comprobar (`T-024`, hallazgo 1). */}
      <section
        className={`flex flex-col ${enPanel ? "" : "rounded-card border border-border bg-surface p-5"}`}
      >
        <h1 className="text-2xl leading-tight font-semibold tracking-tight">{p.nombre}</h1>
        <Precio
          valor={p.precio}
          className="mt-3 text-5xl leading-none font-bold tracking-tight"
          data-testid="precio-ficha"
        />
        <span className="mt-3.5 flex flex-wrap gap-2">
          {p.activo ? (
            <Existencias cantidad={libro.saldoMaterializado} alertarEnCero />
          ) : (
            <span className="rounded-full bg-bg px-2.5 py-0.5 font-semibold text-text-muted">
              Ya no se vende
            </span>
          )}
        </span>
      </section>

      <div className="mt-3 flex flex-wrap gap-2">
        {enPanel ? null : <Ficha icono="categoria">{p.categoria ?? "Sin categoría"}</Ficha>}
        {p.codigoDeBarras ? <Ficha icono="escanear">{p.codigoDeBarras}</Ficha> : null}
      </div>

      {/* NFR-005: si la copia y el libro divergen, se dice. Un número que no cuadra y se calla es
          peor que uno que no cuadra y lo avisa. */}
      {!libro.cuadra ? (
        <div className="mt-4">
          <Aviso asertivo conBorde data-testid="no-cuadra">
            El conteo guardado dice {libro.saldoMaterializado} y el libro suma {libro.saldoDelLibro}.
            Manda el libro.
          </Aviso>
        </div>
      ) : null}

      <section className="mt-7" aria-labelledby="historial">
        <h2 id="historial" className="text-xl font-bold tracking-tight">
          Historial
        </h2>
        <p className="mb-3 text-text-muted">
          {libro.linea.length === 0
            ? "Todavía no ha pasado nada."
            : `${libro.movimientos.length} ${libro.movimientos.length === 1 ? "movimiento" : "movimientos"}, suman ${libro.saldoDelLibro}`}
        </p>
        {libro.linea.length > 0 ? (
          <ol
            className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
            data-testid="historial"
          >
            {libro.linea.map((e) => (
              <FilaDelHistorial key={e.id} evento={e} />
            ))}
          </ol>
        ) : null}
      </section>

      {/* Las acciones existen, pero detrás de una intención. Se entra a esta pantalla a mirar. */}
      <section className="mt-7" aria-labelledby="acciones">
        <h2 id="acciones" className="mb-3 text-xl font-bold tracking-tight">
          Acciones
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          <SeccionPlegable
            titulo="Corregir el conteo"
            descripcion="Cuenta y di por qué no cuadra."
            icono="contar"
            enGrupo
            hoja={{
              cerrar: aqui,
              subtitulo: `${p.nombre}. El sistema dice ${libro.saldoMaterializado}.`,
            }}
            data-testid="abrir-ajuste"
            abierta={!libro.cuadra}
          >
            <FormularioAjuste productoId={p.id} saldo={libro.saldoMaterializado} />
          </SeccionPlegable>

          <SeccionPlegable
            titulo="Editar los datos"
            descripcion="Nombre, precio, categoría y código."
            icono="editar"
            enGrupo
            data-testid="abrir-edicion"
          >
            <FormularioEdicion productoId={p.id} producto={p} categorias={categorias} />
          </SeccionPlegable>

          {/* Separado de editar a propósito: dejar de vender no es corregir un dato, es sacar algo
              de circulación. Es reversible y queda registrado, así que no pide confirmación. */}
          <SeccionPlegable
            titulo={p.activo ? "Dejar de vender" : "Devolver a la venta"}
            descripcion={
              p.activo
                ? "Sale de la cuadrícula y del catálogo. El historial se queda."
                : "Ya no se vende. Volverá a la cuadrícula y al catálogo."
            }
            icono="retirar"
            enGrupo
            data-testid="abrir-estado"
          >
            <form action={cambiarEstado.bind(null, p.id, !p.activo)}>
              <Boton type="submit" data-testid="cambiar-estado" className="w-full">
                {p.activo ? "Dejar de vender" : "Devolver a la venta"}
              </Boton>
            </form>
          </SeccionPlegable>
        </div>
      </section>
    </div>
  );
}

function Ficha({ icono, children }: { icono: NombreDeIcono; children: React.ReactNode }) {
  return (
    <span className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 font-medium tabular-nums">
      <Icono nombre={icono} className="size-4 text-text-muted" />
      {children}
    </span>
  );
}

/** Una sola línea de tiempo: el dueño pregunta qué le pasó al producto, no de qué bitácora salió. */
function FilaDelHistorial({ evento: e }: { evento: EventoDelProducto }) {
  const pie = `${cuando.format(e.cuando)} · ${e.quien}`;

  if (e.clase === "precio") {
    return (
      <Fila icono="editar" titulo="Cambio de precio" testid="evento-precio">
        <span className="block">
          De {formatearPrecio(e.anterior)} a {formatearPrecio(e.nuevo)}
        </span>
        <span className="block text-text-muted">{pie}</span>
      </Fila>
    );
  }

  if (e.clase === "activacion") {
    return (
      <Fila
        icono="retirar"
        titulo={e.activo ? "Volvió a la venta" : "Dejó de venderse"}
        testid="evento-activacion"
      >
        <span className="block text-text-muted">{pie}</span>
      </Fila>
    );
  }

  const suma = e.cantidad > 0;
  const cifra = (
    <Cantidad
      valor={e.cantidad}
      conSigno
      className={`text-lg font-bold ${suma ? "text-accent" : "text-danger"}`}
    />
  );
  const icono: NombreDeIcono =
    e.tipo === "sale" || e.tipo === "sale_void" ? "ventas" : e.tipo === "adjustment" ? "contar" : "productos";

  return (
    <Fila
      icono={icono}
      titulo={ETIQUETA_MOVIMIENTO[e.tipo]}
      testid={`movimiento-${e.tipo}`}
      cifra={cifra}
      href={e.ventaId ? `/ventas/${e.ventaId}` : undefined}
    >
      <span className="block text-text-muted">{pie}</span>
      {e.motivo ? <span className="block">{e.motivo}</span> : null}
    </Fila>
  );
}

function Fila({
  icono,
  titulo,
  testid,
  cifra,
  href,
  children,
}: {
  icono: NombreDeIcono;
  titulo: string;
  testid: string;
  cifra?: React.ReactNode;
  href?: string | undefined;
  children: React.ReactNode;
}) {
  const cuerpo = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-text-muted">
        <Icono nombre={icono} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{titulo}</span>
        {children}
      </span>
      {cifra}
    </>
  );
  return (
    <li data-testid={testid}>
      {href ? (
        <Link
          href={href}
          className="flex min-h-16 items-center gap-3 px-4 py-3"
          data-testid="de-una-venta"
        >
          {cuerpo}
          <Icono nombre="siguiente" className="text-text-muted" />
          <span className="sr-only">Ver la venta</span>
        </Link>
      ) : (
        <div className="flex min-h-16 items-center gap-3 px-4 py-3">{cuerpo}</div>
      )}
    </li>
  );
}
