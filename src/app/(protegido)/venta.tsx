"use client";

import { useEffect, useRef, useState } from "react";
import {
  agregar,
  cambiarCantidad,
  carritoVacio,
  clave,
  estaVacio,
  total,
  unidades,
  type ArticuloEnVenta,
  type Carrito,
} from "@/domain/carrito";
import { nuevoId } from "@/domain/ids";
import { formatearPrecio } from "@/domain/moneda";
import type { ProductoParaVender } from "@/domain/venta";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Existencias, Precio } from "@/ui/cifras";
import { Icono } from "@/ui/iconos";
import { ObjetivoDeEscaneo } from "@/ui/objetivo-de-escaneo";
import { altaRapida, buscarEnVenta, confirmarVenta, deshacerVenta } from "./acciones";
import { AnadirAProducto, nombreDeCodigo, type CodigoAnadido } from "./codigo-desconocido";
import { guardarVenta, leerVentaGuardada } from "./venta-guardada";

type Estado = "armando" | "enviando" | "falloDeRed";

type CodigoLeido = { id: string; numero: string };

/** Lo último que dijo el objetivo de escaneo. Se muestra junto a él, no en otra pantalla. */
type Hallazgo =
  | { tipo: "nada" }
  /** `codigoNuevo`: entró porque se le acaba de añadir el código escaneado (`D-010`). */
  | { tipo: "anadido"; nombre: string; codigoNuevo?: boolean }
  | { tipo: "desconocido"; codigo: string }
  /** Lo buscado por nombre. Los resultados ocupan el sitio de la venta mientras se busca. */
  | { tipo: "resultados"; texto: string; resultados: ProductoParaVender[] };

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

/**
 * Vender (`.diseno/codigos/Vender`, `T-033`). La pantalla es la venta y nada más: se abre vacía y
 * se llena escaneando o buscando. No sugiere productos —el cliente no quería la cuadrícula de «Más
 * vendidos»—, así que lo que no trae código se busca por nombre en el mismo campo.
 */
