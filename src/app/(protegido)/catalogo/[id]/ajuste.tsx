"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Icono } from "@/ui/iconos";
import { ajustar, type EstadoAjuste } from "./acciones";

const inicial: EstadoAjuste = { error: null, hecho: null };

/** Los motivos de siempre, de un toque (`.diseno/cobalto/F-M-Conteo`, punto 8 de formularios). */
const MOTIVOS = ["Se dañó", "Se venció", "Error al contar", "Consumo propio", "Otro"] as const;

/**
 * Se pide **lo que se contó**, no la diferencia. El dueño cuenta unidades en el estante; hacerle
 * calcular «+3 o −2» es pedirle una resta mientras hay alguien esperando. La diferencia la saca el
 * servidor y la escribe como movimiento (`D-002`); aquí solo se enseña, para que se vea antes.
 *
 * El motivo sigue siendo obligatorio y sigue siendo un texto: se elige de un toque y el detalle es
 * opcional, y se guardan juntos («Se dañó: una bolsa rota»). El libro no cambia.
 */
export function FormularioAjuste({ productoId, saldo }: { productoId: string; saldo: number }) {
  const [estado, accion, enviando] = useActionState(ajustar.bind(null, productoId), inicial);
  const [conteo, setConteo] = useState(String(Math.max(saldo, 0)));
  const [razon, setRazon] = useState<string | null>(null);
  const [detalle, setDetalle] = useState("");

  const contado = /^\d+$/.test(conteo) ? Number(conteo) : null;
  const diferencia = contado === null ? null : contado - saldo;
  const motivo = razon && detalle.trim() ? `${razon}: ${detalle.trim()}` : (razon ?? detalle.trim());
  const faltaDetalle = razon === "Otro" && !detalle.trim();

  const paso = (d: number) => setConteo(String(Math.max(0, (contado ?? 0) + d)));

  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`conteo-${productoId}`} className="font-semibold">
          ¿Cuántas hay en el estante?
        </label>
        <span className="flex min-h-16 items-center justify-between rounded-button border-2 border-accent bg-surface ring-4 ring-accent-soft">
          <button
            type="button"
            aria-label="Una menos"
            onClick={() => paso(-1)}
            className="grid size-16 place-items-center text-2xl font-semibold"
          >
            −
          </button>
          <input
            id={`conteo-${productoId}`}
            name="conteo"
            inputMode="numeric"
            required
            value={conteo}
            onChange={(e) => setConteo(e.target.value.replace(/\D/g, ""))}
            className="w-24 bg-transparent text-center text-3xl font-bold tabular-nums focus-visible:outline-none"
            data-testid="conteo"
          />
          <button
            type="button"
            aria-label="Una más"
            onClick={() => paso(1)}
            className="grid size-16 place-items-center text-2xl font-semibold"
          >
            +
          </button>
        </span>
        <span
          className={`font-semibold tabular-nums ${diferencia ? "text-danger" : "text-text-muted"}`}
          aria-live="polite"
        >
          {diferencia === null
            ? " "
            : diferencia === 0
              ? `Igual a lo que dice el sistema (${saldo}).`
              : `${Math.abs(diferencia)} ${diferencia < 0 ? "menos" : "más"} de lo que dice el sistema (${saldo}).`}
        </span>
      </div>

      <fieldset className="min-w-0">
        <legend className="mb-2.5 text-lg font-bold">¿Por qué?</legend>
        <div className="flex flex-wrap gap-2">
          {MOTIVOS.map((m) => {
            const elegido = razon === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={elegido}
                onClick={() => setRazon(elegido ? null : m)}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 font-semibold ${
                  elegido
                    ? "border-accent bg-accent text-accent-text"
                    : "border-border-strong bg-surface"
                }`}
              >
                {elegido ? <Icono nombre="cobrar" className="size-4" /> : null}
                {m}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Campo
        etiqueta="Detalle"
        nombre="detalle"
        opcional={razon !== "Otro"}
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        placeholder="Una bolsa rota, por ejemplo"
        ayuda="Queda en el movimiento para siempre."
        error={faltaDetalle ? "Con «Otro», di cuál fue el motivo." : undefined}
        data-testid="motivo"
      />
      {/* Lo que viaja: el motivo de un toque y el detalle, en un solo texto. */}
      <input type="hidden" name="motivo" value={motivo} />

      {estado.error ? <Aviso data-testid="ajuste-error">{estado.error}</Aviso> : null}
      {estado.hecho ? (
        <p role="status" className="text-text-muted" data-testid="ajuste-hecho">
          {estado.hecho}
        </p>
      ) : null}
      <Boton
        type="submit"
        variante="principal"
        tamano="alto"
        disabled={enviando || faltaDetalle}
        data-testid="guardar-ajuste"
      >
        <Icono nombre="cobrar" />
        {enviando ? "Guardando…" : "Guardar el conteo"}
      </Boton>
    </form>
  );
}
