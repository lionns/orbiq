import { parsearPrecio } from "./moneda";

/**
 * Las reglas de un producto, sin base de datos delante. Lo que aquí se rechaza no llega a Postgres,
 * y lo que Postgres rechaza igualmente está en `schema.ts` — la regla vive en los dos sitios a
 * propósito: la pantalla explica, la base garantiza (`data-model.md` § Validation Rules).
 */
export type AltaDeProducto = {
  nombre: string;
  precio: number;
  /** Nombre, no identificador: la categoría se crea con el producto si no existía (`T-003`). */
  categoria: string | null;
  codigoDeBarras: string | null;
  existenciasIniciales: number;
};

export type Validacion<T> = { ok: true; valor: T } | { ok: false; errores: Record<string, string> };

export type EntradaCruda = {
  nombre?: string | undefined;
  precio?: string | undefined;
  categoria?: string | undefined;
  codigoDeBarras?: string | undefined;
  existenciasIniciales?: string | undefined;
};

const NOMBRE_MAXIMO = 120;

export function validarAlta(entrada: EntradaCruda): Validacion<AltaDeProducto> {
  const errores: Record<string, string> = {};

  const nombre = (entrada.nombre ?? "").trim();
  if (!nombre) errores.nombre = "Escribe el nombre del producto.";
  else if (nombre.length > NOMBRE_MAXIMO) errores.nombre = `Máximo ${NOMBRE_MAXIMO} caracteres.`;

  const precio = parsearPrecio(entrada.precio ?? "");
  if (precio === null) errores.precio = "Escribe el precio en números.";
  else if (precio < 0) errores.precio = "El precio no puede ser negativo.";

  const crudoExistencias = (entrada.existenciasIniciales ?? "").trim();
  let existencias = 0;
  if (crudoExistencias) {
    const leido = Number(crudoExistencias.replace(/\s/g, ""));
    if (!Number.isInteger(leido)) errores.existenciasIniciales = "Escribe una cantidad entera.";
    else if (leido < 0) errores.existenciasIniciales = "Las existencias no pueden ser negativas.";
    else existencias = leido;
  }

  // Sin código de barras es lo normal: granel, pan, huevos (`AC-005`). Vacío es nulo, no cadena
  // vacía — dos cadenas vacías chocarían contra el índice único.
  const codigo = (entrada.codigoDeBarras ?? "").trim();

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  return {
    ok: true,
    valor: {
      nombre,
      precio: precio!,
      categoria: (entrada.categoria ?? "").trim() || null,
      codigoDeBarras: codigo || null,
      existenciasIniciales: existencias,
    },
  };
}
