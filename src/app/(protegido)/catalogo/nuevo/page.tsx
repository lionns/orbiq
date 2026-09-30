import Link from "next/link";
import { redirect } from "next/navigation";
import { categoriasExistentes } from "@/domain/catalogo";
import { comoDireccion, leerFiltros, type ParametrosCrudos } from "@/domain/filtros";
import { puede } from "@/domain/permisos";
import { Icono } from "@/ui/iconos";
import { sesionDeLaPeticion } from "../../sesion";
import { FormularioProducto } from "./formulario";

export const dynamic = "force-dynamic";

/**
 * El alta como pantalla propia: la del celular, sin la barra de secciones —abajo vive «Guardar»—.
 * En computador el alta se abre al lado de la lista (`/catalogo?nuevo=1`), pero esta dirección
 * sigue sirviendo: la usan los enlaces de «Darlo de alta» tras un código desconocido.
 */
export default async function NuevoProducto({
  searchParams,
}: {
  searchParams: Promise<ParametrosCrudos & { codigo?: string }>;
}) {
  // Se llega aquí desde el catálogo tras escanear un código que nadie tiene: el alta empieza con
  // ese código puesto, no en blanco (`AC-007`).
  // Dar de alta pone un precio: es del dueño (`D-013`). La acción lo rechaza igual.
  if (!puede((await sesionDeLaPeticion())?.rol, "editarProducto")) redirect("/catalogo");
  const crudos = await searchParams;
  const lista = comoDireccion(leerFiltros(crudos));
  const codigo = typeof crudos.codigo === "string" ? crudos.codigo : "";
  const categorias = await categoriasExistentes();

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-4 pt-1 pb-6 lg:pt-8">
      <Link
        href={lista}
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Productos
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Nuevo producto</h1>
      <FormularioProducto categorias={categorias} codigo={codigo} cancelar={lista} />
    </main>
  );
}
