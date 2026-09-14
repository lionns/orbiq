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
import { Campo } from "@/ui/campo";
import { Cantidad, Existencias, Precio } from "@/ui/cifras";
import { ObjetivoDeEscaneo } from "@/ui/objetivo-de-escaneo";
import { altaRapida, buscarEnVenta, confirmarVenta } from "./acciones";

type Estado = "armando" | "enviando" | "falloDeRed";

/** Lo último que dijo el objetivo de escaneo. Se muestra junto a él, no en otra pantalla. */
type Hallazgo =
  | { tipo: "nada" }
  | { tipo: "anadido"; nombre: string }
  | { tipo: "desconocido"; codigo: string }
  /** Lo buscado por nombre. Los resultados sustituyen a la cuadrícula, no se apilan sobre ella. */
  | { tipo: "resultados"; texto: string; resultados: CasillaDeVenta[] };

export function PantallaDeVenta({ casillas }: { casillas: CasillaDeVenta[] }) {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Carrito>(() => carritoVacio(nuevoId()));
  const [estado, setEstado] = useState<Estado>("armando");
  const [ultima, setUltima] = useState<number | null>(null);
  const [hallazgo, setHallazgo] = useState<Hallazgo>({ tipo: "nada" });

  /**
   * El único camino para añadir, venga de la cuadrícula, de un resultado o del escaneo.
   *
   * El aviso es del que llega **a ciegas**: quien escanea no vio qué producto era hasta que se lo
   * dicen. Quien toca una casilla ya sabe cuál tocó, y meterle una línea encima desplazaría la
   * cuadrícula bajo el dedo entre un toque y el siguiente.
   */
  function alCarrito(
    producto: { id: string; nombre: string; precio: number },
    aviso: Hallazgo = { tipo: "nada" },
  ) {
    setCarrito((actual) =>
      agregar(actual, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
      }),
    );
    setHallazgo(aviso);
  }

  /**
   * La única salida del objetivo. Da igual si llegó por cámara, por lector o tecleado (`AC-006`), y
   * da igual si era un código o un nombre: quien lo decide es la función de dominio, en un solo
   * viaje al servidor (`FR-015`).
   */
  async function alEscanear(texto: string) {
    const entrada = await buscarEnVenta(texto);
    if (entrada.tipo === "producto") {
      return alCarrito(entrada.producto, { tipo: "anadido", nombre: entrada.producto.nombre });
    }
    if (entrada.tipo === "codigoDesconocido") {
      return setHallazgo({ tipo: "desconocido", codigo: entrada.codigo });
    }
    setHallazgo({ tipo: "resultados", texto: entrada.texto, resultados: entrada.resultados });
  }

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
  // Una lista u otra, nunca las dos: los resultados ocupan el sitio de los frecuentes.
  const buscando = hallazgo.tipo === "resultados" && hallazgo.resultados.length > 0;
  const mostrando = buscando ? hallazgo.resultados : casillas;

  return (
    <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[1fr_22rem] lg:gap-6">
      <section className="px-4 pb-[19rem] pt-4 lg:pb-8" aria-label="Productos">
        <div className="mb-4">
          <ObjetivoDeEscaneo
            onCodigo={alEscanear}
            etiqueta="Nombre o código"
            admiteNombre
            onVaciar={() => setHallazgo({ tipo: "nada" })}
          />
          {hallazgo.tipo === "anadido" ? (
            <p className="mt-2 text-text-muted" data-testid="escaneo-anadido">
              Añadido: {hallazgo.nombre}
            </p>
          ) : null}
          {hallazgo.tipo === "resultados" && hallazgo.resultados.length === 0 ? (
            <p className="mt-2" role="alert" data-testid="sin-resultados">
              Ningún producto se llama «{hallazgo.texto}».
            </p>
          ) : null}
          {hallazgo.tipo === "desconocido" ? (
            // `AC-007`: se ofrece darlo de alta sin salir de aquí. La venta es estado de esta
            // pantalla, así que no navegar es lo que garantiza que no se pierda.
            <AltaRapida
              codigo={hallazgo.codigo}
              onCreado={alCarrito}
              onDescartar={() => setHallazgo({ tipo: "nada" })}
            />
          ) : null}
        </div>

        {ultima !== null && estaVacio(carrito) ? (
          <p className="mb-4 text-text-muted" data-testid="venta-anterior">
            Venta registrada por {formatearPrecio(ultima)}. Lista la siguiente.
          </p>
        ) : null}

        {buscando ? (
          <p className="mb-3 text-text-muted" data-testid="encabezado-resultados">
            {mostrando.length === 1
              ? `1 resultado para «${hallazgo.texto}»`
              : `${mostrando.length} resultados para «${hallazgo.texto}»`}
          </p>
        ) : null}

        {mostrando.length === 0 && !buscando ? (
          <p className="text-text-muted" data-testid="cuadricula-vacia">
            Todavía no hay productos. Da de alta el primero en el catálogo para empezar a vender.
          </p>
        ) : (
          // `auto-rows-fr` iguala el alto de todas las filas; sin él, una fila cuyos nombres caben
          // en una línea encoge y la cuadrícula queda dentada.
          <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {mostrando.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  // Un solo camino para añadir, venga de la cuadrícula o de un resultado: es lo
                  // que hace que tocar un resultado devuelva los frecuentes sin código aparte.
                  onClick={() => alCarrito(c)}
                  data-testid={`casilla-${c.id}`}
                  data-tarjeta
                  // `active:` es retroalimentación inmediata: si el dueño duda si lo añadió, lo
                  // toca dos veces y vende de más (design-handoff.md § Interaction States).
                  // `h-full`: el `<li>` se estira al alto de su fila, pero el botón no lo sigue si
                  // no se le dice. Sin esto, en una fila con un nombre largo el vecino queda corto.
                  className="flex h-full min-h-24 w-full flex-col justify-between rounded-card border border-border-strong bg-surface p-3 text-left active:bg-bg"
                >
                  {/* `design-handoff.md` § La jerarquía la hace el tamaño: 24 el precio, 18 el
                      nombre, 16 las existencias — que no bajan de 16 aunque sean la nota. */}
                  <span className="line-clamp-2 text-lg font-medium">{c.nombre}</span>
                  <span>
                    <Precio valor={c.precio} className="block text-2xl font-semibold" />
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
      className="fixed inset-x-0 bottom-0 border-t border-border bg-bg lg:sticky lg:top-4 lg:mt-4 lg:h-fit lg:border lg:border-border lg:rounded-card"
    >
      <ul className="max-h-[38vh] overflow-y-auto px-4" data-testid="venta-en-curso">
        {carrito.articulos.map((a) => (
          <li key={a.productoId} className="flex items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{a.nombre}</span>
              <Precio
                valor={a.precio * a.cantidad}
                className="block text-text-muted"
              />
            </span>
            <span className="flex items-center gap-1">
              <BotonCantidad
                etiqueta={`Quitar uno de ${a.nombre}`}
                onClick={() => onCantidad(a.productoId, a.cantidad - 1)}
              >
                −
              </BotonCantidad>
              <Cantidad
                valor={a.cantidad}
                className="min-w-8 text-center"
                data-testid={`cantidad-${a.productoId}`}
              />
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

      <div className="flex items-center gap-4 border-t border-border p-4">
        <span className="flex-1">
          <span className="block text-text-muted">
            Total · {unidades(carrito)} {unidades(carrito) === 1 ? "artículo" : "artículos"}
          </span>
          {/* El total es un precio, así que sale por donde salen los precios. Antes formateaba
              por su cuenta y repetía las cifras tabulares. */}
          <Precio
            valor={total(carrito)}
            className="block font-semibold text-total leading-none"
            data-testid="total"
          />
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

/**
 * El alta de un código desconocido, dentro de la pantalla de venta (`FR-003`, `AC-007`).
 *
 * No navega a ninguna parte a propósito: la venta en curso vive en el estado de esta pantalla, y
 * cualquier navegación la perdería. Pide lo mínimo para poder cobrar y deja el resto del producto
 * para su ficha.
 */
function AltaRapida({
  codigo,
  onCreado,
  onDescartar,
}: {
  codigo: string;
  onCreado: (producto: { id: string; nombre: string; precio: number }) => void;
  onDescartar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError({});
    try {
      const resultado = await altaRapida(codigo, nombre, precio);
      if (!resultado.ok) return setError({ [resultado.campo]: resultado.mensaje });
      onCreado({ id: resultado.id, nombre: nombre.trim(), precio: Number(precio) });
    } catch {
      setError({ nombre: "No se guardó. Revisa la conexión y vuelve a intentarlo." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="mt-2 rounded-card border border-border-strong bg-surface p-3"
      data-testid="alta-rapida"
    >
      <p className="mb-2 font-medium">Ese código no está. Dalo de alta y sigue vendiendo.</p>
      <p className="mb-2 text-text-muted">Código {codigo}</p>
      <div className="flex flex-col gap-2">
        <Campo
          etiqueta="Nombre"
          nombre="nombre-rapido"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={error.nombre}
          data-testid="alta-rapida-nombre"
        />
        <Campo
          etiqueta="Precio"
          nombre="precio-rapido"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          error={error.precio ?? error.codigoDeBarras}
          inputMode="numeric"
          data-testid="alta-rapida-precio"
        />
        <div className="flex gap-2">
          <Boton
            type="button"
            variante="principal"
            onClick={guardar}
            disabled={guardando}
            data-testid="alta-rapida-guardar"
          >
            {guardando ? "Guardando…" : "Dar de alta y añadir"}
          </Boton>
          <Boton type="button" onClick={onDescartar} data-testid="alta-rapida-descartar">
            Ahora no
          </Boton>
        </div>
      </div>
    </div>
  );
}
