import type { ReactNode } from "react";
import { CerrarDetalles } from "./cerrar-detalles";
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
   * Abierta, no se despliega en su sitio: sube como hoja desde abajo en el celular
   * (`.diseno/cobalto/F-M-Conteo`) y es una ventana centrada en computador, sobre un velo.
   * Se cierra con «Cerrar», tocando fuera o con Escape; sin JavaScript, volviendo a `cerrar`.
   * `subtitulo` sustituye a la descripción dentro de la hoja: ahí ya se sabe qué es.
   */
  hoja?: { cerrar: string; subtitulo?: string };
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
          <CerrarDetalles
            href={hoja.cerrar}
            aria-label={`Cerrar ${titulo}`}
            className="fixed inset-0 z-40 bg-text/40"
            conEsc
          />
          <div
            role="dialog"
            aria-label={titulo}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col gap-5 overflow-y-auto rounded-t-card bg-surface px-4 pt-2 pb-5 shadow-[0_-12px_32px_rgba(15,20,25,0.18)] lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-120 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-card lg:p-7 lg:shadow-[0_24px_64px_rgba(15,20,25,0.28)]"
          >
            <span className="h-1 w-10 shrink-0 self-center rounded-full bg-border lg:hidden" />
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-2xl font-bold tracking-tight">{titulo}</span>
                <span className="block text-text-muted">{hoja.subtitulo ?? descripcion}</span>
              </span>
              <CerrarDetalles
                href={hoja.cerrar}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-bg px-3.5 font-semibold text-text-muted"
              >
                <Icono nombre="cerrar" />
                Cerrar
              </CerrarDetalles>
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
