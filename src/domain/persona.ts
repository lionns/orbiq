/**
 * Las reglas de los datos de una persona, sin base delante (`D-013`). Las usan la pantalla de
 * Personas y el script de alta del dueño: una sola definición de qué es un correo o una contraseña
 * aceptable.
 */
export type AltaDePersona = { nombre: string; correo: string; contrasena: string };

export type Validacion<T> = { ok: true; valor: T } | { ok: false; errores: Record<string, string> };

/** El mínimo de siempre (`scripts/alta-dueno.mts`, desde `T-002`). */
export const CONTRASENA_MINIMA = 8;

/** Lo justo para no guardar algo que no es un correo; el que manda es quien lo teclea. */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarContrasena(crudo: string): string | null {
  if (crudo.length < CONTRASENA_MINIMA) return `Mínimo ${CONTRASENA_MINIMA} caracteres.`;
  return null;
}

export function validarPersona(entrada: {
  nombre: string;
  correo: string;
  contrasena: string;
}): Validacion<AltaDePersona> {
  const nombre = entrada.nombre.trim().replace(/\s+/g, " ");
  // Minúsculas: es como lo guarda Better Auth, y así «Maria@» y «maria@» no son dos personas.
  const correo = entrada.correo.trim().toLowerCase();
  const errores: Record<string, string> = {};
  if (!nombre) errores.nombre = "Escribe su nombre.";
  if (!CORREO.test(correo)) errores.correo = "Escribe un correo, como maria@gmail.com.";
  const clave = validarContrasena(entrada.contrasena);
  if (clave) errores.contrasena = clave;
  if (Object.keys(errores).length > 0) return { ok: false, errores };
  return { ok: true, valor: { nombre, correo, contrasena: entrada.contrasena } };
}

/**
 * A quién le pide un cambio un empleado: «a Juan» si la tienda tiene un solo dueño activo, «al
 * dueño» si tiene varios —el operador del estudio también entra como dueño (`brief.md` § Users)—.
 * Nombrar al primero que se encuentre sería mandar al empleado a la persona equivocada.
 */
export function aQuienAvisarEntre(duenosActivos: readonly string[]): string {
  return duenosActivos.length === 1 ? `a ${duenosActivos[0]}` : "al dueño";
}
