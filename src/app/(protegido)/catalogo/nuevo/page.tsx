import Link from "next/link";
import { Icono } from "@/ui/iconos";
import { categoriasExistentes } from "@/domain/catalogo";
import { FormularioProducto } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NuevoProducto({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  // Se llega aquí desde el catálogo tras escanear un código que nadie tiene: el alta empieza con
  // ese código puesto, no en blanco (`AC-007`).
  const [categorias, { codigo }] = await Promise.all([categoriasExistentes(), searchParams]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/catalogo" className="flex items-center gap-1.5 font-medium text-text-muted">
        <Icono nombre="volver" />
        Volver al catálogo
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nuevo producto</h1>
      <FormularioProducto categorias={categorias} codigo={codigo ?? ""} />
    </main>
  );
}
