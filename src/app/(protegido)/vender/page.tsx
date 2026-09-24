import { cuadricula } from "@/domain/venta";
import { PantallaDeVenta } from "../venta";

/**
 * La venta, a un toque desde cualquier pantalla: en la barra de abajo del celular y en el menú del
 * computador. Dejó de ser la portada cuando llegó Inicio (`T-029`), pero sigue siendo lo que el
 * dueño abre cien veces al día (`US-005`).
 */
export const dynamic = "force-dynamic";

export default async function Vender() {
  const casillas = await cuadricula();
  return <PantallaDeVenta casillas={casillas} />;
}
