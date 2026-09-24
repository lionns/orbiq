import type { ComponentProps, ReactNode } from "react";

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
export function Campo({
  etiqueta,
  nombre,
  error,
  ayuda,
  etiquetaOculta = false,
  children,
  ...resto
}: {
  etiqueta: string;
  nombre: string;
  error?: string | undefined;
  ayuda?: string | undefined;
  /** Para campos cuyo sentido ya lo da el contexto — «Desde» y «Hasta» bajo «Precio». */
  etiquetaOculta?: boolean;
  children?: ReactNode;
} & Omit<ComponentProps<"input">, "children">) {
  const idError = `${nombre}-error`;
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={etiquetaOculta ? "sr-only" : "font-semibold"}>{etiqueta}</span>
      {ayuda ? <span className="text-text-muted">{ayuda}</span> : null}
      {children ?? (
        <input
          name={nombre}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? idError : undefined}
          className={CLASE_CONTROL}
          {...resto}
        />
      )}
      {error ? (
        <span id={idError} className="text-danger">
          {error}
        </span>
      ) : null}
    </label>
  );
}
