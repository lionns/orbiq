/**
 * Las reglas del escaneo, sin navegador delante. Un lector de código de barras **es un teclado**
 * (`architecture.md` § Frontend): teclea el código y termina en Enter. Lo que lo distingue de una
 * persona no es lo que escribe, es a qué velocidad — y eso es una función pura, así que se prueba
 * sin montar una pantalla (`D-001`, `D-006`).
 */

/**
 * Los formatos que se le piden al decodificador. Se acota a estos a propósito: buscar todos los
 * formatos lo hace más lento, y los tres segundos de `NFR-001` se miden contra la cámara.
 *
 * **UPC-A no está y no hace falta:** un UPC-A es un EAN-13 con un cero delante, así que un lector
 * de EAN-13 lo lee y devuelve sus trece dígitos. Pedirlo aparte además cuesta caro — se midió que
 * Chromium anuncia `ean_13` y `ean_8` pero no `upc_a`, así que exigirlo tiraba por tierra el
 * decodificador nativo y obligaba a bajar 1,1 MB de WebAssembly en Android para nada. La
 * equivalencia se resuelve al buscar, en `equivalentes`.
 */
export const FORMATOS = ["ean_13", "ean_8"] as const;

const LARGOS_VALIDOS = new Set([8, 12, 13]);

/**
 * Un lector teclea entre 5 y 20 ms por carácter; una persona rápida no baja de 100. El umbral
 * separa las dos poblaciones con margen a ambos lados, en vez de partirlas por la mitad.
 */
export const UMBRAL_LECTOR_MS = 50;

/**
 * Deja el código como se compara contra la base: sin espacios y sin el Enter final.
 *
 * Devuelve `null` cuando lo recibido no puede ser un código de producto. No es validación de
 * formalidad —no se comprueba el dígito de control— sino el filtro que evita ir a la base con lo
 * que evidentemente no es un código.
 */
export function normalizarCodigo(crudo: string): string | null {
  const limpio = crudo.replace(/\s/g, "");
  if (!/^\d+$/.test(limpio)) return null;
  return LARGOS_VALIDOS.has(limpio.length) ? limpio : null;
}

/**
 * Las formas bajo las que el mismo producto puede estar guardado.
 *
 * El código impreso en un producto UPC-A tiene doce dígitos, pero un lector de EAN-13 lo entrega
 * con un cero delante. Sin esto, el producto que se dio de alta tecleando los doce dígitos del
 * empaque no lo encuentra nunca quien lo escanea, y al revés — y el dueño lo daría de alta dos
 * veces hasta chocar con `AC-004`.
 */
export function equivalentes(codigo: string): string[] {
  if (codigo.length === 12) return [codigo, `0${codigo}`];
  if (codigo.length === 13 && codigo.startsWith("0")) return [codigo, codigo.slice(1)];
  return [codigo];
}

export type LecturaEnCurso = {
  teclas: string;
  /** Cuándo llegó la última tecla, en milisegundos. `null` mientras no hay ninguna. */
  ultima: number | null;
};

export const LECTURA_VACIA: LecturaEnCurso = { teclas: "", ultima: null };

export type Pulsacion = { tecla: string; ahora: number };

/**
 * Acumula pulsaciones y devuelve un código solo cuando el ritmo fue de lector y terminó en Enter.
 *
 * Una persona que teclea los mismos dígitos no produce nada por aquí: su ritmo rompe la ráfaga y
 * cada tecla lenta reinicia la cuenta. Para ella está el campo de texto, que es la otra entrada
 * del mismo objetivo (`AC-006`).
 */
export function acumular(
  estado: LecturaEnCurso,
  { tecla, ahora }: Pulsacion,
): { estado: LecturaEnCurso; codigo: string | null } {
  const seguido = estado.ultima !== null && ahora - estado.ultima <= UMBRAL_LECTOR_MS;

  if (tecla === "Enter") {
    // Enter sin ráfaga detrás es alguien enviando un formulario, no un lector terminando.
    const codigo = seguido ? normalizarCodigo(estado.teclas) : null;
    return { estado: LECTURA_VACIA, codigo };
  }

  // Solo dígitos: cualquier otra tecla es una persona usando la pantalla, y corta la ráfaga.
  if (!/^\d$/.test(tecla)) return { estado: LECTURA_VACIA, codigo: null };

  return {
    estado: { teclas: seguido ? estado.teclas + tecla : tecla, ultima: ahora },
    codigo: null,
  };
}
