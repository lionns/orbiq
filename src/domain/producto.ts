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

/**
 * Lo que se puede editar de un producto. Las existencias no: esas entran por el libro (`D-002`).
 * Los códigos tampoco: un producto puede tener varios y cada uno lleva su cantidad, así que se
 * corrigen uno por uno (`D-010`).
 */
export type EdicionDeProducto = Omit<AltaDeProducto, "existenciasIniciales" | "codigoDeBarras">;

export function validarEdicion(entrada: EntradaCruda): Validacion<EdicionDeProducto> {
  // Las mismas reglas que el alta, sin los campos que aquí no existen. Escribirlas dos veces sería
  // garantizar que un día se contradigan.
  const r = validarAlta({ ...entrada, existenciasIniciales: undefined, codigoDeBarras: undefined });
  if (!r.ok) return r;
  const { existenciasIniciales: _, codigoDeBarras: __, ...resto } = r.valor;
  return { ok: true, valor: resto };
}

export type CodigoNuevo = { codigo: string; llegaron: number };

/**
 * Añadir un código a un producto que ya existe (`D-010`): el número y cuántas unidades llegaron
 * con él. Cero es válido —se añade el código y las unidades se cuentan después—; negativo no.
 */
export function validarCodigoNuevo(entrada: {
  codigo?: string | undefined;
  llegaron?: string | undefined;
}): Validacion<CodigoNuevo> {
  const errores: Record<string, string> = {};
  const codigo = (entrada.codigo ?? "").replace(/\s/g, "");
  if (!codigo) errores.codigo = "Escanea o escribe el código.";

  const crudo = (entrada.llegaron ?? "").trim();
  const llegaron = crudo ? Number(crudo.replace(/\s/g, "")) : 0;
  if (!Number.isInteger(llegaron)) errores.llegaron = "Escribe una cantidad entera.";
  else if (llegaron < 0) errores.llegaron = "No pueden llegar menos de cero.";

  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, valor: { codigo, llegaron } };
}

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
