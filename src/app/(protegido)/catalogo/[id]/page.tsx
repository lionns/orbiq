import Link from "next/link";
import { notFound } from "next/navigation";
import { ETIQUETA_MOVIMIENTO, libroDelProducto, type Movimiento } from "@/domain/movimientos";
import { Aviso } from "@/ui/aviso";
import { Existencias, Precio } from "@/ui/cifras";
import { FormularioAjuste } from "./ajuste";

export const dynamic = "force-dynamic";

const cuando = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function HistorialDeProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const libro = await libroDelProducto(id);
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

      <section className="mt-8" aria-labelledby="corregir">
        <h2 id="corregir" className="text-lg font-medium">
          Corregir el conteo
        </h2>
        <FormularioAjuste productoId={libro.producto.id} />
      </section>

      <section className="mt-10" aria-labelledby="historial">
        <h2 id="historial" className="text-lg font-medium">
          Historial de movimientos
        </h2>
        <p className="mt-1 text-text-muted">
          {libro.movimientos.length === 0
            ? "Todavía no hay movimientos."
            : `${libro.movimientos.length} movimientos · suman ${libro.saldoDelLibro}`}
        </p>

        {libro.movimientos.length > 0 ? (
          <ol className="mt-4 flex flex-col gap-2" data-testid="historial">
            {libro.movimientos.map((m) => (
              <FilaDeMovimiento key={m.id} movimiento={m} />
            ))}
          </ol>
        ) : null}
      </section>
    </main>
  );
}

function FilaDeMovimiento({ movimiento: m }: { movimiento: Movimiento }) {
  const suma = m.cantidad > 0;
  return (
    <li
      data-tarjeta
      className="rounded-card border border-border bg-surface p-4"
      data-testid={`movimiento-${m.tipo}`}
    >
      <span className="flex items-baseline justify-between gap-4">
        <span className="font-medium">{ETIQUETA_MOVIMIENTO[m.tipo]}</span>
        {/* Con signo siempre: un «3» sin signo no dice si entró o salió. */}
        <span className={`tabular-nums font-medium ${suma ? "" : "text-danger"}`}>
          {suma ? "+" : ""}
          {m.cantidad}
        </span>
      </span>
      <span className="mt-1 block text-text-muted">
        {cuando.format(m.cuando)} · {m.quien}
      </span>
      {m.motivo ? <span className="mt-1 block">{m.motivo}</span> : null}
      {/* Se dice que viene de una venta, sin enlace todavía: la pantalla de ventas es `T-013`, y un
          enlace roto en el demo es peor que no tenerlo. */}
      {m.ventaId ? (
        <span className="mt-1 block text-text-muted" data-testid="de-una-venta">
          De una venta
        </span>
      ) : null}
    </li>
  );
}
