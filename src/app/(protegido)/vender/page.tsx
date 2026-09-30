import { puede } from "@/domain/permisos";
import { aQuienAvisar } from "@/domain/personas";
import { sesionDeLaPeticion } from "../sesion";
import { PantallaDeVenta } from "../venta";

/**
 * La venta, a un toque desde cualquier pantalla: en la barra de abajo del celular y en el menú del
 * computador. Dejó de ser la portada cuando llegó Inicio (`T-029`), pero sigue siendo lo que el
 * dueño abre cien veces al día (`US-005`). Desde `T-033` no consulta nada al abrir: se ve solo la
 * venta, y la venta vive en el dispositivo hasta cobrarla.
 *
 * La sesión ya la leyó el marco en esta petición (`T-036`); el nombre del dueño solo se busca para
 * un empleado, que es a quien hay que decirle a quién avisar (`D-013`).
 */
export default async function Vender() {
  const sesion = await sesionDeLaPeticion();
  const anular = puede(sesion?.rol, "anular");
  const darDeAlta = puede(sesion?.rol, "editarProducto");
  const dueno = darDeAlta ? "" : await aQuienAvisar();
  return <PantallaDeVenta permisos={{ anular, darDeAlta, dueno }} />;
}
