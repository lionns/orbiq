import { PantallaDeVenta } from "../venta";

/**
 * La venta, a un toque desde cualquier pantalla: en la barra de abajo del celular y en el menú del
 * computador. Dejó de ser la portada cuando llegó Inicio (`T-029`), pero sigue siendo lo que el
 * dueño abre cien veces al día (`US-005`). Desde `T-033` no consulta nada al abrir: se ve solo la
 * venta, y la venta vive en el dispositivo hasta cobrarla.
 */
export default function Vender() {
  return <PantallaDeVenta />;
}
