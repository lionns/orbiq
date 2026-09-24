"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  agregar,
  cambiarCantidad,
  carritoVacio,
  estaVacio,
  total,
  unidades,
  type ArticuloEnVenta,
  type Carrito,
} from "@/domain/carrito";
import { nuevoId } from "@/domain/ids";
import { formatearPrecio } from "@/domain/moneda";
import type { CasillaDeVenta } from "@/domain/venta";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Existencias, Precio } from "@/ui/cifras";
import { Icono } from "@/ui/iconos";
import { ObjetivoDeEscaneo } from "@/ui/objetivo-de-escaneo";
import { altaRapida, buscarEnVenta, confirmarVenta, deshacerVenta } from "./acciones";
import { guardarVenta, leerVentaGuardada } from "./venta-guardada";

type Estado = "armando" | "enviando" | "falloDeRed";

/** Lo último que dijo el objetivo de escaneo. Se muestra junto a él, no en otra pantalla. */
type Hallazgo =
  | { tipo: "nada" }
  | { tipo: "anadido"; nombre: string }
  | { tipo: "desconocido"; codigo: string }
  /** Lo buscado por nombre. Los resultados sustituyen a la cuadrícula, no se apilan sobre ella. */
  | { tipo: "resultados"; texto: string; resultados: CasillaDeVenta[] };

/**
 * Lo que acaba de pasar y todavía se puede deshacer. Sin diálogo que cerrar: un aviso con su
 * «Deshacer» que se va solo (`.diseno/cobalto/U-M-Cobrada`, `U-M-Vaciada`, puntos 11 y 14).
 */
type Reciente =
  | { tipo: "nada" }
  | { tipo: "cobrada"; ventaId: string; total: number; carrito: Carrito }
  | { tipo: "vaciada"; carrito: Carrito }
  | { tipo: "deshecha" }
  | { tipo: "noSeDeshizo"; mensaje: string };

/** Lo que dura un «Deshacer» a la vista. Después, anular sigue en el detalle de la venta. */
const VIDA_DEL_AVISO = 10_000;

