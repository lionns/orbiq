import Link from "next/link";
import { ventasPorDia } from "@/domain/venta";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Precio } from "@/ui/cifras";

export const dynamic = "force-dynamic";

// `d.dia` ya viene siendo una fecha del negocio, así que solo hay que escribirla: se ancla a
// mediodía UTC y se formatea en UTC para que ninguna zona la corra un día. La **hora** de cada
// venta sí es un instante, y esa se escribe en la zona del negocio o contradice a su encabezado.
const dia = new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "UTC" });
const hora = new Intl.DateTimeFormat("es-CO", { timeStyle: "short", timeZone: ZONA_DEL_NEGOCIO });

/** `YYYY-MM-DD` o nada. Una fecha inventada en la dirección se ignora, no tumba la pantalla. */
const fecha = (v: string | string[] | undefined): string | null => {
  const s = (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

export default async function Ventas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rango = { desde: fecha(params.desde), hasta: fecha(params.hasta) };
  const dias = await ventasPorDia(rango);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>

      {/* GET, como el resto: el rango vive en la dirección y el enlace se comparte (`AC-018`). */}
      <form className="mt-4 flex items-end gap-2" role="search">
        <Campo etiqueta="Desde" nombre="desde" type="date" defaultValue={rango.desde ?? ""} />
        <Campo etiqueta="Hasta" nombre="hasta" type="date" defaultValue={rango.hasta ?? ""} />
        <Boton type="submit" className="shrink-0">
          Ver
        </Boton>
      </form>

      {dias.length === 0 ? (
        <p className="mt-8 text-text-muted" data-testid="ventas-vacio">
          No hay ventas en ese rango.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-8" data-testid="dias">
          {dias.map((d) => (
            <section key={d.dia} aria-labelledby={`dia-${d.dia}`} data-testid={`dia-${d.dia}`}>
              <h2
                id={`dia-${d.dia}`}
                className="flex items-baseline justify-between gap-4 border-b border-border pb-2"
              >
                <span className="font-medium">{dia.format(new Date(`${d.dia}T12:00:00Z`))}</span>
                {/* El número que se mira al cerrar la caja. */}
                <Precio valor={d.total} className="font-semibold" data-testid={`total-${d.dia}`} />
              </h2>

              <ul className="mt-3 flex flex-col gap-2">
                {d.ventas.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/ventas/${v.id}`}
                      data-tarjeta
                      data-testid={`venta-${v.id}`}
                      className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
                    >
                      <span>
                        <span className="block font-medium">{hora.format(v.cuando)}</span>
                        <span className="block text-text-muted">
                          {v.articulos} {v.articulos === 1 ? "artículo" : "artículos"}
                          {v.anulada ? " · anulada" : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Precio
                          valor={v.total}
                          className={v.anulada ? "line-through text-text-muted" : "font-medium"}
                        />
                        <span aria-hidden className="text-text-muted">
                          ›
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
