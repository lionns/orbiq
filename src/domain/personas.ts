import { and, asc, count, eq, isNull, max, sql, sum } from "drizzle-orm";
import { db, schema } from "@/db";
import { leerRol, type Rol } from "./permisos";
import { aQuienAvisarEntre, type AltaDePersona } from "./persona";
import { diaDelNegocio, ZONA_DEL_NEGOCIO } from "./zona";

/**
 * Las personas del negocio contra la base (`D-013`). Las crea el dueño, no un registro público
 * (`D-008`), con la misma maquinaria que el script de alta: usuario en `user`, contraseña en
 * `account`. Nadie se borra —sus ventas y movimientos lo nombran—: la baja es una fecha.
 *
 * `auth` se importa dentro de cada función y no arriba, como en `session.ts`: cargarlo exige el
 * secreto de Better Auth, y quien solo lista personas no lo necesita.
 */
export type Persona = {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  deBajaDesde: Date | null;
  /** Las ventas cobradas hoy, sin las anuladas. */
  ventasHoy: number;
  totalHoy: number;
  /** La última vez que usó la aplicación: la sesión que se renovó más tarde. */
  ultimaVez: Date | null;
};

/** Hoy, en la zona del negocio: lo mismo que usa el cierre de caja (`T-019`). */
const deHoy = () =>
  sql`to_char(timezone(${ZONA_DEL_NEGOCIO}::text, ${schema.sale.createdAt}), 'YYYY-MM-DD') = ${diaDelNegocio(new Date())}`;

export async function listarPersonas(): Promise<Persona[]> {
  const [usuarios, ventas, sesiones] = await Promise.all([
    db
      .select({
        id: schema.user.id,
        nombre: schema.user.name,
        correo: schema.user.email,
        rol: schema.user.role,
        deBajaDesde: schema.user.disabledAt,
      })
      .from(schema.user)
      .orderBy(asc(schema.user.createdAt)),
    db
      .select({
        id: schema.sale.userId,
        n: count(),
        total: sql<number>`coalesce(${sum(schema.sale.total)}, 0)::int`,
      })
      .from(schema.sale)
      .where(and(isNull(schema.sale.voidedAt), deHoy()))
      .groupBy(schema.sale.userId),
    db
      .select({ id: schema.session.userId, ultima: max(schema.session.updatedAt) })
      .from(schema.session)
      .groupBy(schema.session.userId),
  ]);
  return usuarios.flatMap((u) => {
    const rol = leerRol(u.rol);
    if (!rol) return [];
    const v = ventas.find((x) => x.id === u.id);
    return [
      {
        ...u,
        rol,
        ventasHoy: v?.n ?? 0,
        totalHoy: v?.total ?? 0,
        ultimaVez: sesiones.find((x) => x.id === u.id)?.ultima ?? null,
      },
    ];
  });
}

export async function persona(id: string): Promise<Persona | null> {
  return (await listarPersonas()).find((p) => p.id === id) ?? null;
}

export type ResultadoPersona = { ok: true; id: string } | { ok: false; campo: string; mensaje: string };

/**
 * Dar de alta. El correo se da por verificado —lo escribió el dueño en persona, como el estudio con
 * el suyo (`data-model.md` § user)— y la contraseña se la dice el dueño a la persona.
 */
export async function darDeAltaPersona(alta: AltaDePersona, rol: Rol): Promise<ResultadoPersona> {
  const { auth } = await import("@/lib/auth");
  const [ya] = await db
    .select({ id: schema.user.id, deBaja: schema.user.disabledAt })
    .from(schema.user)
    .where(eq(schema.user.email, alta.correo))
    .limit(1);
  if (ya) {
    return {
      ok: false,
      campo: "correo",
      mensaje: ya.deBaja
        ? "Ese correo es de alguien dado de baja. Reactívalo desde Personas."
        : "Ese correo ya entra a la tienda.",
    };
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(alta.contrasena);
  const usuario = await ctx.internalAdapter.createUser(
    { email: alta.correo, name: alta.nombre, emailVerified: true, role: rol },
    { method: "email-password" },
  );
  // El hash va en `account`, nunca en `user`: es lo que hace que sumar Google sea una fila (`D-008`).
  await ctx.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: hash,
  });
  return { ok: true, id: usuario.id };
}

/** Cerrar todas sus sesiones: en su celular y donde sea. */
async function cerrarSesiones(usuarioId: string): Promise<number> {
  const cerradas = await db
    .delete(schema.session)
    .where(eq(schema.session.userId, usuarioId))
    .returning({ id: schema.session.id });
  return cerradas.length;
}

/** Cambiar la contraseña cierra lo que estuviera abierto: si se cambia, es porque algo pasó. */
export async function cambiarContrasena(usuarioId: string, contrasena: string): Promise<number> {
  const { auth } = await import("@/lib/auth");
  const ctx = await auth.$context;
  await ctx.internalAdapter.updatePassword(usuarioId, await ctx.password.hash(contrasena));
  return cerrarSesiones(usuarioId);
}

export type ResultadoBaja = { ok: true } | { ok: false; mensaje: string };

/**
 * Dar de baja: una fecha, y sus sesiones cerradas en el momento. Nunca al dueño: sin él nadie
 * administraría la tienda (`D-013`).
 */
export async function darDeBaja(usuarioId: string, quien: string): Promise<ResultadoBaja> {
  if (usuarioId === quien) return { ok: false, mensaje: "No puedes darte de baja a ti mismo." };
  const [p] = await db
    .select({ rol: schema.user.role })
    .from(schema.user)
    .where(eq(schema.user.id, usuarioId))
    .limit(1);
  if (!p) return { ok: false, mensaje: "Esa persona ya no existe." };
  if (p.rol === "owner") return { ok: false, mensaje: "Al dueño no se le da de baja desde aquí." };
  await db
    .update(schema.user)
    .set({ disabledAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.user.id, usuarioId));
  await cerrarSesiones(usuarioId);
  return { ok: true };
}

export async function reactivar(usuarioId: string): Promise<void> {
  await db
    .update(schema.user)
    .set({ disabledAt: null, updatedAt: new Date() })
    .where(eq(schema.user.id, usuarioId));
}

/** A quién le pide un cambio un empleado; la regla está en `aQuienAvisarEntre`. */
export async function aQuienAvisar(): Promise<string> {
  const duenos = await db
    .select({ nombre: schema.user.name })
    .from(schema.user)
    .where(and(eq(schema.user.role, "owner"), isNull(schema.user.disabledAt)))
    .limit(2);
  return aQuienAvisarEntre(duenos.map((d) => d.nombre));
}
