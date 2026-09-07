import Link from "next/link";
import { categoriasExistentes } from "@/domain/catalogo";
import { FormularioProducto } from "./formulario";

export const dynamic = "force-dynamic";

export default async function NuevoProducto() {
  const categorias = await categoriasExistentes();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link href="/catalogo" className="text-text-muted underline">
        Volver al catálogo
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nuevo producto</h1>
      <FormularioProducto categorias={categorias} />
    </main>
  );
}
