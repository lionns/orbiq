import Link from "next/link";
import { cookies } from "next/headers";
import { elegirTema } from "@/app/acciones-tema";
import { NEGOCIO } from "@/domain/negocio";
import { NOMBRE_DEL_ROL, puede } from "@/domain/permisos";
import { COOKIE_TEMA, ETIQUETA_TEMA, leerTema, TEMAS } from "@/domain/tema";
import { Boton } from "@/ui/boton";
import { Icono } from "@/ui/iconos";
import { salir } from "../../acceso/acciones";
import { sesionDeLaPeticion } from "../sesion";

/**
 * Tema y Salir, fuera de la cabecera (`.diseno/cobalto/U-M-Ajustes`, punto 7). Se usan poco —la
 * sesión dura semanas— y en la cabecera le quitaban sitio al nombre del negocio.
 */
export const dynamic = "force-dynamic";

export default async function Ajustes() {
  const [sesion, almacen] = await Promise.all([sesionDeLaPeticion(), cookies()]);
  const tema = leerTema(almacen.get(COOKIE_TEMA)?.value);

  return (
    <main className="mx-auto flex max-w-xl flex-col px-4 pt-1 pb-6 lg:px-12 lg:py-10">
      <Link
        href="/"
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted lg:hidden"
      >
        <Icono nombre="volver" />
        Inicio
      </Link>
      <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Ajustes</h1>

      <h2 className="mt-6 mb-2 text-lg font-bold">Apariencia</h2>
      {/* Tres botones y no un interruptor: son tres estados, y «Del sistema» es uno (`T-007`).
          Un formulario de verdad, así que funciona sin JavaScript. */}
      <form
        action={elegirTema}
        className="flex gap-1 rounded-button border border-border bg-surface p-1"
      >
        {TEMAS.map((t) => {
          const elegido = t === tema;
          return (
            <button
              key={t}
              type="submit"
              name="tema"
              value={t}
              aria-pressed={elegido}
              data-testid={`tema-${t}`}
              className={`flex min-h-12 flex-auto items-center justify-center gap-1.5 rounded-xl px-3 whitespace-nowrap ${
                elegido ? "bg-accent-soft font-bold text-accent" : "font-medium text-text-muted"
              }`}
            >
              {elegido ? <Icono nombre="cobrar" className="size-4" /> : null}
              {ETIQUETA_TEMA[t]}
            </button>
          );
        })}
      </form>

      {/* `.diseno/personas/Ajustes`: una fila que lleva a la lista, para que Ajustes no crezca con
          el número de empleados. Solo el dueño la ve (`D-013`). */}
      {puede(sesion?.rol, "administrarPersonas") ? (
        <>
          <h2 className="mt-7 mb-2 text-lg font-bold">Tienda</h2>
          <Link
            href="/ajustes/personas"
            className="flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface px-4 py-2.5"
            data-testid="ir-a-personas"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Icono nombre="personas" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Personas</span>
              <span className="block text-text-muted">Quién puede entrar a la tienda</span>
            </span>
            <Icono nombre="siguiente" className="text-text-muted" />
          </Link>
        </>
      ) : null}

      <h2 className="mt-7 mb-2 text-lg font-bold">Sesión</h2>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
        <p>
          <span className="block font-semibold">{sesion?.nombre}</span>
          <span className="block text-text-muted">
            {sesion ? `${NOMBRE_DEL_ROL[sesion.rol]} · ` : ""}
            {NEGOCIO.nombre}
          </span>
        </p>
        <form action={salir}>
          <Boton type="submit" className="w-full">
            <Icono nombre="salir" />
            Salir
          </Boton>
        </form>
      </div>
    </main>
  );
}
