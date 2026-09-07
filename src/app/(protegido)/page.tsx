import Link from "next/link";
import { cuadricula } from "@/domain/venta";
import { PantallaDeVenta } from "./venta";

/** La venta es la portada: es lo que el dueño abre cien veces al día (`US-005`). */
export const dynamic = "force-dynamic";

export default async function Venta() {
  const casillas = await cuadricula();

  return (
    <>
      <PantallaDeVenta casillas={casillas} />
      {/* Navegación fuera del flujo de venta, arriba, donde no estorba al pulgar. */}
      <Link href="/catalogo" className="sr-only focus:not-sr-only">
        Ir al catálogo
      </Link>
    </>
  );
}
