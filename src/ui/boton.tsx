import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const BASE =
  "inline-flex items-center justify-center rounded-[var(--radius-button)] px-4 font-medium";

/**
 * Los 48 px de área táctil de `design-handoff.md` § Touch Targets, aquí y no repartidos por cinco
 * pantallas: repetidos, tarde o temprano uno se queda en 40.
 *
 * Es un parámetro y no una clase que el llamador sobrescriba porque dos utilidades de altura en el
 * mismo elemento se resuelven por el orden en que Tailwind las genera, no por el orden en que se
 * escriben. Funciona hoy y dejaría de funcionar en silencio.
 */
export const TAMANOS = {
  normal: "min-h-12",
  /** Para el botón que se toca cien veces al día. */
  alto: "min-h-14",
} as const;

export type Tamano = keyof typeof TAMANOS;

export const VARIANTES = {
  /** La acción principal de la pantalla. Solo una por pantalla. */
  principal:
    "bg-[color:var(--color-accent)] text-[color:var(--color-accent-text)] disabled:opacity-50",
  /** Todo lo demás. El borde es el fuerte: el decorativo no llega a 3:1 y no sirve para un control. */
  secundario:
    "border border-[color:var(--color-border-strong)] active:bg-[color:var(--color-surface)] disabled:opacity-50",
} as const;

export type Variante = keyof typeof VARIANTES;

type PropiedadesBoton = ComponentProps<"button"> & {
  variante?: Variante;
  tamano?: Tamano;
  children: ReactNode;
};

export function Boton({
  variante = "secundario",
  tamano = "normal",
  className = "",
  ...resto
}: PropiedadesBoton) {
  return (
    <button
      className={`${BASE} ${TAMANOS[tamano]} ${VARIANTES[variante]} ${className}`}
      {...resto}
    />
  );
}

type PropiedadesEnlace = ComponentProps<typeof Link> & {
  variante?: Variante;
  tamano?: Tamano;
  children: ReactNode;
};

/**
 * Un enlace con aspecto de botón. No es lo mismo que un botón y por eso son dos componentes: lo que
 * navega tiene que ser un enlace de verdad para funcionar sin JavaScript y para poder compartirse
 * — es lo que hace que «Ver más» siga sirviendo con la red a medias (`AC-018`).
 */
export function BotonEnlace({
  variante = "secundario",
  tamano = "normal",
  className = "",
  ...resto
}: PropiedadesEnlace) {
  return <Link className={`${BASE} ${TAMANOS[tamano]} ${VARIANTES[variante]} ${className}`} {...resto} />;
}
