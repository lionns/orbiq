import Link from "next/link";
import { redirect } from "next/navigation";
import { productosMarcados } from "@/domain/catalogo";
import { copiasSugeridas, leerMarcados } from "@/domain/etiquetas";
import { Icono } from "@/ui/iconos";
import { FormularioCuantas } from "./formulario";

export const dynamic = "force-dynamic";

/** Cuántas de cada uno (`.diseno/etiquetas/Etiquetas-3-Cuantas`). Empieza en una por unidad que hay. */
export default async function Cuantas({
  searchParams,
}: {
  searchParams: Promise<{ m?: string | string[] }>;
}) {
  const marcados = leerMarcados((await searchParams).m);
  const productos = await productosMarcados(marcados);
  if (productos.length === 0) redirect("/catalogo/etiquetas");

  return (
    <main className="mx-auto max-w-2xl px-4 pt-1 pb-44 lg:pt-8 lg:pb-8">
      <Link
        href={`/catalogo/etiquetas?m=${productos.map((p) => p.id).join(",")}`}
        className="-ml-1 flex min-h-12 w-fit items-center gap-1.5 pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Seguir marcando
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Cuántas de cada uno</h1>
      <p className="mt-1 mb-4 text-text-muted">
        Empieza con una por unidad que hay. Cámbialo si hace falta.
      </p>
      <FormularioCuantas
        productos={productos.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          codigo: p.codigo,
          sugeridas: copiasSugeridas(p.existencias),
        }))}
      />
    </main>
  );
}
