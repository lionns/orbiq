import type { ComponentProps, ReactNode } from "react";

/** El borde fuerte, no el decorativo: el otro se queda en 1,49:1 y no vale para un control. */
export const CLASE_CONTROL =
  "min-h-12 w-full rounded-button border border-border-strong px-4";

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
    <label className="flex min-w-0 flex-col gap-1">
      <span className={etiquetaOculta ? "sr-only" : "font-medium"}>{etiqueta}</span>
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
