"use client";

import { useEffect, useRef, useState } from "react";
import { Boton } from "@/ui/boton";
import { contarProductos } from "../acciones";

/** Lo que dice el botón: cuántos quedarían, o que no quedaría ninguno. */
function texto(n: number): string {
  if (n === 0) return "Ningún producto";
  return n === 1 ? "Ver 1 producto" : `Ver ${n} productos`;
}

/**
 * «Ver 3 productos» (`.diseno/cobalto/F-M-Filtros`): dice cuántos quedarían **antes** de aplicar,
 * así que se ve si un filtro deja la lista vacía sin tener que probarlo.
 *
 * Sin JavaScript dice el número de los filtros ya puestos —el servidor lo pinta— y aplica igual:
 * es un botón de envío del formulario `GET` de siempre. Con JavaScript cuenta de nuevo cada vez
 * que cambia una opción, con una pausa corta para no preguntar a cada tecla del precio.
 */
export function VerProductos({ inicial }: { inicial: number }) {
  const boton = useRef<HTMLButtonElement>(null);
  const [n, setN] = useState(inicial);

  useEffect(() => {
    const formulario = boton.current?.form;
    if (!formulario) return;
    let espera: ReturnType<typeof setTimeout> | undefined;
    let ultima = 0;

    function alCambiar() {
      clearTimeout(espera);
      espera = setTimeout(async () => {
        const pedida = ++ultima;
        const datos = new URLSearchParams();
        new FormData(formulario!).forEach((v, k) => {
          if (typeof v === "string" && v !== "") datos.append(k, v);
        });
        try {
          const cuantos = await contarProductos(datos.toString());
          // Solo cuenta la última respuesta: una lenta de antes no pisa a una rápida de después.
          if (pedida === ultima) setN(cuantos);
        } catch {
          // Sin red el número se queda como estaba; aplicar sigue funcionando.
        }
      }, 250);
    }

    formulario.addEventListener("change", alCambiar);
    formulario.addEventListener("input", alCambiar);
    return () => {
      clearTimeout(espera);
      formulario.removeEventListener("change", alCambiar);
      formulario.removeEventListener("input", alCambiar);
    };
  }, []);

  return (
    <Boton
      ref={boton}
      type="submit"
      variante="principal"
      tamano="alto"
      aria-live="polite"
      className="tabular-nums"
      data-testid="aplicar-filtros"
    >
      {texto(n)}
    </Boton>
  );
}
