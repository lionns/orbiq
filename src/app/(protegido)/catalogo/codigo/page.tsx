import { redirect } from "next/navigation";
import { puede } from "@/domain/permisos";
import { sesionDeLaPeticion } from "../../sesion";
import { AnadirCodigoDesdeProductos } from "./anadir";

/**
 * «Añadirlo a un producto», desde un código desconocido escaneado en Productos (`AC-025`). El mismo
 * flujo que en la venta; al terminar abre la ficha, donde se ve el código con su cantidad.
 */
export default async function PaginaAnadirCodigo({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  // Añadir un código es editar el producto: es del dueño (`D-013`). La acción lo rechaza igual.
  if (!puede((await sesionDeLaPeticion())?.rol, "editarProducto")) redirect("/catalogo");
  const { codigo } = await searchParams;
  if (!codigo?.trim()) redirect("/catalogo");
  return (
    <main className="mx-auto max-w-2xl px-4 pt-1 pb-6 lg:pt-8">
      <AnadirCodigoDesdeProductos codigo={codigo.trim()} />
    </main>
  );
}
