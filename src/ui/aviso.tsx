import type { ReactNode } from "react";

/**
 * Un mensaje que el dueño tiene que ver ahora. Vive siempre en el árbol aunque esté vacío, para que
 * un lector de pantalla lo anuncie al aparecer en vez de descubrirlo por casualidad.
 *
 * `asertivo` interrumpe lo que se esté leyendo: se reserva para cuando no saberlo cuesta dinero —
 * una venta que no se guardó (`AC-015`).
 */
export function Aviso({
  children,
  asertivo = false,
  conBorde = false,
  ...resto
}: {
  children: ReactNode;
  asertivo?: boolean;
  conBorde?: boolean;
} & { "data-testid"?: string }) {
  return (
    <p
      role="alert"
      aria-live={asertivo ? "assertive" : "polite"}
      className={`text-danger ${
        conBorde ? "rounded-card border border-danger p-3" : ""
      }`}
      {...resto}
    >
      {children}
    </p>
  );
}
