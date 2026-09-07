"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  agregar,
  cambiarCantidad,
  carritoVacio,
  estaVacio,
  total,
  unidades,
  type Carrito,
} from "@/domain/carrito";
import { nuevoId } from "@/domain/ids";
import { formatearPrecio } from "@/domain/moneda";
import type { CasillaDeVenta } from "@/domain/venta";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Existencias, Precio } from "@/ui/cifras";
import { confirmarVenta } from "./acciones";

type Estado = "armando" | "enviando" | "falloDeRed";

export function PantallaDeVenta({ casillas }: { casillas: CasillaDeVenta[] }) {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Carrito>(() => carritoVacio(nuevoId()));
  const [estado, setEstado] = useState<Estado>("armando");
  const [ultima, setUltima] = useState<number | null>(null);

  async function confirmar() {
    setEstado("enviando");
    try {
      const resultado = await confirmarVenta(
        carrito.id,
        carrito.articulos.map((a) => ({ productoId: a.productoId, cantidad: a.cantidad })),
      );
      // Sin diálogo que cerrar: la siguiente persona ya está esperando
      // (design-handoff.md § Interaction States).
      setUltima(resultado.total);
      setCarrito(carritoVacio(nuevoId()));
      setEstado("armando");
      router.refresh();
    } catch {
      // AC-015: no aparentar éxito. El carrito y su identificador se conservan, así que reintentar
      // es el mismo envío y no cobra dos veces (`AC-010`).
      setEstado("falloDeRed");
    }
  }

  const enviando = estado === "enviando";

  return (
    <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[1fr_22rem] lg:gap-6">
      <section className="px-4 pb-[19rem] pt-4 lg:pb-8" aria-label="Productos">
        {ultima !== null && estaVacio(carrito) ? (
          <p className="mb-4 text-[color:var(--color-text-muted)]" data-testid="venta-anterior">
            Venta registrada por {formatearPrecio(ultima)}. Lista la siguiente.
          </p>
        ) : null}

        {casillas.length === 0 ? (
          <p className="text-[color:var(--color-text-muted)]" data-testid="cuadricula-vacia">
            Todavía no hay productos. Da de alta el primero en el catálogo para empezar a vender.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {casillas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() =>
                    setCarrito((actual) =>
                      agregar(actual, { productoId: c.id, nombre: c.nombre, precio: c.precio }),
                    )
                  }
                  data-testid={`casilla-${c.id}`}
                  // `active:` es retroalimentación inmediata: si el dueño duda si lo añadió, lo
                  // toca dos veces y vende de más (design-handoff.md § Interaction States).
                  className="flex min-h-24 w-full flex-col justify-between rounded-[var(--radius-card)] border border-[color:var(--color-border-strong)] p-3 text-left active:bg-[color:var(--color-surface)]"
                >
                  <span className="line-clamp-2 font-medium">{c.nombre}</span>
                  <span>
                    <Precio valor={c.precio} className="block" />
                    <Existencias cantidad={c.existencias} alertarEnCero className="block" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <VentaEnCurso
        carrito={carrito}
        estado={estado}
        enviando={enviando}
        onCantidad={(id, cantidad) => setCarrito((actual) => cambiarCantidad(actual, id, cantidad))}
        onConfirmar={confirmar}
      />
    </div>
  );
}

function VentaEnCurso({
  carrito,
  estado,
  enviando,
  onCantidad,
  onConfirmar,
}: {
  carrito: Carrito;
  estado: Estado;
  enviando: boolean;
  onCantidad: (id: string, cantidad: number) => void;
  onConfirmar: () => void;
}) {
  const vacio = estaVacio(carrito);

  return (
    // Fija abajo en celular, columna propia en pantalla grande. El total no se pierde de vista en
    // ningún tamaño (design-handoff.md § Responsive Behavior, AC-X01).
    // No usa `BarraInferior` porque en pantalla grande deja de estar fija y pasa a ser una columna.
    <aside
      aria-label="Venta en curso"
      className="fixed inset-x-0 bottom-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] lg:sticky lg:top-4 lg:mt-4 lg:h-fit lg:border lg:border-[color:var(--color-border)] lg:rounded-[var(--radius-card)]"
    >
      <ul className="max-h-[38vh] overflow-y-auto px-4" data-testid="venta-en-curso">
        {carrito.articulos.map((a) => (
          <li key={a.productoId} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{a.nombre}</span>
              <Precio
                valor={a.precio * a.cantidad}
                className="block text-[color:var(--color-text-muted)]"
              />
            </span>
            <span className="flex items-center gap-1">
              <BotonCantidad
                etiqueta={`Quitar uno de ${a.nombre}`}
                onClick={() => onCantidad(a.productoId, a.cantidad - 1)}
              >
                −
              </BotonCantidad>
              <span
                className="min-w-8 text-center tabular-nums"
                data-testid={`cantidad-${a.productoId}`}
              >
                {a.cantidad}
              </span>
              <BotonCantidad
                etiqueta={`Agregar uno de ${a.nombre}`}
                onClick={() => onCantidad(a.productoId, a.cantidad + 1)}
              >
                +
              </BotonCantidad>
            </span>
          </li>
        ))}
      </ul>

      {estado === "falloDeRed" ? (
        // AC-015: decirlo sin rodeos. «Algo salió mal» deja al dueño sin saber si cobrar otra vez.
        <div className="mx-4 mb-2">
          <Aviso asertivo conBorde data-testid="fallo-de-red">
            No se guardó la venta. Nada se descontó. Toca Reintentar.
          </Aviso>
        </div>
      ) : null}

      <div className="flex items-center gap-4 border-t border-[color:var(--color-border)] p-4">
        <span className="flex-1">
          <span className="block text-[color:var(--color-text-muted)]">
            Total · {unidades(carrito)} {unidades(carrito) === 1 ? "artículo" : "artículos"}
          </span>
          <span
            className="block font-semibold tabular-nums [font-size:var(--text-total)] leading-none"
            data-testid="total"
          >
            {formatearPrecio(total(carrito))}
          </span>
        </span>
        <Boton
          type="button"
          variante="principal"
          onClick={onConfirmar}
          disabled={vacio || enviando}
          data-testid="confirmar"
          tamano="alto"
          className="shrink-0 px-6"
        >
          {enviando ? "Guardando…" : estado === "falloDeRed" ? "Reintentar" : "Confirmar"}
        </Boton>
      </div>
    </aside>
  );
}

function BotonCantidad({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Boton type="button" aria-label={etiqueta} onClick={onClick} className="w-12 px-0 text-xl">
      {children}
    </Boton>
  );
}
