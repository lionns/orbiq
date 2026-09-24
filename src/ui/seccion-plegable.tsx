import Link from "next/link";
import type { ReactNode } from "react";
import { Icono, type NombreDeIcono } from "./iconos";

/**
 * Una acción que existe pero no se impone. El mismo patrón que ya usan los filtros del catálogo y
 * el selector de tema, así que no es una convención nueva que haya que aprender.
 *
 * Es un `<details>` del navegador: se abre sin JavaScript, y el nombre de la acción se ve siempre
 * aunque esté cerrada. Plegar algo sin dejar su nombre a la vista sería esconderlo.
 */
export function SeccionPlegable({
  titulo,
  descripcion,
  children,
  abierta = false,
  icono,
  peligro = false,
  enGrupo = false,
  hoja,
  ...resto
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  abierta?: boolean;
  /** El icono de la acción, en su burbuja de acento suave. Siempre junto al título. */
  icono?: NombreDeIcono;
  /** Anular: el título en rojo, porque deshace dinero. */
  peligro?: boolean;
  /** Sin borde propio: va dentro de una tarjeta que agrupa varias (`divide-y`). */
  enGrupo?: boolean;
  /**
   * En el celular, abierta sube como hoja desde abajo (`.diseno/cobalto/F-M-Conteo`). Cerrar es
   * volver a esta dirección: el `<details>` no se abre solo, así que la página vuelve cerrada. Sin
   * JavaScript, igual. En computador sigue abriéndose en su sitio.
   */
  hoja?: { cerrar: string };
} & { "data-testid"?: string }) {
  return (
    <details
      open={abierta}
      className={`group bg-surface ${enGrupo ? "" : "rounded-card border border-border"}`}
      {...resto}
    >
      {/* `list-none` y el marcador de WebKit oculto: el triangulito del navegador desentonaba con
          todo lo demás (`T-024`). El glifo propio gira al abrir y dice que hay algo debajo sin
          depender del color. */}
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        {icono ? (
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              peligro ? "bg-danger-soft text-danger" : "bg-accent-soft text-accent"
            }`}
          >
            <Icono nombre={icono} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className={`block font-semibold ${peligro ? "text-danger" : ""}`}>{titulo}</span>
          {descripcion ? <span className="block text-text-muted">{descripcion}</span> : null}
        </span>
        <Icono
          nombre="abrir"
          className="text-text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      {hoja ? (
        <>
          <Link
            href={hoja.cerrar}
            aria-label={`Cerrar ${titulo}`}
            className="fixed inset-0 z-40 bg-text/40 lg:hidden"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto rounded-t-card bg-surface px-4 pt-2 pb-5 lg:static lg:max-h-none lg:rounded-none lg:border-t lg:border-border lg:p-4">
            <span className="h-1 w-10 shrink-0 self-center rounded-full bg-border lg:hidden" />
            <div className="flex items-start justify-between gap-3 lg:hidden">
              <span>
                <span className="block text-2xl font-bold tracking-tight">{titulo}</span>
                {descripcion ? <span className="block text-text-muted">{descripcion}</span> : null}
              </span>
              <Link
                href={hoja.cerrar}
                className="flex min-h-12 shrink-0 items-center gap-1.5 font-semibold text-accent"
              >
                <Icono nombre="cerrar" />
                Cerrar
              </Link>
            </div>
            {children}
          </div>
        </>
      ) : (
        <div className="border-t border-border p-4">{children}</div>
      )}
    </details>
  );
}
