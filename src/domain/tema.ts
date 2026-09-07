/**
 * Tema claro, oscuro o el que diga el dispositivo.
 *
 * Vive en una cookie y no en el navegador para que el servidor ya sepa el tema al pintar la primera
 * vez. Esa es la única forma de que no haya un destello del tema contrario sin meter un script que
 * bloquee la pintura — que en un celular con datos lentos es peor que el destello.
 */
export const TEMAS = ["sistema", "claro", "oscuro"] as const;
export type Tema = (typeof TEMAS)[number];

export const TEMA_POR_DEFECTO: Tema = "sistema";
export const COOKIE_TEMA = "orbiq.tema";
/** Un año: es una preferencia, no una sesión. No caduca con cerrar sesión. */
export const COOKIE_TEMA_MAX_EDAD = 60 * 60 * 24 * 365;

/** Nunca lanza. Una cookie la puede escribir cualquiera, y un valor raro no puede tumbar la app. */
export function leerTema(valor: string | undefined | null): Tema {
  const limpio = valor?.trim();
  return TEMAS.includes(limpio as Tema) ? (limpio as Tema) : TEMA_POR_DEFECTO;
}

/**
 * Lo que se pone en el `<html>`.
 *
 * Con «sistema» no se pone atributo: el CSS cae en `prefers-color-scheme` y sigue al dispositivo
 * sin que nadie toque nada. Y `color-scheme` acompaña siempre, para que la barra de desplazamiento
 * y los controles nativos no se queden en claro dentro de una pantalla oscura.
 */
export function atributosDeTema(tema: Tema): {
  "data-theme"?: "light" | "dark";
  style: { colorScheme: string };
} {
  if (tema === "claro") return { "data-theme": "light", style: { colorScheme: "light" } };
  if (tema === "oscuro") return { "data-theme": "dark", style: { colorScheme: "dark" } };
  return { style: { colorScheme: "light dark" } };
}

export const ETIQUETA_TEMA: Record<Tema, string> = {
  sistema: "Del sistema",
  claro: "Claro",
  oscuro: "Oscuro",
};