export function PantallaDeVenta({ casillas }: { casillas: CasillaDeVenta[] }) {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Carrito>(() => carritoVacio(nuevoId()));
  const [cargada, setCargada] = useState(false);
  const [estado, setEstado] = useState<Estado>("armando");
  const [reciente, setReciente] = useState<Reciente>({ tipo: "nada" });
  const [hallazgo, setHallazgo] = useState<Hallazgo>({ tipo: "nada" });
  const [camara, setCamara] = useState(false);
  const [abierta, setAbierta] = useState(false);

  // La venta en curso vuelve del dispositivo al entrar (punto 1). Se lee tras montar y no al
  // renderizar: el servidor no tiene dispositivo, y leerlo antes daría una pantalla distinta en el
  // servidor y en el navegador.
  useEffect(() => {
    const guardada = leerVentaGuardada();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el almacenamiento del dispositivo, que el servidor no ve
    if (guardada) setCarrito(guardada);
    setCargada(true);
  }, []);
  useEffect(() => {
    if (cargada) guardarVenta(carrito);
  }, [carrito, cargada]);

  // El aviso con «Deshacer» se va solo; el siguiente toque ya es otra venta.
  useEffect(() => {
    if (reciente.tipo === "nada") return;
    const t = setTimeout(() => setReciente({ tipo: "nada" }), VIDA_DEL_AVISO);
    return () => clearTimeout(t);
  }, [reciente]);

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
      agregar(actual, { productoId: producto.id, nombre: producto.nombre, precio: producto.precio }),
    );
    setHallazgo(aviso);
    setReciente({ tipo: "nada" });
  }

  /**
   * La única salida del objetivo. Da igual si llegó por cámara, por lector o tecleado (`AC-006`), y
   * da igual si era un código o un nombre: quien lo decide es la función de dominio, en un solo
   * viaje al servidor (`FR-015`). Devuelve si el campo se vacía: sí cuando entró un producto, para
   * que el siguiente código de un lector no caiga pegado a este.
   */
  async function alEscanear(texto: string): Promise<boolean> {
    const entrada = await buscarEnVenta(texto);
    if (entrada.tipo === "producto") {
      alCarrito(entrada.producto, { tipo: "anadido", nombre: entrada.producto.nombre });
      return true;
    }
    if (entrada.tipo === "codigoDesconocido") {
      setHallazgo({ tipo: "desconocido", codigo: entrada.codigo });
      return false;
    }
    setHallazgo({ tipo: "resultados", texto: entrada.texto, resultados: entrada.resultados });
    return false;
  }

  async function confirmar() {
    if (estaVacio(carrito) || estado === "enviando") return;
    setEstado("enviando");
    try {
      const resultado = await confirmarVenta(
        carrito.id,
        carrito.articulos.map((a) => ({ productoId: a.productoId, cantidad: a.cantidad })),
      );
      // Sin diálogo que cerrar: la siguiente persona ya está esperando
      // (design-handoff.md § Interaction States). Queda el aviso con «Deshacer».
      setReciente({ tipo: "cobrada", ventaId: carrito.id, total: resultado.total, carrito });
      setCarrito(carritoVacio(nuevoId()));
      setAbierta(false);
      setEstado("armando");
      router.refresh();
    } catch {
      // AC-015: no aparentar éxito. El carrito y su identificador se conservan, así que reintentar
      // es el mismo envío y no cobra dos veces (`AC-010`).
      setEstado("falloDeRed");
    }
  }

  /**
   * Deshacer un cobro es anularlo, con la misma acción que el detalle de la venta, y devolver lo
   * que llevaba al carrito para corregirlo. Con un identificador nuevo: el viejo ya es una venta
   * anulada, y reusarlo haría que cobrar otra vez no hiciera nada (`AC-010`).
   */
  async function deshacerCobro(r: Extract<Reciente, { tipo: "cobrada" }>) {
    const resultado = await deshacerVenta(r.ventaId);
    if (!resultado.ok) return setReciente({ tipo: "noSeDeshizo", mensaje: resultado.mensaje });
    setCarrito({ ...r.carrito, id: nuevoId() });
    setReciente({ tipo: "deshecha" });
    router.refresh();
  }

  function vaciar() {
    setReciente({ tipo: "vaciada", carrito });
    setCarrito(carritoVacio(nuevoId()));
    setAbierta(false);
    setEstado("armando");
  }

  // En computador, F2 cobra (punto 13). Solo F2: Enter lo usa el lector de códigos.
  const cobrar = useRef(confirmar);
  useEffect(() => {
    cobrar.current = confirmar;
  });
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key !== "F2") return;
      evento.preventDefault();
      void cobrar.current();
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, []);

  const enviando = estado === "enviando";
  // Una lista u otra, nunca las dos: los resultados ocupan el sitio de los frecuentes.
  const buscando = hallazgo.tipo === "resultados" && hallazgo.resultados.length > 0;
  const mostrando = buscando ? hallazgo.resultados : casillas;

  return (
    <div className="mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_25rem] lg:gap-6">
      {/* El hueco es el tope de la barra **más una holgura**. Reservar exactamente lo que mide
          dejaba la última fila a cero píxeles del borde: en Chromium cuadraba, y en un teléfono de
          verdad —donde la barra del navegador encoge lo visible— quedaba debajo. La holgura es
          barata; el defecto costó dos reportes. Lo fija `e2e/venta.spec.ts`. */}
      <section
        className="px-4 pt-4 pb-[calc(var(--alto-barra-venta)+2rem)] lg:px-12 lg:pt-10 lg:pb-10"
        aria-label="Productos"
      >
        <h1 className="mb-3 text-3xl font-bold tracking-tight lg:mb-5 lg:text-4xl">Vender</h1>
        <div className="mb-4">
          <ObjetivoDeEscaneo
            onCodigo={alEscanear}
            etiqueta="Nombre o código"
            admiteNombre
            onVaciar={() => setHallazgo({ tipo: "nada" })}
            camaraActiva={camara}
            onCamaraActiva={setCamara}
            // En el celular la cámara se enciende con «Escanear», abajo (punto 4).
            claseBotonCamara="max-lg:hidden"
            enfocarEnComputador
          />
          <p className="mt-2 hidden items-center gap-2 text-sm font-medium text-text-muted lg:flex">
            <Icono nombre="teclado" className="size-4" />
            El lector de códigos escribe aquí. No hace falta tocar nada.
          </p>
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
            // `AC-007`: se ofrece darlo de alta sin salir de aquí.
            <AltaRapida
              codigo={hallazgo.codigo}
              onCreado={alCarrito}
              onDescartar={() => setHallazgo({ tipo: "nada" })}
            />
          ) : null}
        </div>

        {buscando ? (
          <p className="mb-3 text-text-muted" data-testid="encabezado-resultados">
            {mostrando.length === 1
              ? `1 resultado para «${hallazgo.texto}»`
              : `${mostrando.length} resultados para «${hallazgo.texto}»`}
          </p>
        ) : null}

        {mostrando.length === 0 && !buscando ? (
          <p className="text-text-muted" data-testid="cuadricula-vacia">
            Todavía no hay productos. Da de alta el primero en Productos para empezar a vender.
          </p>
        ) : (
          <>
            {!buscando ? (
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-semibold">Más vendidos</span>
                <Link
                  href="/catalogo"
                  className="flex min-h-12 items-center gap-1 font-semibold text-accent"
                >
                  Productos
                  <Icono nombre="siguiente" />
                </Link>
              </div>
            ) : null}
            {/* `auto-rows-fr` iguala el alto de todas las filas; sin él, una fila cuyos nombres
                caben en una línea encoge y la cuadrícula queda dentada. */}
            <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
              {mostrando.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => alCarrito(c)}
                    data-testid={`casilla-${c.id}`}
                    data-tarjeta
                    // `active:` es la respuesta inmediata al toque: si el dueño duda si lo añadió,
                    // lo toca dos veces y vende de más. `h-full`: el botón sigue a su celda.
                    className="flex h-full min-h-33 w-full min-w-0 flex-col justify-between gap-3 rounded-card border border-border bg-surface p-3.5 text-left transition-transform active:translate-y-px active:bg-bg lg:min-h-39 lg:p-5"
                  >
                    {/* 24 el precio, 17-18 el nombre, 16 las existencias — que no bajan de 16. */}
                    <span className="line-clamp-2 text-lg leading-snug font-medium">{c.nombre}</span>
                    {/* Las existencias van **debajo** del precio y nunca a su lado: compartiendo
                        fila, «Agotado» junto a un precio de cinco cifras se salía de la casilla. */}
                    <span className="flex min-w-0 flex-col items-start gap-1.5">
                      <Precio
                        valor={c.precio}
                        className="text-2xl leading-tight font-bold tracking-tight lg:text-3xl"
                      />
                      <Existencias cantidad={c.existencias} alertarEnCero compacto />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <VentaEnCurso
        carrito={carrito}
        estado={estado}
        enviando={enviando}
        abierta={abierta}
        reciente={reciente}
        onAbierta={setAbierta}
        onCantidad={(id, cantidad) => setCarrito((actual) => cambiarCantidad(actual, id, cantidad))}
        onConfirmar={confirmar}
        onEscanear={() => setCamara((estaba) => !estaba)}
        camara={camara}
        onVaciar={vaciar}
        onDeshacer={() => {
          if (reciente.tipo === "cobrada") void deshacerCobro(reciente);
          if (reciente.tipo === "vaciada") {
            setCarrito(reciente.carrito);
            setReciente({ tipo: "nada" });
          }
        }}
      />
    </div>
  );
}

