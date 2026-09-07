"use client";

import { useActionState } from "react";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { ajustar, type EstadoAjuste } from "./acciones";

const inicial: EstadoAjuste = { error: null, hecho: null };

/**
 * Se pide **lo que se contó**, no la diferencia. El dueño cuenta unidades en el estante; hacerle
 * calcular «+3 o −2» es pedirle una resta mientras hay alguien esperando. La diferencia la saca el
 * servidor y la escribe como movimiento (`D-002`).
 */
export function FormularioAjuste({ productoId }: { productoId: string }) {
  const [estado, accion, enviando] = useActionState(ajustar.bind(null, productoId), inicial);

  return (
    <form action={accion} className="mt-4 flex flex-col gap-4">
      <Campo
        etiqueta="¿Cuántas contaste?"
        nombre="conteo"
        inputMode="numeric"
        required
        data-testid="conteo"
      />
      <Campo
        etiqueta="¿Por qué?"
        nombre="motivo"
        ayuda="Obligatorio. Queda en el movimiento para siempre."
        required
        data-testid="motivo"
      />
      {estado.error ? <Aviso data-testid="ajuste-error">{estado.error}</Aviso> : null}
      {estado.hecho ? (
        <p role="status" className="text-text-muted" data-testid="ajuste-hecho">
          {estado.hecho}
        </p>
      ) : null}
      <Boton type="submit" variante="principal" disabled={enviando} data-testid="guardar-ajuste">
        {enviando ? "Guardando…" : "Corregir conteo"}
      </Boton>
    </form>
  );
}
