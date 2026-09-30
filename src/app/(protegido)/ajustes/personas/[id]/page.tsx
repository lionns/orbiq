import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatearPrecio } from "@/domain/moneda";
import { NOMBRE_DEL_ROL, puede } from "@/domain/permisos";
import { persona } from "@/domain/personas";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Boton } from "@/ui/boton";
import { Icono } from "@/ui/iconos";
import { SeccionPlegable } from "@/ui/seccion-plegable";
import { sesionDeLaPeticion } from "../../../sesion";
import { reactivarEmpleado } from "../acciones";
import { BotonBaja, FormularioClave } from "./formularios";

export const dynamic = "force-dynamic";

const cuando = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: ZONA_DEL_NEGOCIO,
});

/** Una persona (`.diseno/personas/Persona`): lo que cobró hoy, su contraseña y la baja. */
export default async function PaginaDePersona({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alta?: string }>;
}) {
  if (!puede((await sesionDeLaPeticion())?.rol, "administrarPersonas")) redirect("/ajustes");
  const [{ id }, { alta }] = await Promise.all([params, searchParams]);
  const p = await persona(id);
  if (!p) notFound();
  // Al dueño no se le administra desde aquí (`D-013`).
  if (p.rol === "owner") redirect("/ajustes/personas");

  return (
    <main className="mx-auto flex max-w-xl flex-col px-4 pt-1 pb-10 lg:px-12 lg:py-10">
      <Link
        href="/ajustes/personas"
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Personas
      </Link>

      <section className="flex items-center gap-4 rounded-card border border-border bg-surface p-5">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full bg-bg text-2xl font-bold"
          aria-hidden
        >
          {p.nombre.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{p.nombre}</h1>
          <span className="block truncate text-text-muted">{p.correo}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-bg px-2.5 py-0.5 font-semibold text-text-muted" data-testid="estado-persona">
              {p.deBajaDesde ? "De baja" : NOMBRE_DEL_ROL[p.rol]}
            </span>
            {p.ultimaVez && !p.deBajaDesde ? (
              <span className="text-text-muted">Última vez: {cuando.format(p.ultimaVez)}</span>
            ) : null}
          </span>
        </span>
      </section>

      {alta ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-3 rounded-button bg-accent-soft px-4 py-3.5"
          data-testid="alta-lista"
        >
          <Icono nombre="cobrar" className="mt-0.5 text-accent" />
          <span>
            <strong>{p.nombre} ya puede entrar</strong> con su correo y la contraseña que le diste.
          </span>
        </p>
      ) : null}

      <h2 className="mt-7 mb-3 text-xl font-bold tracking-tight">Hoy</h2>
      <p className="flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface px-4" data-testid="ventas-de-hoy">
        <Icono nombre="ventas" className="text-accent" />
        <span className="flex-1 font-semibold">
          {p.ventasHoy === 0
            ? "Ninguna venta cobrada"
            : `${p.ventasHoy} ${p.ventasHoy === 1 ? "venta cobrada" : "ventas cobradas"}`}
        </span>
        <span className="font-bold tabular-nums">{formatearPrecio(p.totalHoy)}</span>
      </p>

      <h2 className="mt-7 mb-3 text-xl font-bold tracking-tight">Acciones</h2>
      {p.deBajaDesde ? (
        <form action={reactivarEmpleado.bind(null, p.id)}>
          <Boton type="submit" tamano="alto" className="w-full" data-testid="reactivar">
            <Icono nombre="reactivar" />
            Darle acceso otra vez
          </Boton>
        </form>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          <SeccionPlegable
            titulo="Cambiar su contraseña"
            descripcion="Se le cierra la sesión en todos lados."
            icono="clave"
            enGrupo
            data-testid="abrir-clave"
          >
            <FormularioClave id={p.id} />
          </SeccionPlegable>
          <SeccionPlegable
            titulo="Dar de baja"
            descripcion="Ya no entra. Sus ventas se quedan."
            icono="darDeBaja"
            peligro
            enGrupo
            data-testid="abrir-baja"
          >
            <BotonBaja
              id={p.id}
              nombre={p.nombre}
              ventas="Sus ventas siguen diciendo que las cobró."
            />
          </SeccionPlegable>
        </div>
      )}
    </main>
  );
}
