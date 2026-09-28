"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Icono } from "@/ui/iconos";
import { ObjetivoDeEscaneo } from "@/ui/objetivo-de-escaneo";
import { anadirOtroCodigo, type EstadoCodigo } from "./acciones";

const inicial: EstadoCodigo = { errores: {}, hecho: null };

/**
 * «Añadir otro código», desde la ficha (`.diseno/codigos/Ficha`, `D-010`). El mismo paso que la
 * venta ofrece al escanear un código desconocido, para cuando el dueño lo hace con calma: el
 * número y cuántas llegaron con él.
 *
 * «Escanear» abre el mismo visor que la venta y deja lo leído en el campo (`T-034`). Sin escuchar
 * al lector en el documento (`conLector={false}`): le robaría las lecturas al buscador de Productos
 * cuando la ficha es un panel. El lector escribe en el campo enfocado, como un teclado.
 */
export function FormularioCodigo({ productoId }: { productoId: string }) {
  const [estado, accion, enviando] = useActionState(anadirOtroCodigo.bind(null, productoId), inicial);
  const [codigo, setCodigo] = useState("");

  return (
    <form action={accion} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Campo
              etiqueta="Código"
              nombre="codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              error={estado.errores.codigo}
              placeholder="Número"
              inputMode="numeric"
              autoComplete="off"
              required
              // El lector termina en Enter. Aquí no envía: pasa a «¿Cuántas llegaron?», que falta.
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const llegaron = e.currentTarget.form?.elements.namedItem("llegaron");
                if (llegaron instanceof HTMLInputElement) llegaron.focus();
              }}
              data-testid="codigo-nuevo"
            />
          </div>
          <ObjetivoDeEscaneo
            conCampo={false}
            comoEscanear
            conLector={false}
            claseBotonCamara="min-h-13"
            onCodigo={(leido) => {
              setCodigo(leido);
              return true;
            }}
          />
        </div>
        <p className="text-text-muted">Al leerlo, el número queda puesto aquí.</p>
      </div>
      <Campo
        etiqueta="¿Cuántas llegaron con este código?"
        nombre="llegaron"
        inputMode="numeric"
        placeholder="0"
        error={estado.errores.llegaron}
        ayuda="Se suman a lo que hay. Si no las has contado, déjalo en cero."
        opcional
        data-testid="llegaron-ficha"
      />
      {estado.errores.producto ? <Aviso>{estado.errores.producto}</Aviso> : null}
      {estado.hecho ? (
        <p role="status" className="text-text-muted" data-testid="codigo-hecho">
          {estado.hecho}
        </p>
      ) : null}
      <Boton
        type="submit"
        variante="principal"
        tamano="alto"
        disabled={enviando}
        data-testid="guardar-codigo-ficha"
      >
        <Icono nombre="cobrar" />
        {enviando ? "Guardando…" : "Añadir el código"}
      </Boton>
    </form>
  );
}