function resumenDeLineas(articulos: ArticuloEnVenta[]): string {
  return articulos
    .map((a) => (a.cantidad > 1 ? `${a.nombre} ×${a.cantidad}` : a.nombre))
    .join(", ");
}

function VentaEnCurso({
  carrito,
  estado,
  enviando,
  abierta,
  reciente,
  camara,
  onAbierta,
  onCantidad,
  onConfirmar,
  onEscanear,
  onVaciar,
  onDeshacer,
}: {
  carrito: Carrito;
  estado: Estado;
  enviando: boolean;
  abierta: boolean;
  reciente: Reciente;
  camara: boolean;
  onAbierta: (abierta: boolean) => void;
  onCantidad: (id: string, cantidad: number) => void;
  onConfirmar: () => void;
  onEscanear: () => void;
  onVaciar: () => void;
  onDeshacer: () => void;
}) {
  const vacio = estaVacio(carrito);
  const n = unidades(carrito);
  // En el celular la venta se recoge en una línea (punto 3) y se despliega al tocarla. En
  // computador es una columna y siempre está desplegada. `desplegada` decide solo lo del celular:
  // lo de computador lo pone `lg:`.
  const desplegada = abierta && !vacio;

  return (
    <>
      {desplegada ? (
        // El velo cierra al tocar fuera, como cualquier hoja de un teléfono.
        <button
          type="button"
          aria-label="Ocultar la venta"
          onClick={() => onAbierta(false)}
          className="fixed inset-0 z-30 bg-text/40 lg:hidden"
        />
      ) : null}
      {/* Fija abajo en el celular, encima de la barra de secciones; columna propia en computador.
          El total y Cobrar están a la vista mientras se cobra, en los dos tamaños (AC-X01). */}
      <aside
        aria-label="Venta en curso"
        className={`fixed inset-x-0 z-30 flex flex-col rounded-t-card border-t border-border bg-surface px-4 pt-2 pb-3 shadow-[0_-12px_32px_rgba(15,20,25,0.10)] lg:sticky lg:top-6 lg:mt-6 lg:mr-6 lg:h-fit lg:max-h-[calc(100dvh-3rem)] lg:rounded-card lg:border lg:px-0 lg:pt-0 lg:pb-0 lg:shadow-none ${
          desplegada ? "bottom-0 max-h-[85dvh]" : "bottom-19 max-h-[var(--alto-barra-venta)]"
        }`}
      >
        {desplegada ? (
          <button
            type="button"
            onClick={() => onAbierta(false)}
            className="flex min-h-11 shrink-0 flex-col items-center justify-center gap-0.5 self-center px-4 text-sm font-semibold text-text-muted lg:hidden"
          >
            <span className="h-1 w-10 rounded-full bg-border" />
            <span className="flex items-center gap-1">
              <Icono nombre="abrir" className="size-4" />
              Ocultar
            </span>
          </button>
        ) : null}

        {/* La cabecera: siempre en computador; en el celular solo desplegada. «Vaciar» vive aquí,
            en el extremo opuesto a Cobrar, para que no se toquen uno por el otro (punto 14). */}
        <div
          className={`shrink-0 items-center justify-between gap-3 lg:flex lg:px-5 lg:pt-6 lg:pb-2 ${
            desplegada ? "flex pb-1" : "hidden"
          }`}
        >
          <span>
            <span className="block text-2xl leading-tight font-bold tracking-tight">
              Venta en curso
            </span>
            <span className="block text-text-muted tabular-nums">
              {n} {n === 1 ? "artículo" : "artículos"}
            </span>
          </span>
          {!vacio ? (
            <Boton
              type="button"
              variante="peligro"
              onClick={onVaciar}
              data-testid="vaciar"
            >
              <Icono nombre="vaciar" />
              Vaciar
            </Boton>
          ) : null}
        </div>

        {/* `min-h-0` no sobra: sin él un hijo flexible no encoge por debajo de su contenido y la
            lista empuja el total fuera de la barra en vez de desplazarse dentro. */}
        <ul
          className={`min-h-0 flex-1 divide-y divide-border overflow-y-auto lg:block lg:px-5 ${
            desplegada ? "block" : "hidden"
          }`}
          data-testid="venta-en-curso"
        >
          {carrito.articulos.map((a) => (
            <li key={a.productoId} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{a.nombre}</span>
                <span className="block text-text-muted tabular-nums">
                  {a.cantidad} × {formatearPrecio(a.precio)} = {formatearPrecio(a.precio * a.cantidad)}
                </span>
              </span>
              <span className="flex shrink-0 items-center rounded-full bg-bg">
                <BotonCantidad
                  etiqueta={`Quitar uno de ${a.nombre}`}
                  onClick={() => onCantidad(a.productoId, a.cantidad - 1)}
                >
                  −
                </BotonCantidad>
                <CantidadEditable articulo={a} onCantidad={onCantidad} />
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
        {!vacio ? (
          <p
            className={`shrink-0 pt-1 text-sm text-text-muted lg:block lg:px-5 ${desplegada ? "block" : "hidden"}`}
          >
            Toca el número para escribir la cantidad.
          </p>
        ) : null}

        <div className="flex shrink-0 flex-col gap-2 pt-1 lg:gap-3 lg:border-t lg:border-border lg:p-5">
          <AvisoReciente reciente={reciente} onDeshacer={onDeshacer} />

          {estado === "falloDeRed" ? (
            // AC-015: decirlo sin rodeos. «Algo salió mal» deja al dueño sin saber si cobrar otra vez.
            <Aviso asertivo conBorde data-testid="fallo-de-red">
              No se guardó la venta. Nada se descontó. Toca Reintentar.
            </Aviso>
          ) : null}

          {/* Recogida (celular): cuántos, qué, y «Ver venta» para desplegarla. */}
          {vacio ? (
            reciente.tipo === "nada" ? (
              <p className="flex min-h-12 items-center text-text-muted lg:hidden">
                Toca un producto o escanea para empezar.
              </p>
            ) : null
          ) : !desplegada ? (
            <button
              type="button"
              onClick={() => onAbierta(true)}
              className="flex min-h-12 items-center gap-3 text-left lg:hidden"
              data-testid="ver-venta"
            >
              <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-accent-soft px-2 font-bold text-accent tabular-nums">
                {n}
              </span>
              <span className="min-w-0 flex-1 truncate text-text-muted">
                {resumenDeLineas(carrito.articulos)}
              </span>
              <span className="flex shrink-0 items-center gap-1 font-semibold text-accent">
                Ver venta
                <Icono nombre="subir" className="size-4" />
              </span>
            </button>
          ) : null}

          {/* El total grande: siempre en computador; en el celular, con la venta desplegada. Recogida,
              el total va dentro de Cobrar, donde está el pulgar (punto 8). */}
          <div
            className={`items-baseline justify-between gap-3 lg:flex ${desplegada ? "flex" : "hidden"}`}
          >
            <span className="font-medium text-text-muted">Total</span>
            <Precio
              valor={total(carrito)}
              className="text-total leading-none font-bold tracking-tight lg:text-5xl"
              data-testid="total"
            />
          </div>

          <div className="flex gap-2">
            <Boton
              type="button"
              variante="suave"
              tamano="cobro"
              onClick={onEscanear}
              aria-pressed={camara}
              className="flex-1 text-lg lg:hidden"
              data-testid="escanear"
            >
              <Icono nombre={camara ? "cerrar" : "escanear"} className="text-accent" />
              {camara ? "Cerrar" : "Escanear"}
            </Boton>
            <Boton
              type="button"
              variante="principal"
              tamano="cobro"
              onClick={onConfirmar}
              disabled={vacio || enviando}
              data-testid="confirmar"
              // A lo ancho que queda: es la acción principal (`NFR-003`).
              // En una sola línea siempre: a 360 px el icono se queda fuera y el texto baja a 18,
              // para que «Cobrar $ 174.030» no se parta (`T-026`, `.diseno/cobalto`).
              className="min-w-0 flex-2 px-3 text-lg whitespace-nowrap lg:flex-1 lg:text-xl"
            >
              {/* El icono cambia con el estado, como el texto. Mientras guarda no hay ninguno: un
                  glifo que aparece y desaparece bajo el dedo distrae. */}
              {enviando ? null : (
                <Icono
                  nombre={estado === "falloDeRed" ? "reintentar" : "cobrar"}
                  className="max-lg:hidden"
                />
              )}
              {enviando ? (
                "Guardando…"
              ) : estado === "falloDeRed" ? (
                "Reintentar"
              ) : (
                // «Cobrar» manda y el importe va al lado, un punto más pequeño: así cabe en una sola
                // línea a 360 px incluso con seis cifras (`T-026`). En computador, los dos a 20.
                <span className="flex min-w-0 items-baseline gap-1.5">
                  Cobrar
                  {vacio ? null : (
                    <span className="text-base font-semibold tabular-nums lg:text-xl lg:font-bold">
                      {formatearPrecio(total(carrito))}
                    </span>
                  )}
                </span>
              )}
            </Boton>
          </div>
          <p className="hidden items-center justify-center gap-1.5 text-sm text-text-muted lg:flex">
            o pulsa
            <kbd className="rounded-md border border-b-2 border-border-strong bg-surface px-1.5 font-sans font-semibold text-text">
              F2
            </kbd>
          </p>
        </div>
      </aside>
    </>
  );
}

/** El aviso con «Deshacer» de lo que acaba de pasar. `role="status"`: se oye sin interrumpir. */
function AvisoReciente({ reciente, onDeshacer }: { reciente: Reciente; onDeshacer: () => void }) {
  if (reciente.tipo === "nada") return null;

  if (reciente.tipo === "deshecha") {
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-button bg-accent-soft px-4 py-3"
        data-testid="cobro-deshecho"
      >
        <Icono nombre="deshacer" className="text-accent" />
        <span>
          <span className="block font-bold">Cobro deshecho</span>
          <span className="block text-text-muted">La venta se anuló y volvió aquí para corregirla.</span>
        </span>
      </p>
    );
  }

  if (reciente.tipo === "noSeDeshizo") {
    return (
      <Aviso conBorde data-testid="no-se-deshizo">
        {reciente.mensaje}
      </Aviso>
    );
  }

  const cobrada = reciente.tipo === "cobrada";
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-button bg-text py-2 pr-2 pl-4 text-surface"
      data-testid={cobrada ? "venta-anterior" : "venta-vaciada"}
    >
      <Icono nombre={cobrada ? "cobrar" : "vaciar"} />
      <span className="min-w-0 flex-1 font-semibold tabular-nums">
        {cobrada
          ? `Cobrado ${formatearPrecio(reciente.total)}`
          : `Venta vaciada, ${unidades(reciente.carrito)} artículos`}
      </span>
      <button
        type="button"
        onClick={onDeshacer}
        className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-surface/15 px-3.5 font-bold"
        data-testid="deshacer"
      >
        <Icono nombre="deshacer" className="size-4" />
        Deshacer
      </button>
    </div>
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
    <button
      type="button"
      aria-label={etiqueta}
      onClick={onClick}
      className="grid size-12 place-items-center rounded-full text-xl font-semibold active:bg-border"
    >
      {children}
    </button>
  );
}

/**
 * La cantidad se toca para escribirla (punto 5): seis huevos son un toque y un número, no seis
 * toques en «+». Se aplica al salir del campo o con Enter; un número inválido deja la que había.
 */
function CantidadEditable({
  articulo: a,
  onCantidad,
}: {
  articulo: ArticuloEnVenta;
  onCantidad: (id: string, cantidad: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");

  function aplicar() {
    const n = Number(texto);
    if (Number.isInteger(n) && n >= 0) onCantidad(a.productoId, n);
    setEditando(false);
  }

  if (editando) {
    return (
      <input
        autoFocus
        inputMode="numeric"
        aria-label={`Cantidad de ${a.nombre}`}
        value={texto}
        onChange={(e) => setTexto(e.target.value.replace(/\D/g, ""))}
        onBlur={aplicar}
        onKeyDown={(e) => {
          if (e.key === "Enter") aplicar();
          if (e.key === "Escape") setEditando(false);
        }}
        className="h-12 w-16 rounded-xl border-2 border-accent bg-surface text-center text-xl font-bold tabular-nums ring-4 ring-accent-soft"
        data-testid={`editar-cantidad-${a.productoId}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setTexto(String(a.cantidad));
        setEditando(true);
      }}
      aria-label={`Cambiar la cantidad de ${a.nombre}: ${a.cantidad}`}
      className="h-12 min-w-9 px-1 text-lg font-bold tabular-nums"
      data-testid={`cantidad-${a.productoId}`}
    >
      {a.cantidad}
    </button>
  );
}

/**
 * El alta de un código desconocido, dentro de la pantalla de venta (`FR-003`, `AC-007`).
 *
 * No navega a ninguna parte a propósito: navegar la sacaría de la venta en curso. Pide lo mínimo
 * para poder cobrar y deja el resto del producto para su ficha.
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
      className="mt-3 flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
      data-testid="alta-rapida"
    >
      <p>
        <span className="block font-semibold">Ese código no está. Dalo de alta y sigue vendiendo.</span>
        <span className="block text-text-muted tabular-nums">Código {codigo}</span>
      </p>
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
          className="flex-1"
          data-testid="alta-rapida-guardar"
        >
          {guardando ? "Guardando…" : "Dar de alta y añadir"}
        </Boton>
        <Boton type="button" onClick={onDescartar} data-testid="alta-rapida-descartar">
          Ahora no
        </Boton>
      </div>
    </div>
  );
}
