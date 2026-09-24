import Link from "next/link";
import { headers } from "next/headers";
import { NEGOCIO } from "@/domain/negocio";
import { sesionActual } from "@/domain/session";
import { resumenDelDia, type VentaDelDia } from "@/domain/venta";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Existencias, Precio } from "@/ui/cifras";
import { Icono, type NombreDeIcono } from "@/ui/iconos";
import { Marca } from "@/ui/marca";

/**
 * Inicio: lo del día sin tener que buscarlo (`.diseno/cobalto/U-M-Inicio`, `U-D-Inicio`). Es la
 * portada desde `T-029`; la venta está a un toque en la navegación, y una venta confirmada deja la
 * pantalla de venta lista para la siguiente, así que el toque de más se paga una vez por jornada.
 */
export const dynamic = "force-dynamic";

const fecha = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: ZONA_DEL_NEGOCIO,
});
const hora = new Intl.DateTimeFormat("es-CO", { timeStyle: "short", timeZone: ZONA_DEL_NEGOCIO });
const horaDelDia = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: ZONA_DEL_NEGOCIO,
});

function saludo(ahora: Date): string {
  const h = Number(horaDelDia.format(ahora));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default async function Inicio() {
  const ahora = new Date();
  const [sesion, resumen] = await Promise.all([sesionActual(await headers()), resumenDelDia(ahora)]);
  const nombre = sesion?.nombre.split(" ")[0] ?? "";
  const hoy = `/ventas?desde=${resumen.dia}&hasta=${resumen.dia}`;
  const reponer = "/catalogo?existencias=por-reponer";

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:gap-6 lg:px-12 lg:py-10">
      {/* Celular: la marca arriba y Ajustes a mano. En computador lo lleva el menú lateral. */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <span className="flex items-center gap-2.5">
          <Marca />
          <span className="text-lg font-bold">{NEGOCIO.nombre}</span>
        </span>
        <Link
          href="/ajustes"
          className="flex min-h-12 items-center gap-1.5 px-1 font-semibold text-text-muted"
        >
          <Icono nombre="ajustes" />
          Ajustes
        </Link>
      </div>

      <div className="hidden lg:block">
        <p className="font-medium text-text-muted first-letter:uppercase">{fecha.format(ahora)}</p>
        <h1 className="text-4xl font-bold tracking-tight">
          {saludo(ahora)}
          {nombre ? `, ${nombre}` : ""}
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        {/* El número que se viene a mirar. Un solo bloque de color en toda la pantalla. */}
        <section
          className="flex flex-col rounded-bloque bg-accent p-5 text-accent-text lg:col-span-2 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-8"
          data-testid="resumen-del-dia"
        >
          <div>
            <p className="font-medium first-letter:uppercase lg:hidden">{fecha.format(ahora)}</p>
            <p className="mt-4 font-medium lg:mt-0">
              Vendido hoy, {resumen.numeroVentas}{" "}
              {resumen.numeroVentas === 1 ? "venta" : "ventas"}
            </p>
            <Precio
              valor={resumen.total}
              className="block text-5xl leading-none font-bold tracking-tight lg:mt-1 lg:text-6xl"
              data-testid="vendido-hoy"
            />
          </div>
          <Link
            href={hoy}
            className="mt-5 flex min-h-13 items-center justify-center gap-2 rounded-button bg-surface px-6 font-bold text-accent lg:mt-0"
          >
            Ver las ventas de hoy
            <Icono nombre="siguiente" />
          </Link>
        </section>

        <section className="hidden overflow-hidden rounded-card border border-border bg-surface lg:flex lg:flex-col">
          <Link href={reponer} className="flex items-center gap-3 px-5 pt-5 pb-3">
            <Burbuja icono="agotados" peligro />
            <span className="flex-1 text-lg font-semibold">Agotados</span>
            <span className="font-semibold text-text-muted tabular-nums">
              {resumen.porReponer.total}
            </span>
          </Link>
          <ul className="divide-y divide-border">
            {resumen.porReponer.productos.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/catalogo/${p.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-5 py-2"
                >
                  <span className="truncate font-medium">{p.nombre}</span>
                  <Existencias cantidad={p.existencias} alertarEnCero compacto />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="hidden overflow-hidden rounded-card border border-border bg-surface lg:col-span-2 lg:block">
          <h2 className="px-5 pt-5 pb-2 text-xl font-bold tracking-tight">Últimas ventas</h2>
          {resumen.ultimasVentas.length === 0 ? (
            <p className="px-5 pb-5 text-text-muted">Todavía no hay ventas hoy.</p>
          ) : (
            <ul className="divide-y divide-border">
              {resumen.ultimasVentas.map((v) => (
                <li key={v.id}>
                  <FilaDeVenta venta={v} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Los atajos. En el celular, Agotados va aquí; en computador tiene su tarjeta. */}
        <nav aria-label="Atajos" className="lg:flex lg:flex-col lg:gap-4">
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface lg:contents">
            <Atajo href="/catalogo" icono="escanear" titulo="Consultar precio" sub="Escanea o escribe el nombre" />
            <Atajo
              href={reponer}
              icono="agotados"
              titulo="Agotados"
              sub={`${resumen.porReponer.total} ${resumen.porReponer.total === 1 ? "producto" : "productos"} por reponer`}
              peligro
              soloCelular
            />
            <Atajo href="/catalogo/nuevo" icono="alta" titulo="Nuevo producto" sub="Dar de alta lo que llegó" />
          </ul>
        </nav>
      </div>
    </main>
  );
}

function Burbuja({ icono, peligro = false }: { icono: NombreDeIcono; peligro?: boolean }) {
  return (
    <span
      className={`grid size-11 shrink-0 place-items-center rounded-full ${
        peligro ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
      }`}
    >
      <Icono nombre={icono} />
    </span>
  );
}

function Atajo({
  href,
  icono,
  titulo,
  sub,
  peligro = false,
  soloCelular = false,
}: {
  href: string;
  icono: NombreDeIcono;
  titulo: string;
  sub: string;
  peligro?: boolean;
  soloCelular?: boolean;
}) {
  return (
    <li className={soloCelular ? "lg:hidden" : "lg:rounded-card lg:border lg:border-border lg:bg-surface"}>
      <Link href={href} className="flex min-h-18 items-center gap-3.5 px-4 py-3 lg:p-5">
        <Burbuja icono={icono} peligro={peligro} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg leading-snug font-semibold">{titulo}</span>
          <span className="block text-text-muted">{sub}</span>
        </span>
        <Icono nombre="siguiente" className="text-text-muted" />
      </Link>
    </li>
  );
}

function FilaDeVenta({ venta: v }: { venta: VentaDelDia }) {
  return (
    <Link href={`/ventas/${v.id}`} className="flex min-h-16 items-center gap-4 px-5 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-text-muted">
        <Icono nombre="ventas" />
      </span>
      <span className="flex-1">
        <span className="block font-semibold tabular-nums">{hora.format(v.cuando)}</span>
        <span className="block text-text-muted">
          {v.articulos} {v.articulos === 1 ? "artículo" : "artículos"}
        </span>
      </span>
      {v.anulada ? (
        <span className="rounded-full bg-danger-soft px-2.5 py-0.5 font-semibold text-danger">
          Anulada
        </span>
      ) : null}
      <Precio
        valor={v.total}
        className={`text-lg ${v.anulada ? "text-text-muted line-through" : "font-semibold"}`}
      />
      <Icono nombre="siguiente" className="text-text-muted" />
    </Link>
  );
}
