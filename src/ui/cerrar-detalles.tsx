"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Cierra el `<details>` que lo contiene: el de los filtros o el de una hoja.
 *
 * Es un enlace a la misma dirección, así que **sin JavaScript** cierra recargando: el `<details>`
 * no se abre solo y la página vuelve cerrada. **Con JavaScript** eso no basta —Next navega sin
 * recargar y el `<details>` conserva su estado—, así que aquí se cierra a mano. Era el defecto: con
 * JavaScript, «Cerrar» no hacía nada.
 *
 * `conEsc` añade la tecla Escape, que es como se cierra cualquier hoja o ventana.
 */
export function CerrarDetalles({
  href,
  className,
  conEsc = false,
  children,
  ...resto
}: {
  href: string;
  className: string;
  conEsc?: boolean;
  children?: ReactNode;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!conEsc) return;
    function alPulsar(e: KeyboardEvent) {
      const detalles = ref.current?.closest("details");
      if (e.key === "Escape" && detalles?.open) detalles.open = false;
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [conEsc]);

  return (
    <Link
      ref={ref}
      href={href}
      scroll={false}
      className={className}
      onClick={(e) => {
        const detalles = e.currentTarget.closest("details");
        if (!detalles) return;
        e.preventDefault();
        detalles.open = false;
        // El foco vuelve a lo que abrió la hoja, no se pierde en el documento.
        detalles.querySelector("summary")?.focus();
      }}
      {...resto}
    >
      {children}
    </Link>
  );
}
