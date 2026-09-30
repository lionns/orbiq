import { productosMarcados } from "@/domain/catalogo";
import { enHojas, leerPedido, pedidoDeFormulario } from "@/domain/etiquetas";
import { hojaEnPdf } from "@/domain/hoja-pdf";
import { sesionActual } from "@/domain/session";

/**
 * La hoja de etiquetas en PDF (`T-038`). En el celular es lo único que se puede imprimir: la app
 * abierta desde su ícono no tiene menú del navegador, y en iPhone `window.print()` no hace nada.
 *
 * Una ruta, no una página: el marco protegido no la cubre, así que pide la sesión ella misma
 * (`AC-001`). Recibe lo mismo que la hoja: `e=id:12,…` o los `id` y `n` del formulario.
 */
export async function GET(peticion: Request): Promise<Response> {
  const sesion = await sesionActual(peticion.headers);
  if (!sesion) return Response.redirect(new URL("/acceso", peticion.url), 303);

  const p = new URL(peticion.url).searchParams;
  const pedido = p.has("e") ? leerPedido(p.getAll("e")) : pedidoDeFormulario(p.getAll("id"), p.getAll("n"));
  const productos = await productosMarcados(pedido.map((x) => x.id));
  const hojas = enHojas(productos, pedido);
  if (hojas.length === 0) return new Response("No hay etiquetas que imprimir.", { status: 404 });

  return new Response(hojaEnPdf(hojas), {
    headers: {
      "Content-Type": "application/pdf",
      // `inline`: el navegador lo abre en su visor, que ya trae imprimir y guardar. El enlace
      // «Descargar PDF» pide la descarga con su atributo `download`.
      "Content-Disposition": 'inline; filename="etiquetas.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