export function PantallaDeVenta() {
  const [carrito, setCarrito] = useState<Carrito>(() => carritoVacio(nuevoId()));
  const [cargada, setCargada] = useState(false);
  const [estado, setEstado] = useState<Estado>("armando");
  const [reciente, setReciente] = useState<Reciente>({ tipo: "nada" });
  const [hallazgo, setHallazgo] = useState<Hallazgo>({ tipo: "nada" });
  const [camara, setCamara] = useState(false);
  /**
   * Cambia cada vez que se elige un resultado, para montar el campo de nuevo y dejarlo vacío: lo
   * buscado ya entró a la venta, y el texto suelto arriba sin resultados debajo sería una pregunta
   * sin respuesta. El campo es del objetivo de escaneo y no se vacía desde fuera de otra forma.
   */
  const [vuelta, setVuelta] = useState(0);

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
   * El único camino para añadir, venga de un resultado, del escaneo o de un código recién dado de
   * alta. El código viaja con el artículo: lo vendido sale de ese código (`AC-027`).
   */
  function alCarrito(
    producto: { id: string; nombre: string; precio: number },
    codigo: CodigoLeido | null,
    aviso: Hallazgo = { tipo: "nada" },
  ) {
    setCarrito((actual) =>
      agregar(actual, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        codigoId: codigo?.id ?? null,
        codigo: codigo?.numero ?? null,
      }),
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
      alCarrito(entrada.producto, entrada.codigo, { tipo: "anadido", nombre: entrada.producto.nombre });
      return true;
    }
    if (entrada.tipo === "codigoDesconocido") {
      setCamara(false);
      setHallazgo({ tipo: "desconocido", codigo: entrada.codigo });
      return true;
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
        carrito.articulos.map((a) => ({
          productoId: a.productoId,
          cantidad: a.cantidad,
          codigoId: a.codigoId ?? null,
        })),
      );
      // Sin diálogo que cerrar: la siguiente persona ya está esperando
      // (design-handoff.md § Interaction States). Queda el aviso con «Deshacer».
      setReciente({ tipo: "cobrada", ventaId: carrito.id, total: resultado.total, carrito });
      setCarrito(carritoVacio(nuevoId()));
      setHallazgo({ tipo: "nada" });
      // Sin `router.refresh()`: Vender ya no pinta nada del servidor —ni cuadrícula ni existencias
      // (`T-033`)—, y refrescar era releer la sesión en la base para nada (`T-036`, medido).
      setEstado("armando");
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
  }

  /** Sin preguntar: queda «Deshacer» diez segundos, que cuesta menos que un diálogo (punto 14). */
  function vaciar() {
    setReciente({ tipo: "vaciada", carrito });
    setCarrito(carritoVacio(nuevoId()));
    setHallazgo({ tipo: "nada" });
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

  const vacio = estaVacio(carrito);
  const buscando = hallazgo.tipo === "resultados" && hallazgo.resultados.length > 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pt-4 pb-[calc(var(--alto-barra-venta)+2rem)] lg:px-8 lg:pt-10 lg:pb-8">
      <div className="mb-2 flex min-h-12 items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Vender</h1>
        {/* Arriba y en rojo, en el extremo opuesto a Cobrar: que no se toquen uno por otro (punto
            14). No pregunta; deja «Deshacer» abajo. */}
        {!vacio ? (
          <Boton type="button" variante="peligro" onClick={vaciar} data-testid="vaciar">
            <Icono nombre="vaciar" />
            Vaciar
          </Boton>
        ) : null}
      </div>

      <ObjetivoDeEscaneo
        key={vuelta}
        onCodigo={alEscanear}
        etiqueta="Nombre o código"
        admiteNombre
        onVaciar={() => setHallazgo({ tipo: "nada" })}
        camaraActiva={camara}
        onCamaraActiva={setCamara}
        // «Escanear» también en computador: es lo que se va a hacer, no con qué (`T-034`).
        comoEscanear
        resumen={
          vacio
            ? undefined
            : `La venta sigue: ${carrito.articulos.length === 1 ? "1 producto" : `${carrito.articulos.length} productos`} · ${formatearPrecio(total(carrito))}`
        }
        // En el celular la cámara se enciende con «Escanear», abajo (punto 4).
        claseBotonCamara="max-lg:hidden"
        enfocarEnComputador
      />
      <p className="mt-2 hidden items-center gap-2 text-sm font-medium text-text-muted lg:flex">
        <Icono nombre="teclado" className="size-4" />
        El lector de códigos escribe aquí. No hace falta tocar nada.
      </p>

      {hallazgo.tipo === "anadido" ? (
        <p
          role="status"
          className="mt-3 flex items-center gap-3 rounded-button bg-accent-soft px-4 py-3 font-semibold"
          data-testid="escaneo-anadido"
        >
          <Icono nombre="cobrar" className="shrink-0 text-accent" />
          {hallazgo.codigoNuevo ? (
            <span>
              <span className="block">Código añadido a {hallazgo.nombre}</span>
              <span className="block font-normal text-text-muted">
                La próxima vez se reconoce solo.
              </span>
            </span>
          ) : (
            <span>Añadido: {hallazgo.nombre}</span>
          )}
        </p>
      ) : null}
      {hallazgo.tipo === "resultados" && hallazgo.resultados.length === 0 ? (
        <p className="mt-3" role="alert" data-testid="sin-resultados">
          Ningún producto se llama «{hallazgo.texto}».
        </p>
      ) : null}

      {buscando ? (
        <Resultados
          texto={hallazgo.texto}
          resultados={hallazgo.resultados}
          onElegir={(p) => {
            alCarrito(p, null);
            setVuelta((v) => v + 1);
          }}
        />
      ) : vacio ? (
        <VentaVacia />
      ) : (
        <ListaDeLaVenta
          carrito={carrito}
          onCantidad={(k, cantidad) => setCarrito((actual) => cambiarCantidad(actual, k, cantidad))}
        />
      )}

      <BarraDeCobro
        carrito={carrito}
        estado={estado}
        reciente={reciente}
        camara={camara}
        onConfirmar={confirmar}
        onEscanear={() => setCamara((estaba) => !estaba)}
        onDeshacer={() => {
          if (reciente.tipo === "cobrada") void deshacerCobro(reciente);
          if (reciente.tipo === "vaciada") {
            setCarrito(reciente.carrito);
            setReciente({ tipo: "nada" });
          }
        }}
      />

      {hallazgo.tipo === "desconocido" ? (
        <CodigoDesconocido
          codigo={hallazgo.codigo}
          onListo={({ producto, codigo }, aviso) => alCarrito(producto, codigo, aviso)}
          onDescartar={() => setHallazgo({ tipo: "nada" })}
        />
      ) : null}
    </div>
  );
}

