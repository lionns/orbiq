"use client";

import { useActionState } from "react";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { anular, type EstadoAnulacion } from "./acciones";

const inicial: EstadoAnulacion = { error: null };

export function BotonAnular({ ventaId }: { ventaId: string }) {
  const [estado, accion, enviando] = useActionState(anular.bind(null, ventaId), inicial);

  return (
    <form action={accion} className="flex flex-col gap-3">
      {estado.error ? <Aviso data-testid="anular-error">{estado.error}</Aviso> : null}
      <Boton type="submit" variante="peligro" disabled={enviando} data-testid="anular" className="w-full">
        {enviando ? "Anulando…" : "Anular esta venta"}
      </Boton>
    </form>
  );
}
