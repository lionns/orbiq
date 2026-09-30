/**
 * Quién está usando la aplicación. Una pantalla, una ruta HTTP o un job preguntan igual: pasan las
 * cabeceras y reciben una sesión o nada (`D-001`).
 *
 * Nada aquí importa de `next/*`; la regla la sostiene `eslint.config.mjs` (`AC-X03`).
 */
import { leerRol, type Rol } from "./permisos";

export type Sesion = {
  usuarioId: string;
  nombre: string;
  correo: string;
  expiraEn: Date;
  /** Se lee de la fila en cada petición: un cambio vale desde la siguiente (`D-013`). */
  rol: Rol;
  /** Dado de baja. Una sesión de alguien de baja es una sesión ausente. */
  deBajaDesde: Date | null;
};

/**
 * Una sesión vencida es una sesión ausente, no una sesión inválida. Better Auth ya filtra por
 * fecha, pero el criterio es nuestro y se comprueba aquí — si un día su configuración cambia,
 * falla una prueba en vez de cambiar el comportamiento en silencio.
 */
export function sesionVigente(sesion: Sesion | null, ahora: Date = new Date()): Sesion | null {
  if (!sesion) return null;
  // La baja cierra sus sesiones al darla, pero no se confía solo en eso: una fila que diga «de
  // baja» basta para no entrar (`D-013`, `AC-034`).
  if (sesion.deBajaDesde) return null;
  return sesion.expiraEn.getTime() > ahora.getTime() ? sesion : null;
}

export async function sesionActual(headers: Headers): Promise<Sesion | null> {
  // Se importa aquí y no arriba a propósito: cargar `auth` abre el pool contra Neon, y `npm test`
  // corre el dominio sin base ni variables de entorno (`D-006`). Quien llama a esta función ya
  // está en un servidor con ambas cosas.
  const { auth } = await import("@/lib/auth");

  const resultado = await auth.api.getSession({ headers });
  if (!resultado) return null;

  // Un rol que no se conoce no entra como nada: mejor fuera que con permisos inventados.
  const rol = leerRol(resultado.user.role);
  if (!rol) return null;

  return sesionVigente({
    usuarioId: resultado.user.id,
    nombre: resultado.user.name,
    correo: resultado.user.email,
    expiraEn: resultado.session.expiresAt,
    rol,
    deBajaDesde: resultado.user.disabledAt ?? null,
  });
}
