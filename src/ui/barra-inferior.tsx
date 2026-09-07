import type { ReactNode } from "react";

/**
 * La franja fija de abajo. Ahí vive la acción de cada pantalla, porque ahí llega el pulgar y no
 * arriba (`design-handoff.md` § Responsive Behavior, `NFR-003`).
 *
 * Quien la use tiene que dejar sitio abajo en su contenido —`pb-28` o lo que necesite— o la barra
 * tapará la última fila. Es el precio de que sea fija, y se paga a propósito.
 */
export function BarraInferior({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 border-t border-border bg-bg ${className}`}
    >
      {children}
    </div>
  );
}
