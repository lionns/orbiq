import Link from "next/link";
import { redirect } from "next/navigation";
import { NOMBRE_DEL_ROL, puede } from "@/domain/permisos";
import { listarPersonas, type Persona } from "@/domain/personas";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { BarraInferior } from "@/ui/barra-inferior";
import { BotonEnlace } from "@/ui/boton";
import { Icono } from "@/ui/iconos";
import { sesionDeLaPeticion } from "../../sesion";

export const dynamic = "force-dynamic";

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: ZONA_DEL_NEGOCIO });
const cuando = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ZONA_DEL_NEGOCIO,
});

/**
 * Quién puede entrar a la tienda (`.diseno/personas/Personas`, `D-013`). Solo el dueño la ve: a un
 * empleado lo devuelve a Ajustes. Arriba los que entran; abajo los dados de baja, que siguen
 * existiendo porque sus ventas los nombran.
 */
export default async function Personas() {
  const sesion = await sesionDeLaPeticion();
  if (!puede(sesion?.rol, "administrarPersonas")) redirect("/ajustes");
  const personas = await listarPersonas();
  const activas = personas.filter((p) => !p.deBajaDesde);
  const deBaja = personas.filter((p) => p.deBajaDesde);

  return (
    <main className="mx-auto flex max-w-xl flex-col px-4 pt-1 pb-32 lg:px-12 lg:py-10">
      <Link
        href="/ajustes"
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Ajustes
      </Link>
      <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Personas</h1>
      <p className="mt-1 mb-4 text-text-muted">
        Quién puede entrar a la tienda. Cada venta dice quién la cobró.
      </p>

      <ul
        className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
        data-testid="personas"
      >
        {activas.map((p) => (
          <li key={p.id}>
            <FilaDePersona persona={p} yo={p.id === sesion?.usuarioId} />
          </li>
        ))}
      </ul>

      {deBaja.length > 0 ? (
        <>
          <h2 className="mt-7 text-xl font-bold tracking-tight">Dados de baja</h2>
          <p className="mb-3 text-text-muted">Ya no pueden entrar. Sus ventas siguen con su nombre.</p>
          <ul
            className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
            data-testid="personas-de-baja"
          >
            {deBaja.map((p) => (
              <li key={p.id}>
                <FilaDePersona persona={p} yo={false} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <BarraInferior className="p-4 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto w-full max-w-xl">
          <BotonEnlace
            href="/ajustes/personas/nueva"
            variante="principal"
            tamano="alto"
            className="w-full text-lg"
            data-testid="anadir-persona"
          >
            <Icono nombre="nuevo" />
            Añadir persona
          </BotonEnlace>
        </div>
      </BarraInferior>
    </main>
  );
}

function FilaDePersona({ persona: p, yo }: { persona: Persona; yo: boolean }) {
  const detalle = p.deBajaDesde
    ? `Desde el ${fecha.format(p.deBajaDesde)}`
    : yo
      ? `${p.correo} · tú`
      : p.ventasHoy > 0
        ? `Cobró ${p.ventasHoy} ${p.ventasHoy === 1 ? "venta" : "ventas"} hoy`
        : p.ultimaVez
          ? `Última vez: ${cuando.format(p.ultimaVez)}`
          : "Todavía no ha entrado";
  const cuerpo = (
    <>
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full font-bold ${
          p.rol === "owner" ? "bg-accent-soft text-accent" : "bg-bg text-text"
        }`}
        aria-hidden
      >
        {p.nombre.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-semibold">
          <span className="truncate">{p.nombre}</span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm ${
              p.deBajaDesde
                ? "bg-bg text-text-muted"
                : p.rol === "owner"
                  ? "bg-accent-soft text-accent"
                  : "bg-bg text-text-muted"
            }`}
          >
            {p.deBajaDesde ? "De baja" : NOMBRE_DEL_ROL[p.rol]}
          </span>
        </span>
        <span className="block truncate text-text-muted tabular-nums">{detalle}</span>
      </span>
    </>
  );
  // El dueño no se administra desde aquí: su fila informa y no lleva a ninguna parte.
  if (p.rol === "owner") {
    return <div className="flex min-h-18 items-center gap-3 px-4 py-2.5">{cuerpo}</div>;
  }
  return (
    <Link
      href={`/ajustes/personas/${p.id}`}
      className={`flex min-h-18 items-center gap-3 py-2.5 pr-3 pl-4 ${p.deBajaDesde ? "opacity-70" : ""}`}
      data-testid={`persona-${p.id}`}
    >
      {cuerpo}
      <Icono nombre="siguiente" className="text-text-muted" />
    </Link>
  );
}
