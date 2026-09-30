"use client";

import { Boton } from "@/ui/boton";
import { Icono } from "@/ui/iconos";

/** Abre el diálogo de impresión del navegador. Es lo único de la hoja que necesita JavaScript. */
export function BotonImprimir({ className = "" }: { className?: string }) {
  return (
    <Boton
      type="button"
      variante="principal"
      tamano="alto"
      className={className}
      onClick={() => window.print()}
      data-testid="imprimir"
    >
      <Icono nombre="imprimir" />
      Imprimir
    </Boton>
  );
}
