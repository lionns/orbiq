import type { ComponentProps, ReactNode } from "react";
import { Icono, type NombreDeIcono } from "./iconos";

/**
 * El borde fuerte, no el decorativo: el otro no llega a 3:1 y no vale para un control. 52 px de alto
 * (`.diseno/cobalto/F-M-Piezas`). Al enfocar, el borde pasa al acento y un halo suave lo rodea; con
 * error, lo mismo en rojo. El anillo de 2 px de `:focus-visible` sigue ahí para el teclado.
 */
export const CLASE_CONTROL =
  "min-h-13 w-full rounded-button border border-border-strong bg-surface px-4 focus:border-accent focus:ring-4 focus:ring-accent-soft aria-invalid:border-danger aria-invalid:ring-4 aria-invalid:ring-danger-soft";

/**
 * Un control con su etiqueta, su ayuda y su error.
 *
 * El error va **debajo del campo que falló**, no en una lista arriba, y se enlaza con
 * `aria-describedby` para que un lector de pantalla lo lea al llegar al campo
 * (`design-handoff.md` § Interaction States).
 */
/** El mismo aspecto que `CLASE_CONTROL`, en un contenedor: para un campo con algo dentro (el «$»). */
const CLASE_CONTENEDOR =
  "flex min-h-13 w-full items-center gap-2.5 rounded-button border border-border-strong bg-surface px-4 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft has-[input[aria-invalid=true]]:border-danger has-[input[aria-invalid=true]]:ring-4 has-[input[aria-invalid=true]]:ring-danger-soft";

export function Campo({
  etiqueta,
  nombre,
  error,
  ayuda,
  etiquetaOculta = false,
  opcional = false,
  icono,
  prefijo,
  cola,
  children,
  ...resto
}: {
  etiqueta: string;
  nombre: string;
  error?: string | undefined;
  ayuda?: string | undefined;
  /** Para campos cuyo sentido ya lo da el contexto — «Desde» y «Hasta» bajo «Precio». */
  etiquetaOculta?: boolean;
  /** Dice «(opcional)» junto a la etiqueta, en vez de repetirlo en la ayuda. */
  opcional?: boolean;
  /** Un icono dentro del campo, a la izquierda. Nunca solo: la etiqueta está encima (`T-022`). */
  icono?: NombreDeIcono;
  /** Texto dentro del campo antes de lo escrito: el «$» del precio (`.diseno/cobalto`, F-M-Piezas). */
  prefijo?: string;
  /** Lo que va dentro del campo a la derecha: «Escanear» en el código de barras. */
  cola?: ReactNode;
  children?: ReactNode;
} & Omit<ComponentProps<"input">, "children">) {
  const idError = `${nombre}-error`;
  const idAyuda = `${nombre}-ayuda`;
  const descrito = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(" ");
  const conAlgoDentro = Boolean(icono || prefijo || cola);
  const entrada = (
    <input
      name={nombre}
      aria-invalid={error ? true : undefined}
      aria-describedby={descrito || undefined}
      // Dentro de un contenedor, el anillo de foco lo lleva el contenedor entero; el del campo
      // quedaría dibujado por dentro del otro.
      className={conAlgoDentro ? "min-w-0 flex-1 bg-transparent py-3 focus-visible:outline-none" : CLASE_CONTROL}
      {...resto}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={resto.id} className="flex min-w-0 flex-col gap-1.5">
        <span className={etiquetaOculta ? "sr-only" : "font-semibold"}>
          {etiqueta}
          {opcional ? <span className="font-medium text-text-muted"> (opcional)</span> : null}
        </span>
        {children ??
          (conAlgoDentro ? (
            <span className={CLASE_CONTENEDOR} data-control>
              {icono ? <Icono nombre={icono} className="text-text-muted" /> : null}
              {prefijo ? <span className="font-semibold text-text-muted">{prefijo}</span> : null}
              {entrada}
              {/* Un botón dentro de una etiqueta no enfoca el campo al tocarlo: HTML deja fuera de
                  la activación de la etiqueta al contenido interactivo. */}
              {cola ? <span className="-mr-2 flex shrink-0 items-center">{cola}</span> : null}
            </span>
          ) : (
            entrada
          ))}
      </label>
      {error ? (
        <span id={idError} className="flex items-center gap-1.5 font-medium text-danger">
          <Icono nombre="alerta" className="size-4" />
          {error}
        </span>
      ) : null}
      {ayuda ? (
        <span id={idAyuda} className="text-text-muted">
          {ayuda}
        </span>
      ) : null}
    </div>
  );
}
