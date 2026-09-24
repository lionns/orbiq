import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// `active:translate-y-px` es la respuesta al toque en menos de 100 ms que pide el handoff: el botón se
// hunde un píxel. Solo `transform`, que no mueve nada alrededor ni reordena lo que se está tocando.
const BASE =
  "inline-flex items-center justify-center gap-2 rounded-button px-4 font-semibold transition-transform active:translate-y-px";

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
  /** Cobrar: el más grande de la pantalla, porque es el que termina cada venta. */
  cobro: "min-h-16 text-xl",
} as const;

export type Tamano = keyof typeof TAMANOS;

export const VARIANTES = {
  /** La acción principal de la pantalla. Solo una por pantalla. */
  principal: "bg-accent text-accent-text disabled:opacity-50",
  /**
   * Todo lo demás. Lleva relleno además de borde: un contorno de 1 px sobre el mismo fondo de la
   * página no se lee como botón, y en oscuro menos todavía. Al pulsarlo cae al fondo de la página,
   * que es la inversión más barata y no necesita un token nuevo.
   */
  secundario:
    // `text-text` no sobra: sin él el botón hereda el color de quien lo contenga, y dentro de un
    // bloque de acento salía blanco sobre blanco — invisible. Un relleno propio necesita su tinta.
    "border border-border-strong bg-surface text-text active:bg-bg disabled:opacity-50",
  /**
   * Una acción de apoyo junto a la principal —Escanear al lado de Cobrar—. El relleno de acento
   * suave la distingue del fondo sin competir con la principal.
   */
  suave:
    // El borde de acento no es adorno: sobre el fondo de la página el relleno suave queda a 1.03:1
    // y el botón no se distinguía (`aspecto.spec.ts`, `T-010`). El acento contra el fondo da 5.89.
    "border border-accent bg-accent-soft text-text disabled:opacity-50",
  /** Lo que borra: Vaciar. El rojo suave lo separa de todo lo demás sin gritar. */
  // Con borde, por lo mismo que «suave»: sobre una tarjeta blanca el relleno solo casi no se ve.
  peligro: "border border-danger bg-danger-soft text-danger disabled:opacity-50",
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
