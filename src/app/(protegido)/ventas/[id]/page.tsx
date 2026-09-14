import Link from "next/link";
import { Icono } from "@/ui/iconos";
import { notFound } from "next/navigation";
import { detalleDeVenta } from "@/domain/venta";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Aviso } from "@/ui/aviso";
import { Precio } from "@/ui/cifras";
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/ventas" className="flex items-center gap-1.5 font-medium text-text-muted">
        <Icono nombre="volver" />
        Volver a las ventas
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Venta de {cuando.format(venta.cuando)}
      </h1>
      <p className="mt-1 text-text-muted">Registrada por {venta.quien}</p>

      {venta.anulada ? (
        <div className="mt-4">
          <Aviso conBorde data-testid="anulada">
            Anulada el {cuando.format(venta.anuladaEn!)}. Las existencias se devolvieron; la venta no
            se borró.
          </Aviso>
        </div>
      ) : null}

      <ul className="mt-8 flex flex-col gap-2" data-testid="lineas">
        {venta.lineas.map((l) => (
          <li
            key={l.productoId}
            data-tarjeta
            className="flex items-baseline justify-between gap-4 rounded-card border border-border bg-surface p-4"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{l.nombre}</span>
              {/* Lo que se cobró, no lo que cuesta hoy (`AC-020`). */}
              <span className="block text-text-muted">
                {l.cantidad} × <Precio valor={l.precioCobrado} />
              </span>
            </span>
            <Precio valor={l.precioCobrado * l.cantidad} className="shrink-0 font-medium" />
          </li>
        ))}
      </ul>

      <p className="mt-6 flex items-baseline justify-between gap-4 border-t border-border pt-4">
        <span className="text-text-muted">Total</span>
        <Precio
          valor={venta.total}
          className={`font-semibold ${venta.anulada ? "line-through text-text-muted" : ""}`}
          data-testid="total-venta"
        />
      </p>

      {/* Anular deshace plata: no puede estar a un toque de distancia ni arriba del todo. */}
      {!venta.anulada ? (
        <section className="mt-10">
          <SeccionPlegable
            titulo="Anular esta venta"
            descripcion="Devuelve las existencias y deja de contar en el total del día. La venta no se borra."
            data-testid="abrir-anular"
          >
            <BotonAnular ventaId={venta.id} />
          </SeccionPlegable>
        </section>
      ) : null}
    </main>
  );
}
