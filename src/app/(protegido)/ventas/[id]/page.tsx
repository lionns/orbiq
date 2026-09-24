import Link from "next/link";
import { notFound } from "next/navigation";
import { detalleDeVenta } from "@/domain/venta";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Aviso } from "@/ui/aviso";
import { Precio } from "@/ui/cifras";
import { Icono } from "@/ui/iconos";
import { SeccionPlegable } from "@/ui/seccion-plegable";
import { BotonAnular } from "./anulacion";

export const dynamic = "force-dynamic";

// En la zona del negocio: sin esto, la misma venta se fechaba aquí y en el listado con relojes
// distintos, y el detalle es adonde se va a comprobar precisamente eso.
const cuando = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: ZONA_DEL_NEGOCIO,
});

export default async function Venta({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venta = await detalleDeVenta(id);
  if (!venta) notFound();

  const articulos = venta.lineas.reduce((n, l) => n + l.cantidad, 0);

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-4 pt-1 pb-6 lg:pt-8">
      <Link
        href="/ventas"
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Ventas
      </Link>

      {/* El total manda; la fecha va encima, como antetítulo (`.diseno/cobalto`). */}
      <h1 className="flex flex-wrap items-center gap-2 font-medium text-text-muted first-letter:uppercase">
        {cuando.format(venta.cuando)}
        {venta.anulada ? (
          <span className="rounded-full bg-danger-soft px-2.5 py-0.5 font-semibold text-danger">
            Anulada
          </span>
        ) : null}
      </h1>
      <Precio
        valor={venta.total}
        className={`mt-2 text-total leading-none font-bold tracking-tight ${venta.anulada ? "text-text-muted line-through" : ""}`}
        data-testid="total-venta"
      />
      <p className="mt-2 text-text-muted">
        {articulos} {articulos === 1 ? "artículo" : "artículos"}. Registrada por {venta.quien}.
      </p>

      {venta.anulada ? (
        <div className="mt-4">
          <Aviso conBorde data-testid="anulada">
            Anulada el {cuando.format(venta.anuladaEn!)}. Las existencias se devolvieron; la venta no
            se borró.
          </Aviso>
        </div>
      ) : null}

      <ul
        className="mt-6 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
        data-testid="lineas"
      >
        {venta.lineas.map((l) => (
          <li key={l.productoId} className="flex min-h-16 items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{l.nombre}</span>
              {/* Lo que se cobró, no lo que cuesta hoy (`AC-020`). */}
              <span className="block text-text-muted">
                {l.cantidad} × <Precio valor={l.precioCobrado} />
              </span>
            </span>
            <Precio valor={l.precioCobrado * l.cantidad} className="shrink-0 text-lg font-semibold" />
          </li>
        ))}
      </ul>

      {/* Anular deshace plata: no puede estar a un toque de distancia ni arriba del todo. */}
      {!venta.anulada ? (
        <section className="mt-8">
          <SeccionPlegable
            titulo="Anular esta venta"
            descripcion="Devuelve las existencias. La venta no se borra."
            icono="deshacer"
            peligro
            data-testid="abrir-anular"
          >
            <BotonAnular ventaId={venta.id} />
          </SeccionPlegable>
        </section>
      ) : null}
    </main>
  );
}
