import "dotenv/config";
import { stdin, stdout } from "node:process";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../src/db";
import { validarContrasena, validarPersona } from "../src/domain/persona";
import { cambiarContrasena, darDeAltaPersona } from "../src/domain/personas";

/**
 * US-011. El alta de un dueño la hace el estudio, no un registro público (`D-008`), así que la hace
 * este script y no una pantalla. Sirve para dar de alta y para restablecer la contraseña: si el
 * correo ya existe, cambia la clave y cierra todas sus sesiones.
 *
 *   npm run alta-dueno -- --correo=dueno@negocio.com --nombre="Nombre del dueño"
 *
 * La contraseña se pide por teclado y no se muestra. Pasarla como argumento la dejaría en el
 * historial del shell y a la vista en la lista de procesos.
 */

const ENTER = ["\r", "\n"];
const FIN_DE_ARCHIVO = "\u0004";
const CANCELAR = "\u0003";
const BORRAR = ["\u007f", "\b"];

/** Junta los tokens siguientes: `--nombre=Ana Pérez` sin comillas llega partido en `argv`. */
function argumento(nombre: string): string | undefined {
  const inicio = process.argv.findIndex((a) => a.startsWith(`--${nombre}=`));
  if (inicio === -1) return undefined;
  const partes = [process.argv[inicio]!.slice(nombre.length + 3)];
  for (let i = inicio + 1; i < process.argv.length && !process.argv[i]!.startsWith("--"); i++) {
    partes.push(process.argv[i]!);
  }
  return partes.join(" ").trim();
}

/** Líneas de una entrada sin terminal — una tubería, una prueba, CI. */
let porTuberia: string[] | null = null;
async function leerTuberia(): Promise<string[]> {
  if (porTuberia) return porTuberia;
  const trozos: Buffer[] = [];
  for await (const trozo of stdin) trozos.push(trozo as Buffer);
  porTuberia = Buffer.concat(trozos).toString("utf8").split("\n");
  return porTuberia;
}

async function pedirContrasenaOculta(mensaje: string): Promise<string> {
  if (!stdin.isTTY) return (await leerTuberia()).shift() ?? "";

  stdout.write(mensaje);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise<string>((resolver, rechazar) => {
    let valor = "";
    const terminar = () => {
      stdin.off("data", alTeclear);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const alTeclear = (tecla: Buffer) => {
      const c = tecla.toString("utf8");
      if (ENTER.includes(c) || c === FIN_DE_ARCHIVO) {
        terminar();
        resolver(valor);
      } else if (c === CANCELAR) {
        terminar();
        rechazar(new Error("Cancelado."));
      } else if (BORRAR.includes(c)) {
        valor = valor.slice(0, -1);
      } else if (c >= " ") {
        // Nada se escribe en pantalla: ese es el punto.
        valor += c;
      }
    };
    stdin.on("data", alTeclear);
  });
}

async function principal() {
  const correo = argumento("correo")?.toLowerCase();
  const nombre = argumento("nombre");
  if (!correo) throw new Error("Falta --correo=dueno@negocio.com");

  const contrasena = await pedirContrasenaOculta("Contraseña: ");
  const repetida = await pedirContrasenaOculta("Repítela: ");
  if (contrasena !== repetida) throw new Error("Las dos contraseñas no coinciden.");
  const mala = validarContrasena(contrasena);
  if (mala) throw new Error(`La contraseña: ${mala}`);

  const existente = await db.select().from(schema.user).where(eq(schema.user.email, correo));
  const yaEstaba = existente[0];

  if (yaEstaba) {
    // Cambiar la clave cierra lo que estuviera abierto: si se restablece es porque algo pasó.
    const cerradas = await cambiarContrasena(yaEstaba.id, contrasena);
    console.log(`Contraseña cambiada para ${correo}. Sesiones cerradas: ${cerradas}.`);
    return;
  }

  if (!nombre) throw new Error('Falta --nombre="Nombre del dueño" para dar de alta a alguien nuevo');

  // El mismo alta que hace el dueño con sus empleados desde Personas (`D-013`), con rol de dueño.
  const alta = validarPersona({ nombre, correo, contrasena });
  if (!alta.ok) throw new Error(Object.values(alta.errores).join(" "));
  const r = await darDeAltaPersona(alta.valor, "owner");
  if (!r.ok) throw new Error(r.mensaje);
  console.log(`Dueño dado de alta: ${correo}`);
}

try {
  await principal();
} finally {
  await pool.end();
}
