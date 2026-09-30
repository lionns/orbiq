import Link from "next/link";
import { redirect } from "next/navigation";
import { productosMarcados } from "@/domain/catalogo";
import { enHojas, leerPedido, pedidoDeFormulario } from "@/domain/etiquetas";
import { formatearPrecio } from "@/domain/moneda";
import { CodigoDeBarras } from "@/ui/codigo-de-barras";
import { Icono } from "@/ui/iconos";
import { BotonImprimir } from "./imprimir";

export const dynamic = "force-dynamic";

/**
 * La hoja carta de 30 etiquetas (`.diseno/etiquetas/Hoja`, `D-012`): 3 columnas × 10 filas de
 * 2⅝" × 1", con 0,5" arriba y 3⁄16" a los lados, las medidas de la hoja que compra el cliente.
 * Cada etiqueta lleva nombre, precio, las barras y el número.
 *
 * Llega de dos formas: `e=id:12,id:3`, o el formulario de «Cuántas de cada uno» (`id` y `n`).
 */
export default async function Hoja({
  searchParams,
}: {
  searchParams: Promise<{ e?: string | string[]; id?: string | string[]; n?: string | string[] }>;
}) {
  const crudos = await searchParams;
  const pedido = crudos.e !== undefined ? leerPedido(crudos.e) : pedidoDeFormulario(crudos.id, crudos.n);
  const ids = pedido.map((p) => p.id);
  const productos = await productosMarcados(ids);
  const hojas = enHojas(productos, pedido);
  if (hojas.length === 0) redirect("/catalogo/etiquetas");
  const total = hojas.reduce((s, h) => s + h.length, 0);

  return (
    <main className="px-4 pt-1 pb-8 print:p-0">
      {/* Sin márgenes de la impresora: las medidas de la hoja ya los traen. Es CSS a mano porque
          `@page` no tiene utilidad de Tailwind. */}
      <style>{"@page { size: letter; margin: 0; } @media print { body { background: #fff; } }"}</style>

      <div className="mx-auto max-w-2xl print:hidden">
        <Link
          href={`/catalogo/etiquetas/cuantas?m=${productos.map((p) => p.id).join(",")}`}
          className="-ml-1 flex min-h-12 w-fit items-center gap-1.5 pr-3 font-semibold text-text-muted"
        >
          <Icono nombre="volver" />
          Cuántas de cada uno
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Hoja de etiquetas</h1>
        <p className="mt-1 text-text-muted tabular-nums" data-testid="resumen-hoja">
          {total === 1 ? "1 etiqueta" : `${total} etiquetas`} en{" "}
          {hojas.length === 1 ? "1 hoja carta" : `${hojas.length} hojas carta`}. Pon la hoja de
          etiquetas en la impresora y elige tamaño carta, sin márgenes y al 100 %.
        </p>
        <BotonImprimir className="mt-4 mb-6 w-full text-lg" />
      </div>

      {/* En pantalla la hoja se ve reducida para caber en un celular; al imprimir sale a su tamaño. */}
      <div className="flex flex-col items-center gap-6 print:block print:gap-0">
        {hojas.map((hoja, h) => (
          <section
            key={h}
            aria-label={`Hoja ${h + 1}`}
            className="relative h-[11in] w-[8.5in] shrink-0 bg-white text-black shadow-lg max-lg:[zoom:0.42] print:not-last:break-after-page print:shadow-none print:[zoom:1]"
            data-testid="hoja"
          >
            {hoja.map((e, i) => (
              <div
                key={i}
                className="absolute flex h-[1in] w-[2.625in] flex-col items-center justify-center gap-[0.02in] overflow-hidden rounded-[0.06in] outline outline-1 outline-dashed outline-neutral-300 print:outline-none"
                style={{ left: `${0.1875 + (i % 3) * 2.75}in`, top: `${0.5 + Math.floor(i / 3)}in` }}
                data-testid="etiqueta"
              >
                <span className="flex w-[2.2in] justify-between gap-2 text-[8pt] leading-tight font-bold">
                  <span className="truncate">{e.nombre}</span>
                  <span className="shrink-0 tabular-nums">{formatearPrecio(e.precio)}</span>
                </span>
                <CodigoDeBarras codigo={e.codigo} className="h-[0.5in] w-[1.75in]" />
                <span className="text-[8pt] leading-none tracking-[0.15em] tabular-nums">{e.codigo}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
