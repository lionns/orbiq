import Link from "next/link";
import { notFound } from "next/navigation";
import { esDeLaTienda } from "@/domain/ean13";
import { copiasSugeridas } from "@/domain/etiquetas";
import { libroDelProducto } from "@/domain/movimientos";
import { CodigoDeBarras } from "@/ui/codigo-de-barras";
import { Icono } from "@/ui/iconos";
import { ImprimirDelCodigo } from "./imprimir";

export const dynamic = "force-dynamic";

/**
 * «Código listo» (`.diseno/etiquetas/Generado`): el código recién generado, lo que pasó con las
 * unidades que había y cuántas etiquetas imprimir. «Ahora no» vuelve a la ficha; las etiquetas se
 * pueden imprimir después desde ahí o desde Productos.
 */
export default async function CodigoListo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pasaron?: string }>;
}) {
  const [{ id }, { pasaron: crudo }] = await Promise.all([params, searchParams]);
  const libro = await libroDelProducto(id);
  const codigo = libro?.porCodigo.codigos.find((c) => esDeLaTienda(c.numero));
  if (!libro || !codigo) notFound();
  const pasaron = Math.max(Number(crudo) || 0, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-1 pb-44 lg:pt-8 lg:pb-8">
      <Link
        href={`/catalogo/${id}`}
        className="-ml-1 flex min-h-12 w-fit items-center gap-1.5 pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        {libro.producto.nombre}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Código listo</h1>
      <p className="mt-1 mb-5 text-text-muted">
        Es de la tienda: empieza por 2 y no choca con ningún código de fábrica.
      </p>

      <section className="flex flex-col items-center gap-2.5 rounded-card border border-border bg-white px-5 py-6 text-black">
        <span className="font-semibold">{libro.producto.nombre}</span>
        <CodigoDeBarras codigo={codigo.numero} className="h-18 w-60" />
        <span className="font-semibold tracking-[0.15em] tabular-nums" data-testid="codigo-generado">
          {codigo.numero}
        </span>
      </section>

      {pasaron > 0 ? (
        <div
          className="mt-4 flex items-start gap-3 rounded-button bg-accent-soft px-4 py-3.5"
          data-testid="pasaron"
        >
          <Icono nombre="etiquetado" className="mt-0.5 text-accent" />
          <p>
            <strong>
              {pasaron === 1 ? "La que hay pasa" : `Las ${pasaron} que hay pasan`} a este código.
            </strong>
            <span className="block text-text-muted">
              El total no cambia. Queda en el historial como «Etiquetado».
            </span>
          </p>
        </div>
      ) : null}

      <ImprimirDelCodigo
        id={id}
        nombre={libro.producto.nombre}
        inicial={copiasSugeridas(libro.saldoMaterializado)}
        volver={`/catalogo/${id}`}
      />
    </main>
  );
}
