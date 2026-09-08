/**
 * Copia el decodificador de códigos de barras a `public/` para servirlo desde nuestro origen.
 *
 * `zxing-wasm` por defecto se descarga el `.wasm` de un CDN de terceros en tiempo de ejecución.
 * Eso pone el acto central del producto —escanear— a depender de un dominio que no controlamos, y
 * `D-005` dice que la aplicación falla de forma explícita, no a medias porque un CDN no responde.
 * El binario no va al repositorio: sale de `node_modules` en cada build, con la versión que fija
 * `package-lock.json`.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// `zxing-wasm` no exporta su `package.json`, así que se parte del módulo del lector y se sube
// hasta la raíz del paquete. Resolver así respeta dónde haya quedado tras el hoisting de npm.
// No basta con encontrar un `package.json`: `dist/cjs` lleva el suyo solo para marcar el formato,
// así que se sube hasta el que de verdad se llama `zxing-wasm`.
const require = createRequire(import.meta.url);
const esLaRaiz = (dir) => {
  const manifiesto = join(dir, "package.json");
  return existsSync(manifiesto) && JSON.parse(readFileSync(manifiesto, "utf8")).name === "zxing-wasm";
};
let raiz = dirname(require.resolve("zxing-wasm/reader"));
while (!esLaRaiz(raiz)) {
  const padre = dirname(raiz);
  if (padre === raiz) throw new Error("no se encontró la raíz de zxing-wasm — ¿está instalado?");
  raiz = padre;
}
const origen = join(raiz, "dist/reader/zxing_reader.wasm");
const destino = join(process.cwd(), "public", "zxing_reader.wasm");

mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origen, destino);
console.log(`copiar-wasm: ${origen} -> public/zxing_reader.wasm`);
