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
} & { "data-testid"?: string }) {
  return (
    <details
      open={abierta}
      className="group rounded-card border border-border bg-surface"
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
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}
