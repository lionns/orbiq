"use client";

import { useState } from "react";
import { cola } from "@/domain/codigos";
import { COPIAS_MAXIMO, POR_HOJA } from "@/domain/etiquetas";
import { formatearPrecio } from "@/domain/moneda";
import { BarraInferior } from "@/ui/barra-inferior";
import { Boton } from "@/ui/boton";
import { Icono } from "@/ui/iconos";
import { Copias } from "../copias";

type Fila = { id: string; nombre: string; precio: number; codigo: string; sugeridas: number };

/**
 * La lista con un contador por producto, y abajo cuántas etiquetas y hojas salen. Un formulario GET
 * a la hoja: sin JavaScript se escriben los números y funciona igual; con él, la cuenta de abajo se
 * mueve mientras se ajusta.
 */
export function FormularioCuantas({ productos }: { productos: Fila[] }) {
  const [copias, setCopias] = useState(() => new Map(productos.map((p) => [p.id, p.sugeridas])));
  const total = Math.min(
    [...copias.values()].reduce((s, n) => s + n, 0),
    COPIAS_MAXIMO,
  );
  const hojas = Math.max(Math.ceil(total / POR_HOJA), 1);

  return (
    <form action="/catalogo/etiquetas/hoja">
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {productos.map((p) => (
          <li key={p.id} className="flex min-h-18 items-center gap-3 py-2.5 pr-3 pl-4" data-testid="fila-copias">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{p.nombre}</span>
              <span className="block text-text-muted tabular-nums">
                {formatearPrecio(p.precio)} · {cola(p.codigo)}
              </span>
            </span>
            <Copias
              id={p.id}
              nombre={p.nombre}
              inicial={p.sugeridas}
              alCambiar={(id, n) => setCopias((antes) => new Map(antes).set(id, n))}
            />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-text-muted">
        Hoja carta de {POR_HOJA} etiquetas. Si sobran casillas quedan en blanco; si no caben, sale
        otra hoja.
      </p>

      <BarraInferior className="p-4 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          <p className="flex justify-between text-text-muted tabular-nums" data-testid="total-etiquetas">
            <span>{total === 1 ? "1 etiqueta" : `${total} etiquetas`}</span>
            <span>{hojas === 1 ? "1 hoja" : `${hojas} hojas`}</span>
          </p>
          <Boton type="submit" variante="principal" tamano="alto" className="w-full text-lg" data-testid="ver-hoja">
            <Icono nombre="imprimir" />
            Imprimir
          </Boton>
        </div>
      </BarraInferior>
    </form>
  );
}
