import Link from "next/link";
import { DIAS_POR_PAGINA, ventasDelRango, type VentaDelDia } from "@/domain/venta";
import { conDesde } from "@/domain/volver";
import { diaDelNegocio, ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Precio } from "@/ui/cifras";
import { Icono } from "@/ui/iconos";

export const dynamic = "force-dynamic";

// `d.dia` ya viene siendo una fecha del negocio, así que solo hay que escribirla: se ancla a
// mediodía UTC y se formatea en UTC para que ninguna zona la corra un día. La **hora** de cada
// venta sí es un instante, y esa se escribe en la zona del negocio o contradice a su encabezado.
const diaLargo = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const diaConAno = new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "UTC" });
const diaCorto = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "UTC" });
const hora = new Intl.DateTimeFormat("es-CO", { timeStyle: "short", timeZone: ZONA_DEL_NEGOCIO });

const mediodia = (d: string) => new Date(`${d}T12:00:00Z`);
const mover = (d: string, dias: number) =>
  new Date(mediodia(d).getTime() + dias * 86_400_000).toISOString().slice(0, 10);

/** `YYYY-MM-DD` o nada. Una fecha inventada en la dirección se ignora, no tumba la pantalla. */
const fecha = (v: string | string[] | undefined): string | null => {
  const s = (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/**
 * El encabezado de un día, en una línea a 360 px (`T-024`, hallazgo 4): sin el año cuando es el
 * de hoy, y «Hoy»/«Ayer» delante cuando lo son. El día sigue siendo inconfundible.
 */
function nombreDelDia(d: string, hoy: string): string {
  const anoDistinto = d.slice(0, 4) !== hoy.slice(0, 4);
  const texto = (anoDistinto ? diaConAno : diaLargo).format(mediodia(d));
  if (d === hoy) return `Hoy, ${texto}`;
  if (d === mover(hoy, -1)) return `Ayer, ${texto}`;
  return texto;
}

export default async function Ventas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hoy = diaDelNegocio(new Date());
  // Sin fechas, hoy (`T-037`): es lo que se mira al cerrar la caja, y sin rango la página traía la
  // historia entera —medido: 60 MB con 20.000 ventas—.
  const sinFechas = !fecha(params.desde) && !fecha(params.hasta);
  const rango = sinFechas
    ? { desde: hoy, hasta: hoy }
    : { desde: fecha(params.desde), hasta: fecha(params.hasta) };
  // Cuántos días se enseñan: de 7 en 7 con «Ver más días», como «Ver más» en Productos.
  const pedidos = Number(typeof params.dias === "string" ? params.dias : NaN);
  const verDias = Number.isInteger(pedidos) && pedidos > 0 ? Math.min(pedidos, 366) : DIAS_POR_PAGINA;
  const { dias, resumen, hayMas } = await ventasDelRango(rango, verDias);

  // Los atajos (`.diseno/cobalto/F-M-Ventas`): enlaces con su rango en la dirección, así que
  // funcionan sin JavaScript y se comparten (`AC-018`). La semana empieza el lunes.
  const diaDeLaSemana = (mediodia(hoy).getUTCDay() + 6) % 7;
  const atajos = [
    { nombre: "Hoy", desde: hoy, hasta: hoy },
    { nombre: "Ayer", desde: mover(hoy, -1), hasta: mover(hoy, -1) },
    { nombre: "Esta semana", desde: mover(hoy, -diaDeLaSemana), hasta: hoy },
    { nombre: "Este mes", desde: `${hoy.slice(0, 8)}01`, hasta: hoy },
  ];
  const atajo = atajos.find((a) => a.desde === rango.desde && a.hasta === rango.hasta);
  const otras = params.otras === "1" || Boolean((rango.desde || rango.hasta) && !atajo);
  const conRango = Boolean(rango.desde || rango.hasta);
  // Esta lista, con sus fechas: la venta que se abra vuelve a ella y no a la de hoy (`T-036`).
  const consulta = new URLSearchParams();
  if (!sinFechas && rango.desde) consulta.set("desde", rango.desde);
  if (!sinFechas && rango.hasta) consulta.set("hasta", rango.hasta);
  if (params.otras === "1") consulta.set("otras", "1");
  if (verDias !== DIAS_POR_PAGINA) consulta.set("dias", String(verDias));
  const aqui = consulta.size ? `/ventas?${consulta}` : null;
  const masDias = new URLSearchParams(consulta);
  masDias.set("dias", String(verDias + DIAS_POR_PAGINA));

  return (
    <main className="mx-auto max-w-6xl px-4 pt-4 pb-6 lg:px-12 lg:pt-10">
      <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Ventas</h1>

      <nav aria-label="Fechas" className="mt-4 flex flex-wrap gap-2">
        {atajos.map((a) => (
          <Atajo
            key={a.nombre}
            href={`/ventas?desde=${a.desde}&hasta=${a.hasta}`}
            elegido={atajo === a}
          >
            {a.nombre}
          </Atajo>
        ))}
        <Atajo href="/ventas?otras=1" elegido={otras} className="lg:hidden">
          Otras fechas
        </Atajo>
      </nav>

      <div className="mt-5 grid gap-5 lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4 lg:order-2">
          {/* GET, como el resto: el rango vive en la dirección y el enlace se comparte. En el celular
              aparece con «Otras fechas»; en computador está siempre, a la derecha. */}
          <form
            role="search"
            className={`flex-col gap-3 rounded-card border border-border bg-surface p-4 lg:flex lg:p-5 ${otras ? "flex" : "hidden"}`}
          >
            <h2 className="hidden text-lg font-bold lg:block">Otras fechas</h2>
            {/* Una debajo de otra y a todo el ancho: lado a lado no cabía la fecha a 360 px. */}
            <Campo etiqueta="Desde" nombre="desde" type="date" defaultValue={rango.desde ?? ""} />
            <Campo etiqueta="Hasta" nombre="hasta" type="date" defaultValue={rango.hasta ?? ""} />
            <Boton type="submit" variante="principal">
              Ver esas fechas
            </Boton>
          </form>

          {conRango ? (
            <section
              className="flex items-center justify-between gap-3 rounded-card bg-accent-soft p-4 lg:flex-col lg:items-start lg:p-5"
              data-testid="resumen-rango"
            >
              <span>
                <span className="block font-semibold">
                  {rango.desde && rango.hasta && rango.desde !== rango.hasta
                    ? `${diaCorto.format(mediodia(rango.desde))} al ${diaCorto.format(mediodia(rango.hasta))}`
                    : rango.desde || rango.hasta
                      ? diaCorto.format(mediodia((rango.desde ?? rango.hasta)!))
                      : ""}
                </span>
                <span className="block text-text-muted">
                  {resumen.numeroVentas} {resumen.numeroVentas === 1 ? "venta" : "ventas"}
                  {resumen.anuladas
                    ? `, ${resumen.anuladas} ${resumen.anuladas === 1 ? "anulada" : "anuladas"}`
                    : ""}
                </span>
              </span>
              <Precio
                valor={resumen.total}
                className="text-2xl font-bold tracking-tight text-accent lg:text-3xl"
              />
            </section>
          ) : null}
        </div>

        {dias.length === 0 ? (
          <p className="text-text-muted lg:col-span-2" data-testid="ventas-vacio">
            No hay ventas en ese rango.
          </p>
        ) : (
          <div className="flex flex-col gap-5 lg:col-span-2" data-testid="dias">
            {dias.map((d) => (
              <section
                key={d.dia}
                aria-labelledby={`dia-${d.dia}`}
                data-testid={`dia-${d.dia}`}
                className="overflow-hidden rounded-card border border-border bg-surface"
              >
                <h2
                  id={`dia-${d.dia}`}
                  className="flex items-center justify-between gap-4 border-b border-border p-4 lg:p-5"
                >
                  <span className="min-w-0">
                    <span className="block font-bold first-letter:uppercase">
                      {nombreDelDia(d.dia, hoy)}
                    </span>
                    <span className="block font-normal text-text-muted">
                      {d.ventas.length} {d.ventas.length === 1 ? "venta" : "ventas"}
                    </span>
                  </span>
                  {/* El número que se mira al cerrar la caja. */}
                  <Precio
                    valor={d.total}
                    className="shrink-0 text-2xl font-bold tracking-tight"
                    data-testid={`total-${d.dia}`}
                  />
                </h2>
                <ul className="divide-y divide-border">
                  {d.ventas.map((v) => (
                    <li key={v.id}>
                      <FilaDeVenta venta={v} aqui={aqui} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {hayMas ? (
              // Un enlace y no un botón: el número de días vive en la dirección, como los filtros
              // de Productos, y funciona sin JavaScript (`AC-018`).
              <Link
                href={`/ventas?${masDias}`}
                scroll={false}
                className="flex min-h-14 items-center justify-center gap-2 rounded-button border border-border-strong bg-surface font-semibold"
                data-testid="ver-mas-dias"
              >
                Ver más días
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function Atajo({
  href,
  elegido,
  className = "",
  children,
}: {
  href: string;
  elegido: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={elegido ? "page" : undefined}
      className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-semibold whitespace-nowrap ${
        elegido ? "border-accent bg-accent text-accent-text" : "border-border-strong bg-surface"
      } ${className}`}
    >
      {elegido ? <Icono nombre="cobrar" className="size-4" /> : null}
      {children}
    </Link>
  );
}

function FilaDeVenta({ venta: v, aqui }: { venta: VentaDelDia; aqui: string | null }) {
  return (
    <Link
      href={conDesde(`/ventas/${v.id}`, aqui)}
      data-testid={`venta-${v.id}`}
      className="flex min-h-16 items-center gap-3 py-2.5 pr-3 pl-4 lg:px-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-text-muted">
        <Icono nombre="ventas" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold whitespace-nowrap tabular-nums">{hora.format(v.cuando)}</span>
        {/* «Anulada» va debajo, con los artículos, y no en la fila del importe: a 360 px hora,
            etiqueta, importe y flecha no caben juntos y la página se ensanchaba. */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-text-muted">
          {v.articulos} {v.articulos === 1 ? "artículo" : "artículos"}
          {v.anulada ? (
            <span className="rounded-full bg-danger-soft px-2.5 py-0.5 font-semibold text-danger">
              Anulada
            </span>
          ) : null}
        </span>
      </span>
      <Precio
        valor={v.total}
        className={`shrink-0 text-lg ${v.anulada ? "text-text-muted line-through" : "font-semibold"}`}
        data-testid="precio-venta"
      />
      <Icono nombre="siguiente" className="text-text-muted" />
    </Link>
  );
}
