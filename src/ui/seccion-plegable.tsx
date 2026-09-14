import type { ReactNode } from "react";
import { Icono } from "./iconos";

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
  ...resto
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  abierta?: boolean;
} & { "data-testid"?: string }) {
  return (
    <details
      open={abierta}
      className="group rounded-card border border-border-strong bg-surface"
      {...resto}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium">
        <span>
          {titulo}
          {descripcion ? (
            <span className="block font-normal text-text-muted">{descripcion}</span>
          ) : null}
        </span>
        {/* Gira al abrir: dice que hay algo debajo sin depender del color. El glifo sale del set
            y no del carácter «▾», que cada navegador dibuja a su manera y desentona con el resto. */}
        <span className="text-text-muted transition-transform group-open:rotate-90">
          <Icono nombre="siguiente" />
        </span>
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}
