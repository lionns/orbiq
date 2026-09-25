import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * La base, en los dos sitios donde corre orbiq (`T-031`).
 *
 * **En Cloudflare Workers**, una conexión abierta en una petición no puede usarse en otra: el
 * runtime lo corta con «Cannot perform I/O on behalf of a different request». Así que cada
 * petición abre la suya contra Hyperdrive, que mantiene el grupo de conexiones con Neon por detrás
 * y hace que abrirla sea barato (así lo recomienda Cloudflare para Neon). La petición se reconoce
 * por su `ExecutionContext`: una clave de `WeakMap` que muere con ella.
 *
 * **En Node** —`next dev`, las pruebas, los scripts— sigue siendo un grupo compartido sobre
 * `DATABASE_URL`, el string agrupado de Neon.
 *
 * Un solo driver, `pg`, en los dos: la venta necesita transacciones interactivas (`AC-008`), y es
 * el que Cloudflare documenta con Hyperdrive. Nadie fuera de este archivo sabe cuál de los dos
 * caminos se tomó: `db` es el mismo objeto para el dominio y para better-auth.
 */
type Db = NodePgDatabase<typeof schema> & { $client: Pool };

/** Lo que el Worker de OpenNext deja en el ámbito global, resuelto por petición. */
type ContextoDeCloudflare = {
  env: { HYPERDRIVE?: { connectionString: string } };
  ctx: object;
};

function contextoDeCloudflare(): ContextoDeCloudflare | undefined {
  // El mismo símbolo que lee `getCloudflareContext` de `@opennextjs/cloudflare`. Se lee aquí sin
  // importar el paquete para que Node —pruebas y scripts— no lo cargue nunca.
  return (globalThis as Record<symbol, ContextoDeCloudflare | undefined>)[
    Symbol.for("__cloudflare-context__")
  ];
}

function crear(connectionString: string, max: number): Db {
  const grupo = new Pool({ connectionString, max });
  // Una conexión que se cae sin consulta en curso solo se anota: la siguiente consulta abre otra.
  // Sin quien escuche su evento `error`, `pg` lo lanza como error sin atrapar y tumba lo que esté
  // corriendo. Se escucha en el grupo y en cada conexión, porque una que el grupo ya soltó (tras
  // 10 s libre) sigue pudiendo recibirlo.
  const anotar = (error: Error) => console.warn("Conexión con la base perdida:", error.message);
  grupo.on("error", anotar);
  grupo.on("connect", (conexion) => conexion.on("error", anotar));
  return drizzle(grupo, { schema });
}

const porPeticion = new WeakMap<object, Db>();
let enNode: Db | undefined;

function actual(): Db {
  const cloudflare = contextoDeCloudflare();
  if (cloudflare) {
    const hyperdrive = cloudflare.env.HYPERDRIVE?.connectionString;
    if (!hyperdrive) throw new Error("Falta el binding HYPERDRIVE en wrangler.jsonc.");
    let db = porPeticion.get(cloudflare.ctx);
    if (!db) {
      // Pocas conexiones por petición: Hyperdrive agrupa por detrás, y dos consultas en paralelo
      // (la lista y su total) no deberían esperar una a otra. Dentro de la petición se reusan: el
      // grupo es solo suyo. Abrir una por consulta (`maxUses: 1`) costaba un saludo TLS cada vez.
      db = crear(hyperdrive, 4);
      porPeticion.set(cloudflare.ctx, db);
    }
    return db;
  }
  if (!enNode) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL. Ver .env.example");
    enNode = crear(url, 10);
  }
  return enNode;
}

/**
 * La base de esta petición. Un `Proxy` para que las más de veinte consultas del dominio y el
 * adaptador de better-auth sigan escribiendo `db.select(…)` sin saber de dónde sale.
 */
export const db: Db = new Proxy({} as Db, {
  get(_, propiedad) {
    const real = actual();
    const valor = Reflect.get(real, propiedad, real);
    return typeof valor === "function" ? valor.bind(real) : valor;
  },
});

/** Para los scripts de Node, que cierran la conexión al terminar. */
export const pool = {
  end: async () => {
    await enNode?.$client.end();
  },
};

export { schema };