/** Vacía, dice qué hacer. No propone productos: eso es lo que el cliente pidió quitar (`AC-028`). */
function VentaVacia() {
  return (
    <div
      className="flex flex-col items-center gap-3 px-3 py-12 text-center"
      data-testid="venta-vacia"
    >
      <span className="grid size-22 place-items-center rounded-full bg-accent-soft text-accent">
        <Icono nombre="escanear" className="size-11" />
      </span>
      <p className="text-2xl font-bold tracking-tight">Escanea para empezar</p>
      <p className="max-w-72 text-text-muted">
        Lo que no trae código, como el pan o los huevos, búscalo por nombre arriba.
      </p>
    </div>
  );
}

function Resultados({
  texto,
  resultados,
  onElegir,
}: {
  texto: string;
  resultados: ProductoParaVender[];
  onElegir: (p: ProductoParaVender) => void;
}) {
  return (
    <section className="mt-6" aria-label="Resultados">
      <p className="mb-2 font-medium text-text-muted" data-testid="encabezado-resultados">
        {resultados.length === 1
          ? `1 resultado para «${texto}»`
          : `${resultados.length} resultados para «${texto}»`}
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {resultados.map((p) => (
          <li key={p.id}>
            {/* `active:` es la respuesta inmediata al toque: si el dueño duda si lo añadió, lo toca
                dos veces y vende de más. */}
            <button
              type="button"
              onClick={() => onElegir(p)}
              className="flex min-h-18 w-full items-center gap-3 px-4 py-2.5 text-left active:bg-bg"
              data-testid={`resultado-${p.id}`}
            >
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="text-lg leading-snug font-semibold">{p.nombre}</span>
                <Existencias cantidad={p.existencias} alertarEnCero compacto />
              </span>
              <Precio valor={p.precio} className="text-xl font-bold tracking-tight" />
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Icono nombre="nuevo" />
              </span>
              <span className="sr-only">Añadir a la venta</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** La venta es la pantalla: cada línea con su total, su código y la cantidad a mano (`T-033`). */
function ListaDeLaVenta({
  carrito,
  onCantidad,
}: {
  carrito: Carrito;
  onCantidad: (k: string, cantidad: number) => void;
}) {
  const n = unidades(carrito);
  const lineas = carrito.articulos.length;
  return (
    // `mt-6` y no menos: a 360 × 740 deja las cantidades de la primera línea fuera del tercio
    // superior, donde no llega el pulgar (`NFR-003`). Con `mt-4` quedaban a 2 px.
    <section className="mt-6" aria-label="Venta en curso">
      <p className="mb-2 flex items-baseline justify-between gap-3 font-semibold">
        <span className="tabular-nums">
          {lineas === 1 ? "1 producto" : `${lineas} productos`} ·{" "}
          {n === 1 ? "1 unidad" : `${n} unidades`}
        </span>
        <Precio valor={total(carrito)} className="text-xl font-bold" data-testid="total" />
      </p>
      <ul
        className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
        data-testid="venta-en-curso"
      >
        {carrito.articulos.map((a) => (
          <li key={clave(a)} className="flex flex-col gap-1 py-3 pr-3 pl-4">
            <span className="flex items-baseline gap-3">
              <span className="min-w-0 flex-1 text-lg leading-snug font-semibold">{a.nombre}</span>
              <Precio valor={a.precio * a.cantidad} className="text-lg font-bold" />
            </span>
            <span className="flex items-center gap-2">
              <span className="min-w-0 flex-1 text-text-muted tabular-nums">
                {nombreDeCodigo(a.codigo)} · {formatearPrecio(a.precio)} c/u
              </span>
              <span className="flex shrink-0 items-center rounded-full bg-bg">
                <BotonCantidad
                  etiqueta={`Quitar uno de ${a.nombre}`}
                  onClick={() => onCantidad(clave(a), a.cantidad - 1)}
                >
                  −
                </BotonCantidad>
                <CantidadEditable articulo={a} onCantidad={onCantidad} />
                <BotonCantidad
                  etiqueta={`Agregar uno de ${a.nombre}`}
                  onClick={() => onCantidad(clave(a), a.cantidad + 1)}
                >
                  +
                </BotonCantidad>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-text-muted">Toca el número para escribir la cantidad.</p>
    </section>
  );
}

/**
 * Escanear y Cobrar, abajo donde llega el pulgar (punto 4), con el aviso de lo que se puede
 * deshacer encima. Fija sobre la barra de secciones en el celular; en computador, pegada al pie de
 * la columna.
 */
function BarraDeCobro({
  carrito,
  estado,
  reciente,
  camara,
  onConfirmar,
  onEscanear,
  onDeshacer,
}: {
  carrito: Carrito;
  estado: Estado;
  reciente: Reciente;
  camara: boolean;
  onConfirmar: () => void;
  onEscanear: () => void;
  onDeshacer: () => void;
}) {
  const vacio = estaVacio(carrito);
  const enviando = estado === "enviando";
  return (
    <aside
      aria-label="Cobrar"
      className="fixed inset-x-0 bottom-19 z-30 flex max-h-[var(--alto-barra-venta)] flex-col gap-2 overflow-y-auto border-t border-border bg-surface px-4 pt-3 pb-3 shadow-[0_-12px_32px_rgba(15,20,25,0.10)] lg:sticky lg:bottom-0 lg:mt-6 lg:max-h-none lg:rounded-card lg:border lg:p-5"
    >
      <AvisoReciente reciente={reciente} onDeshacer={onDeshacer} />

      {estado === "falloDeRed" ? (
        // AC-015: decirlo sin rodeos. «Algo salió mal» deja al dueño sin saber si cobrar otra vez.
        <Aviso asertivo conBorde data-testid="fallo-de-red">
          No se guardó la venta. Nada se descontó. Toca Reintentar.
        </Aviso>
      ) : null}

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
          {/* Siempre «Escanear»: con la cámara abierta el visor la tapa y trae su propio «Cerrar». */}
          <Icono nombre="escanear" className="text-accent" />
          Escanear
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
    </aside>
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
          <span className="block text-text-muted">
            Esos productos volvieron a la venta para que la corrijas o la vacíes.
          </span>
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
  onCantidad: (k: string, cantidad: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");

  function aplicar() {
    const n = Number(texto);
    if (Number.isInteger(n) && n >= 0) onCantidad(clave(a), n);
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

type Paso = "camino" | "existente" | "nuevo";

/**
 * Un código que ningún producto tiene (`AC-007`, `AC-025`, `.diseno/codigos/Main`). Dos salidas:
 * añadirlo a un producto que ya se vende —el proveedor cambió el código— o darlo de alta. La
 * primera va primero para no crear duplicados por costumbre.
 *
 * No navega a ninguna parte: navegar sacaría de la venta en curso. Se abre encima de ella.
 */
function CodigoDesconocido({
  codigo,
  onListo,
  onDescartar,
}: {
  codigo: string;
  onListo: (r: CodigoAnadido, aviso: Hallazgo) => void;
  onDescartar: () => void;
}) {
  const [paso, setPaso] = useState<Paso>("camino");

  // Escape cierra, como cualquier hoja (`e2e/cobalto.spec.ts`).
  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === "Escape") onDescartar();
  }

  if (paso === "camino") {
    return (
      <div className="fixed inset-0 z-40" onKeyDown={alTeclear}>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onDescartar}
          className="absolute inset-0 bg-text/45"
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-desconocido"
          className="absolute inset-x-0 bottom-0 mx-auto flex max-w-lg flex-col gap-3 rounded-t-bloque bg-surface px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(15,20,25,0.14)] lg:bottom-8 lg:rounded-bloque"
          data-testid="codigo-desconocido"
        >
          <span className="h-1 w-10 self-center rounded-full bg-border" />
          <div className="flex flex-col items-start gap-2 px-1 pt-1">
            <h2 id="titulo-desconocido" className="text-2xl font-bold tracking-tight">
              Este código no está
            </h2>
            <span className="flex min-h-9 items-center gap-1.5 rounded-full bg-bg px-3 font-semibold tabular-nums">
              <Icono nombre="escanear" className="size-4 text-text-muted" />
              {codigo}
            </span>
          </div>
          <OpcionDeCamino
            principal
            icono="enlazar"
            titulo="Ya lo vendo, cambió el código"
            descripcion="Añádelo a un producto que ya tienes. Se cuenta aparte."
            onClick={() => setPaso("existente")}
            testid="camino-existente"
          />
          <OpcionDeCamino
            icono="nuevo"
            titulo="Es un producto nuevo"
            descripcion="Dalo de alta con el código ya puesto."
            onClick={() => setPaso("nuevo")}
            testid="camino-nuevo"
          />
          <Boton type="button" tamano="alto" onClick={onDescartar} data-testid="alta-rapida-descartar">
            Ahora no
          </Boton>
          <p className="text-center text-text-muted">La venta que llevas no se pierde.</p>
        </section>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-codigo"
      className="fixed inset-0 z-40 overflow-y-auto bg-bg"
      onKeyDown={alTeclear}
    >
      <div className="mx-auto max-w-2xl px-4 pt-1 pb-10 lg:pt-8">
        {paso === "existente" ? (
          <AnadirAProducto
            codigo={codigo}
            textoListo="Añadir código y vender"
            textoCancelar="Volver a la venta"
            onCancelar={onDescartar}
            onNuevo={() => setPaso("nuevo")}
            onListo={(r) =>
              onListo(r, { tipo: "anadido", nombre: r.producto.nombre, codigoNuevo: true })
            }
          />
        ) : (
          <AltaRapida
            codigo={codigo}
            onCreado={(r) => onListo(r, { tipo: "anadido", nombre: r.producto.nombre })}
            onDescartar={onDescartar}
          />
        )}
      </div>
    </div>
  );
}

function OpcionDeCamino({
  principal = false,
  icono,
  titulo,
  descripcion,
  onClick,
  testid,
}: {
  principal?: boolean;
  icono: "enlazar" | "nuevo";
  titulo: string;
  descripcion: string;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-21 items-center gap-3 rounded-card bg-surface px-3.5 py-3 text-left ${
        principal ? "border-2 border-accent" : "border border-border"
      }`}
      data-testid={testid}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Icono nombre={icono} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold">{titulo}</span>
        <span className="block text-text-muted">{descripcion}</span>
      </span>
      <Icono nombre="siguiente" className="text-text-muted" />
    </button>
  );
}

/**
 * El alta de un código desconocido, dentro de la venta (`FR-003`, `AC-007`,
 * `.diseno/codigos/Nuevo`). Pide lo mínimo para poder cobrar y, si se sabe, cuántas hay; el resto
 * del producto se completa después en su ficha.
 */
function AltaRapida({
  codigo,
  onCreado,
  onDescartar,
}: {
  codigo: string;
  onCreado: (r: CodigoAnadido) => void;
  onDescartar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [cuantas, setCuantas] = useState("");
  const [error, setError] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError({});
    try {
      const resultado = await altaRapida(codigo, nombre, precio, cuantas);
      if (!resultado.ok) return setError({ [resultado.campo]: resultado.mensaje });
      onCreado({
        producto: { id: resultado.id, nombre: nombre.trim(), precio: Number(precio) },
        codigo: { id: resultado.codigoId!, numero: codigo },
      });
    } catch {
      setError({ nombre: "No se guardó. Revisa la conexión y vuelve a intentarlo." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4" data-testid="alta-rapida">
      <button
        type="button"
        onClick={onDescartar}
        className="-ml-1 -mb-2 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Volver a la venta
      </button>
      <h1 id="titulo-codigo" className="text-3xl font-bold tracking-tight">
        Producto nuevo
      </h1>
      <div className="flex flex-col gap-1.5">
        <span className="font-semibold">Código</span>
        <span className="flex min-h-13 items-center gap-2.5 rounded-button bg-accent-soft px-4 font-semibold tabular-nums">
          <Icono nombre="escanear" className="text-accent" />
          {codigo}
        </span>
      </div>
      <Campo
        etiqueta="Nombre"
        nombre="nombre-rapido"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        error={error.nombre}
        placeholder="Como lo buscarías"
        autoFocus
        data-testid="alta-rapida-nombre"
      />
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <Campo
            etiqueta="Precio"
            nombre="precio-rapido"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            error={error.precio ?? error.codigoDeBarras}
            inputMode="numeric"
            prefijo="$"
            data-testid="alta-rapida-precio"
          />
        </div>
        <div className="min-w-0 flex-1">
          <Campo
            etiqueta="¿Cuántas hay?"
            nombre="cuantas-rapido"
            value={cuantas}
            onChange={(e) => setCuantas(e.target.value.replace(/\D/g, ""))}
            error={error.existenciasIniciales}
            inputMode="numeric"
            placeholder="0"
            opcional
            data-testid="alta-rapida-cuantas"
          />
        </div>
      </div>
      <p className="text-text-muted">Categoría y lo demás se completan después en su ficha.</p>
      <Boton
        type="button"
        variante="principal"
        tamano="cobro"
        onClick={guardar}
        disabled={guardando}
        data-testid="alta-rapida-guardar"
      >
        <Icono nombre="cobrar" />
        {guardando ? "Guardando…" : "Dar de alta y vender"}
      </Boton>
    </div>
  );
}
