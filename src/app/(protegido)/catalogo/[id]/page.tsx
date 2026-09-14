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
import { cambiarEstado } from "./acciones";
import { FormularioAjuste } from "./ajuste";
import { FormularioEdicion } from "./edicion";

export const dynamic = "force-dynamic";

const cuando = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  // El libro se lee para reconstruir qué pasó y cuándo; en la zona del negocio, como todo lo demás.
  timeZone: ZONA_DEL_NEGOCIO,
});

export default async function HistorialDeProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [libro, categorias] = await Promise.all([libroDelProducto(id), categoriasExistentes()]);
  if (!libro) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/catalogo" className="text-text-muted underline">
        Volver al catálogo
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{libro.producto.nombre}</h1>
      <p className="mt-1 flex items-baseline gap-3">
        <Precio valor={libro.producto.precio} className="font-medium" />
        <Existencias cantidad={libro.saldoMaterializado} />
        {!libro.producto.activo ? <span className="text-text-muted">· desactivado</span> : null}
      </p>

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

      <section className="mt-8" aria-labelledby="historial">
        <h2 id="historial" className="text-lg font-medium">
          Historial
        </h2>
        <p className="mt-1 text-text-muted">
          {libro.linea.length === 0
            ? "Todavía no ha pasado nada."
            : `${libro.movimientos.length} movimientos · suman ${libro.saldoDelLibro}`}
        </p>

        {libro.linea.length > 0 ? (
          <ol className="mt-4 flex flex-col gap-2" data-testid="historial">
            {libro.linea.map((e) => (
              <FilaDelHistorial key={e.id} evento={e} />
            ))}
          </ol>
        ) : null}
      </section>

      {/* Las acciones existen, pero detrás de una intención. Se entra a esta pantalla a mirar. */}
      <section className="mt-10 flex flex-col gap-3" aria-labelledby="acciones">
        <h2 id="acciones" className="text-lg font-medium">
          Acciones
        </h2>

        <SeccionPlegable
          titulo="Corregir el conteo"
          descripcion="Cuenta lo que hay en el estante y di por qué no cuadra."
          data-testid="abrir-ajuste"
          abierta={!libro.cuadra}
        >
          <FormularioAjuste productoId={libro.producto.id} />
        </SeccionPlegable>

        <SeccionPlegable
          titulo="Editar los datos"
          descripcion="Nombre, precio, categoría y código de barras."
          data-testid="abrir-edicion"
        >
          <FormularioEdicion
            productoId={libro.producto.id}
            producto={libro.producto}
            categorias={categorias}
          />
        </SeccionPlegable>

        {/* Separado de editar a propósito: retirar no es corregir un dato, es sacar algo de
            circulación. Es reversible y queda registrado, así que no pide confirmación. */}
        <SeccionPlegable
          titulo={libro.producto.activo ? "Retirar de la venta" : "Devolver a la venta"}
          descripcion={
            libro.producto.activo
              ? "Deja de aparecer en la cuadrícula y en el catálogo. Su historial se conserva."
              : "Está retirado. Volverá a aparecer en la cuadrícula y en el catálogo."
          }
          data-testid="abrir-estado"
        >
          <form action={cambiarEstado.bind(null, libro.producto.id, !libro.producto.activo)}>
            <Boton type="submit" data-testid="cambiar-estado" className="w-full">
              {libro.producto.activo ? "Retirar de la venta" : "Devolver a la venta"}
            </Boton>
          </form>
        </SeccionPlegable>
      </section>
    </main>
  );
}

/** Una sola línea de tiempo: el dueño pregunta qué le pasó al producto, no de qué bitácora salió. */
function FilaDelHistorial({ evento: e }: { evento: EventoDelProducto }) {
  const marco = "rounded-card border border-border bg-surface p-4";
  const pie = (
    <span className="mt-1 block text-text-muted">
      {cuando.format(e.cuando)} · {e.quien}
    </span>
  );

  if (e.clase === "precio") {
    return (
      <li data-tarjeta className={marco} data-testid="evento-precio">
        <span className="font-medium">Cambio de precio</span>
        <span className="mt-1 block">
          De {formatearPrecio(e.anterior)} a {formatearPrecio(e.nuevo)}
        </span>
        {pie}
      </li>
    );
  }

  if (e.clase === "activacion") {
    return (
      <li data-tarjeta className={marco} data-testid="evento-activacion">
        <span className="font-medium">
          {e.activo ? "Devuelto a la venta" : "Retirado de la venta"}
        </span>
        {pie}
      </li>
    );
  }

  const suma = e.cantidad > 0;
  return (
    <li data-tarjeta className={marco} data-testid={`movimiento-${e.tipo}`}>
      <span className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{ETIQUETA_MOVIMIENTO[e.tipo]}</span>
        <Cantidad
          valor={e.cantidad}
          conSigno
          className={`font-medium ${suma ? "" : "text-danger"}`}
        />
      </span>
      {pie}
      {e.motivo ? <span className="mt-1 block">{e.motivo}</span> : null}
      {e.ventaId ? (
        <Link
          href={`/ventas/${e.ventaId}`}
          className="mt-1 block text-text-muted underline"
          data-testid="de-una-venta"
        >
          Ver la venta
        </Link>
      ) : null}
    </li>
  );
}
