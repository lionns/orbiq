"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ObjetivoDeEscaneo } from "@/ui/objetivo-de-escaneo";
import { buscarPorCodigo } from "../acciones";

/**
 * El mismo objetivo de escaneo de la venta, aquí para consultar (`FR-002`: «consultar un
 * producto»). Cambia solo qué se hace con el código: en la venta se añade al carrito, aquí se abre
 * la ficha. El componente no sabe la diferencia, que es lo que lo hace uno solo.
 *
 * Sin campo propio: va dentro de la fila de búsqueda del catálogo, que ya acepta nombre o código.
 * Añadir uno segundo empujaba la lista 64 px hacia abajo y la sacaba del pliegue a 360 px — lo
 * detectó la prueba de `T-005`, no una revisión.
 */
export function BuscadorPorCodigo() {
  const router = useRouter();
  const [noEncontrado, setNoEncontrado] = useState<string | null>(null);

  async function alEscanear(codigo: string) {
    const resuelto = await buscarPorCodigo(codigo);
    if (resuelto.ok) {
      setNoEncontrado(null);
      router.push(`/catalogo/${resuelto.producto.id}`);
      return;
    }
    setNoEncontrado(resuelto.codigo);
  }

  return (
    <>
      <ObjetivoDeEscaneo onCodigo={alEscanear} conCampo={false} comoEscanear />
      {noEncontrado ? (
        // Las mismas dos salidas que en la venta, en el mismo orden (`AC-025`): si el proveedor
        // cambió el código, lo que falta es añadirlo al producto, no darlo de alta otra vez.
        <p className="basis-full" role="alert" data-testid="codigo-no-encontrado">
          Ningún producto tiene el código {noEncontrado}.{" "}
          <a
            href={`/catalogo/codigo?codigo=${encodeURIComponent(noEncontrado)}`}
            className="font-semibold text-accent"
          >
            Añadirlo a un producto
          </a>{" "}
          o{" "}
          <a
            href={`/catalogo/nuevo?codigo=${encodeURIComponent(noEncontrado)}`}
            className="font-semibold text-accent"
          >
            darlo de alta
          </a>
          .
        </p>
      ) : null}
    </>
  );
}
