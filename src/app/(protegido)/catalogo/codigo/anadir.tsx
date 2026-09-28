"use client";

import { useRouter } from "next/navigation";
import { AnadirAProducto } from "../../codigo-desconocido";

export function AnadirCodigoDesdeProductos({ codigo }: { codigo: string }) {
  const router = useRouter();
  return (
    <AnadirAProducto
      codigo={codigo}
      textoListo="Añadir el código"
      textoCancelar="Productos"
      onCancelar={() => router.push("/catalogo")}
      onNuevo={() => router.push(`/catalogo/nuevo?codigo=${encodeURIComponent(codigo)}`)}
      onListo={({ producto }) => router.push(`/catalogo/${producto.id}`)}
    />
  );
}
