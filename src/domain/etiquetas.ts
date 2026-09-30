/**
 * Las etiquetas de los códigos de la tienda (`D-012`, `.diseno/etiquetas/`). Se eligen desde
 * Productos con su mismo buscador, se dice cuántas de cada uno y salen en hojas carta de 30.
 *
 * Todo el estado vive en la dirección —lo marcado y lo pedido—, como los filtros del catálogo
 * (`AC-018`): se recarga, se comparte y funciona sin JavaScript. Aquí, sin base, está la lectura
 * de esos parámetros —la dirección la puede escribir cualquiera y nunca debe tumbar nada— y el
 * reparto en hojas. Las consultas viven en `catalogo.ts`.
 */

/** Hoja carta de 3 × 10 etiquetas de 2⅝" × 1", la que compra el cliente (validado 2026-09-29). */
export const POR_HOJA = 30;
/** Tope de productos marcados: una dirección escrita a mano no puede pedir el catálogo entero. */
export const MARCADOS_MAXIMO = 90;
/** Tope de copias de un producto, que es también el de etiquetas por pedido: diez hojas. */
export const COPIAS_MAXIMO = POR_HOJA * 10;
/** Cuántos resultados enseña una búsqueda. Con más, se afina la búsqueda. */
export const RESULTADOS = 40;

const ID = /^[0-9a-z-]{1,64}$/i;

const texto = (valor: string | string[] | undefined): string =>
  (Array.isArray(valor) ? valor.join(",") : valor) ?? "";

/** Los productos marcados, de `m=id,id`. Sin repetidos, en el orden en que se marcaron. */
export function leerMarcados(crudo: string | string[] | undefined): string[] {
  const ids = texto(crudo)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ID.test(s));
  return [...new Set(ids)].slice(0, MARCADOS_MAXIMO);
}

/** Marcar o desmarcar uno. Lo demás se queda como estaba: por eso sobrevive a otra búsqueda. */
export function alternar(marcados: readonly string[], id: string): string[] {
  return marcados.includes(id) ? marcados.filter((m) => m !== id) : [...marcados, id];
}

export type Pedido = { id: string; copias: number };

function acotar(copias: number): number {
  return Math.min(Math.max(Math.trunc(copias), 1), COPIAS_MAXIMO);
}

/** Lo pedido para imprimir, de `e=id:12,id:3`. Una copia si el número no se entiende. */
export function leerPedido(crudo: string | string[] | undefined): Pedido[] {
  const vistos = new Set<string>();
  const pedido: Pedido[] = [];
  for (const parte of texto(crudo).split(",")) {
    const [id = "", n = ""] = parte.trim().split(":");
    if (!ID.test(id) || vistos.has(id)) continue;
    vistos.add(id);
    const copias = Number(n);
    pedido.push({ id, copias: Number.isFinite(copias) ? acotar(copias) : 1 });
  }
  return pedido.slice(0, MARCADOS_MAXIMO);
}

/**
 * Lo pedido desde el formulario de «Cuántas de cada uno»: un `id` y un `n` por producto, en el mismo
 * orden. Es la forma que manda un formulario GET sin JavaScript.
 */
export function pedidoDeFormulario(
  ids: string | string[] | undefined,
  copias: string | string[] | undefined,
): Pedido[] {
  const lista = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v === undefined ? [] : [v]);
  const ns = lista(copias);
  return leerPedido(lista(ids).map((id, i) => `${id}:${ns[i] ?? ""}`));
}

export function comoPedido(pedido: readonly Pedido[]): string {
  return pedido.map((p) => `${p.id}:${acotar(p.copias)}`).join(",");
}

/** Cuántas se proponen de entrada: una por unidad que hay, y al menos una (`Etiquetas-3-Cuantas`). */
export function copiasSugeridas(existencias: number): number {
  return acotar(Math.max(existencias, 1));
}

export type Etiqueta = { nombre: string; precio: number; codigo: string };

/**
 * Las etiquetas en hojas. Se llenan en orden, y lo que sobra de la última queda en blanco para la
 * próxima vez; con más de treinta sale otra hoja. El total se corta en `COPIAS_MAXIMO`.
 */
export function enHojas(
  productos: readonly (Etiqueta & { id: string })[],
  pedido: readonly Pedido[],
): Etiqueta[][] {
  const todas: Etiqueta[] = [];
  for (const p of pedido) {
    const producto = productos.find((q) => q.id === p.id);
    if (!producto) continue;
    const { nombre, precio, codigo } = producto;
    for (let n = 0; n < p.copias && todas.length < COPIAS_MAXIMO; n++) todas.push({ nombre, precio, codigo });
  }
  const hojas: Etiqueta[][] = [];
  for (let i = 0; i < todas.length; i += POR_HOJA) hojas.push(todas.slice(i, i + POR_HOJA));
  return hojas;
}
