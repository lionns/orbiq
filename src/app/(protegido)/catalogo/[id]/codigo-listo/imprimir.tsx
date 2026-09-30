"use client";

import { useState } from "react";
import { BarraInferior } from "@/ui/barra-inferior";
import { Boton, BotonEnlace } from "@/ui/boton";
import { Icono } from "@/ui/iconos";
import { Copias } from "../../etiquetas/copias";

/** «¿Cuántas etiquetas?» y su botón, que dice cuántas va a imprimir. Un formulario GET a la hoja. */
export function ImprimirDelCodigo({
  id,
  nombre,
  inicial,
  volver,
}: {
  id: string;
  nombre: string;
  inicial: number;
  volver: string;
}) {
  const [copias, setCopias] = useState(inicial);
  return (
    <form action="/catalogo/etiquetas/hoja">
      <div className="mt-6 flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">¿Cuántas etiquetas?</span>
          <span className="text-text-muted">Una por unidad en el estante</span>
        </span>
        <Copias id={id} nombre={nombre} inicial={inicial} alCambiar={(_, n) => setCopias(n)} />
      </div>
      <BarraInferior className="p-4 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <Boton type="submit" variante="principal" tamano="alto" className="w-full text-lg" data-testid="imprimir-codigo">
            <Icono nombre="imprimir" />
            Imprimir {copias === 1 ? "1 etiqueta" : `${copias} etiquetas`}
          </Boton>
          <BotonEnlace href={volver} className="w-full">
            Ahora no
          </BotonEnlace>
        </div>
      </BarraInferior>
    </form>
  );
}
