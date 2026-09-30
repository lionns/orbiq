"use client";

import { useState } from "react";
import { COPIAS_MAXIMO } from "@/domain/etiquetas";
import { Icono } from "@/ui/iconos";

/**
 * Cuántas etiquetas de un producto (`.diseno/etiquetas/Etiquetas-3-Cuantas`). Es un campo numérico
 * de verdad, con nombre, dentro de un formulario GET: sin JavaScript se escribe el número y la hoja
 * sale igual. Los botones − y + solo lo hacen más cómodo con el pulgar.
 *
 * Avisa de cada cambio para que la barra de abajo cuente etiquetas y hojas mientras se ajusta.
 */
export function Copias({
  id,
  nombre,
  inicial,
  alCambiar,
}: {
  id: string;
  nombre: string;
  inicial: number;
  alCambiar?: (id: string, copias: number) => void;
}) {
  const [copias, setCopias] = useState(inicial);
  // Lo que está escrito, aparte del número: vaciar el campo para teclear otro no debe convertirse
  // en un 1 a medio escribir. El número se acota al salir del campo.
  const [texto, setTexto] = useState(String(inicial));
  const poner = (n: number) => {
    const valor = Math.min(Math.max(Math.trunc(n) || 1, 1), COPIAS_MAXIMO);
    setCopias(valor);
    setTexto(String(valor));
    alCambiar?.(id, valor);
  };
  const escribir = (crudo: string) => {
    setTexto(crudo);
    const n = Number(crudo);
    if (crudo !== "" && Number.isFinite(n) && n >= 1) {
      const valor = Math.min(Math.trunc(n), COPIAS_MAXIMO);
      setCopias(valor);
      alCambiar?.(id, valor);
    }
  };
  const boton =
    "grid size-10 place-items-center rounded-full disabled:opacity-40 active:translate-y-px";

  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full border border-border-strong bg-surface p-0.5 focus-within:ring-4 focus-within:ring-accent-soft"
      data-control
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        className={`${boton} bg-bg`}
        onClick={() => poner(copias - 1)}
        disabled={copias <= 1}
      >
        <Icono nombre="menos" />
        <span className="sr-only">Una menos de {nombre}</span>
      </button>
      <input
        name="n"
        type="number"
        inputMode="numeric"
        min={1}
        max={COPIAS_MAXIMO}
        value={texto}
        onChange={(e) => escribir(e.target.value)}
        onBlur={() => poner(Number(texto) || copias)}
        aria-label={`Etiquetas de ${nombre}`}
        className="w-12 [appearance:textfield] bg-transparent text-center text-lg font-bold tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
        data-testid="copias"
      />
      <button
        type="button"
        className={`${boton} bg-accent-soft text-accent`}
        onClick={() => poner(copias + 1)}
        disabled={copias >= COPIAS_MAXIMO}
      >
        <Icono nombre="nuevo" />
        <span className="sr-only">Una más de {nombre}</span>
      </button>
    </span>
  );
}
