import Link from "next/link";
import { notFound } from "next/navigation";
import { categoriasExistentes } from "@/domain/catalogo";
import { cola } from "@/domain/codigos";
import { esDeLaTienda } from "@/domain/ean13";
import { conDesde } from "@/domain/volver";
import {
  ETIQUETA_MOVIMIENTO,
  libroDelProducto,
  type EventoDelProducto,
} from "@/domain/movimientos";
import { formatearPrecio } from "@/domain/moneda";
import { ZONA_DEL_NEGOCIO } from "@/domain/zona";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { SeccionPlegable } from "@/ui/seccion-plegable";
import { Cantidad, Existencias, Precio } from "@/ui/cifras";
import { Icono, type NombreDeIcono } from "@/ui/iconos";
import { cambiarEstado, generarCodigo } from "./acciones";
import { FormularioAjuste } from "./ajuste";
import { FormularioCodigo } from "./codigo";
import { FormularioEdicion } from "./edicion";

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: ZONA_DEL_NEGOCIO });

const cuando = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  // El libro se lee para reconstruir qué pasó y cuándo; en la zona del negocio, como todo lo demás.
  timeZone: ZONA_DEL_NEGOCIO,
});

/**
 * La ficha (`.diseno/cobalto/U-M-Ficha`, `U-D-Productos`). Se usa en dos sitios: como pantalla
 * propia —el celular, o un enlace directo— y como panel al lado de la lista en computador
 * (`/catalogo?ficha=…`). Así el celular nunca carga una lista que no se ve.
 *
 * El historial va **antes** que las acciones: se entra a esta pantalla a mirar (`T-013`).
 */
export async function FichaDelProducto({
  id,
  volver,
  textoVolver = "Productos",
  aqui,
  enPanel = false,
}: {
  id: string;
  /** De donde se vino: la lista con sus filtros, Inicio o una venta (`T-036`). */
  volver: string;
  textoVolver?: string;
  /** Esta misma dirección: adónde vuelve «Cerrar» de una hoja. */
  aqui: string;
  enPanel?: boolean;
}) {
  const [libro, categorias] = await Promise.all([libroDelProducto(id), categoriasExistentes()]);
  if (!libro) notFound();
  const p = libro.producto;
  const { codigos, sinCodigo } = libro.porCodigo;
  // Lo que se puede contar por separado: cada código y, si lo hay, lo que no tiene código. Un
  // producto sin códigos es un solo grupo, y el conteo no pregunta nada (`D-010`).
  const grupos = [
    ...(sinCodigo !== null || codigos.length === 0
      ? [{ id: null, etiqueta: "Sin código", cantidad: sinCodigo ?? libro.saldoMaterializado }]
      : []),
    ...codigos.map((c) => ({ id: c.id, etiqueta: c.numero, cantidad: c.cantidad })),
  ];
  // Lo que se vende sin escanear sale del grupo más antiguo con unidades (`AC-027`): se dice cuál.
  const primero = codigos.length > 1 ? grupos.find((g) => g.cantidad > 0)?.id : undefined;
  // El código de la tienda del producto, si tiene: de él salen sus etiquetas (`D-012`).
  const deLaTienda = codigos.find((c) => esDeLaTienda(c.numero));
  // Se cuentan como se ven: el par «Etiquetado» es una línea, no dos (`D-012`).
  const movimientos = libro.movimientos.filter((m) => !(m.tipo === "relabel" && m.cantidad < 0)).length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        {enPanel ? (
          <>
            <p className="font-medium text-text-muted">{p.categoria ?? "Sin categoría"}</p>
            <Link
              href={volver}
              className="flex min-h-11 items-center gap-1.5 rounded-full bg-bg px-3.5 font-semibold text-text-muted"
            >
              <Icono nombre="cerrar" />
              Cerrar
            </Link>
          </>
        ) : (
          <Link
            href={volver}
            className="-ml-1 flex min-h-12 items-center gap-1.5 pr-3 font-semibold text-text-muted"
          >
            <Icono nombre="volver" />
            {textoVolver}
          </Link>
        )}
      </div>

      {/* El precio manda: es lo que se viene a comprobar (`T-024`, hallazgo 1). */}
      <section
        className={`flex flex-col ${enPanel ? "" : "rounded-card border border-border bg-surface p-5"}`}
      >
        <h1 className="text-2xl leading-tight font-semibold tracking-tight">{p.nombre}</h1>
        <Precio
          valor={p.precio}
          className="mt-3 text-5xl leading-none font-bold tracking-tight"
          data-testid="precio-ficha"
        />
        <span className="mt-3.5 flex flex-wrap gap-2">
          {p.activo ? (
            <Existencias cantidad={libro.saldoMaterializado} alertarEnCero />
          ) : (
            <span className="rounded-full bg-bg px-2.5 py-0.5 font-semibold text-text-muted">
              Ya no se vende
            </span>
          )}
        </span>
        {/* `.diseno/etiquetas/Ficha-sin-codigo`: arriba, donde se ve que no tiene código, y no
            escondido en una sección. Solo para lo que no tiene ninguno (`D-012`). */}
        {codigos.length === 0 && p.activo ? (
          <form
            action={generarCodigo.bind(null, p.id)}
            className="mt-4.5 flex flex-col gap-2.5 border-t border-dashed border-border pt-4"
          >
            <span className="flex items-center gap-2.5 text-text-muted">
              <Icono nombre="escanear" />
              Sin código de barras
            </span>
            <Boton type="submit" variante="principal" data-testid="generar-codigo">
              <Icono nombre="escanear" />
              Generar código
            </Boton>
          </form>
        ) : null}
      </section>

      {enPanel ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Ficha icono="categoria">{p.categoria ?? "Sin categoría"}</Ficha>
        </div>
      )}

      {/* NFR-005: si la copia y el libro divergen, se dice. Un número que no cuadra y se calla es
          peor que uno que no cuadra y lo avisa. */}
      {!libro.cuadra ? (
        <div className="mt-4">
          <Aviso asertivo conBorde data-testid="no-cuadra">
            El conteo guardado dice {libro.saldoMaterializado} y el libro suma {libro.saldoDelLibro}.
            Manda el libro.
          </Aviso>
        </div>
      ) : null}

      {/* `.diseno/codigos/Ficha`. Cada código lleva su cuenta y la suma es el total (`D-010`). Sin
          ningún código no hay nada que contar por separado: «Añadir un código» pasa a Acciones. */}
      {codigos.length > 0 ? (
      <section className="mt-7" aria-labelledby="por-codigo">
        <h2 id="por-codigo" className="text-xl font-bold tracking-tight">
          Por código
        </h2>
        <p className="mb-3 text-text-muted">
          Cada código lleva su propia cuenta. Suman {libro.saldoMaterializado}.
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {codigos.length > 0 ? (
            <ul className="divide-y divide-border" data-testid="por-codigo">
              {codigos.map((c, i) => (
                <FilaDeCodigo
                  key={c.id}
                  numero={c.numero}
                  detalle={`${esDeLaTienda(c.numero) ? "Código de la tienda · desde" : "Desde"} el ${fecha.format(c.desde)}${c.id === primero ? " · se vende primero" : ""}`}
                  cantidad={c.cantidad}
                  reciente={i === codigos.length - 1 && codigos.length > 1}
                />
              ))}
              {sinCodigo !== null ? (
                <FilaDeCodigo
                  numero="Sin código"
                  detalle={`Lo registrado antes de tener código${primero === null ? " · se vende primero" : ""}`}
                  cantidad={sinCodigo}
                />
              ) : null}
            </ul>
          ) : null}
          {deLaTienda ? (
            <Link
              href={`/catalogo/etiquetas/cuantas?m=${p.id}`}
              className="flex min-h-14 items-center gap-3 px-4 font-semibold text-accent"
              data-testid="imprimir-etiquetas"
            >
              <Icono nombre="imprimir" />
              Imprimir etiquetas
            </Link>
          ) : null}
          <SeccionPlegable
            titulo="Añadir otro código"
            descripcion="Cuando el proveedor lo cambia. Di cuántas llegaron."
            icono="nuevo"
            enGrupo
            data-testid="abrir-codigo"
          >
            <FormularioCodigo productoId={p.id} />
          </SeccionPlegable>
        </div>
      </section>
      ) : null}

      <section className="mt-7" aria-labelledby="historial">
        <h2 id="historial" className="text-xl font-bold tracking-tight">
          Historial
        </h2>
        <p className="mb-3 text-text-muted">
          {libro.linea.length === 0
            ? "Todavía no ha pasado nada."
            : `${movimientos} ${movimientos === 1 ? "movimiento" : "movimientos"}, suman ${libro.saldoDelLibro}`}
        </p>
        {libro.linea.length > 0 ? (
          <ol
            className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
            data-testid="historial"
          >
            {libro.linea.map((e) => (
              <FilaDelHistorial key={e.id} evento={e} conCodigo={codigos.length > 0} aqui={aqui} />
            ))}
          </ol>
        ) : null}
      </section>

      {/* Las acciones existen, pero detrás de una intención. Se entra a esta pantalla a mirar. */}
      <section className="mt-7" aria-labelledby="acciones">
        <h2 id="acciones" className="mb-3 text-xl font-bold tracking-tight">
          Acciones
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          <SeccionPlegable
            titulo="Corregir el conteo"
            descripcion="Cuenta y di por qué no cuadra."
            icono="contar"
            enGrupo
            hoja={{
              cerrar: aqui,
              subtitulo: `${p.nombre}. El sistema dice ${libro.saldoMaterializado}.`,
            }}
            data-testid="abrir-ajuste"
            abierta={!libro.cuadra}
          >
            <FormularioAjuste productoId={p.id} grupos={grupos} />
          </SeccionPlegable>

          {codigos.length === 0 ? (
            <SeccionPlegable
              titulo="Añadir un código"
              descripcion="El de fábrica, si lo trae. Di cuántas llegaron."
              icono="nuevo"
              enGrupo
              data-testid="abrir-codigo"
            >
              <FormularioCodigo productoId={p.id} />
            </SeccionPlegable>
          ) : null}

          <SeccionPlegable
            titulo="Editar los datos"
            descripcion={codigos.length > 0 ? "Nombre, precio, categoría y códigos." : "Nombre, precio y categoría."}
            icono="editar"
            enGrupo
            data-testid="abrir-edicion"
          >
            <FormularioEdicion
              productoId={p.id}
              producto={p}
              codigos={codigos.map((c) => ({ id: c.id, numero: c.numero }))}
              categorias={categorias}
            />
          </SeccionPlegable>

          {/* Separado de editar a propósito: dejar de vender no es corregir un dato, es sacar algo
              de circulación. Es reversible y queda registrado, así que no pide confirmación. */}
          <SeccionPlegable
            titulo={p.activo ? "Dejar de vender" : "Devolver a la venta"}
            descripcion={
              p.activo
                ? "Sale de la venta y del catálogo. El historial se queda."
                : "Ya no se vende. Volverá a la venta y al catálogo."
            }
            icono="retirar"
            enGrupo
            data-testid="abrir-estado"
          >
            <form action={cambiarEstado.bind(null, p.id, !p.activo)}>
              <Boton type="submit" data-testid="cambiar-estado" className="w-full">
                {p.activo ? "Dejar de vender" : "Devolver a la venta"}
              </Boton>
            </form>
          </SeccionPlegable>
        </div>
      </section>
    </div>
  );
}

function Ficha({ icono, children }: { icono: NombreDeIcono; children: React.ReactNode }) {
  return (
    <span className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 font-medium tabular-nums">
      <Icono nombre={icono} className="size-4 text-text-muted" />
      {children}
    </span>
  );
}

function FilaDeCodigo({
  numero,
  detalle,
  cantidad,
  reciente = false,
}: {
  numero: string;
  detalle: string;
  cantidad: number;
  reciente?: boolean;
}) {
  return (
    <li className="flex min-h-17 items-center gap-3 px-4 py-2.5" data-testid="fila-codigo">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full ${
          reciente ? "bg-accent-soft text-accent" : "bg-bg text-text-muted"
        }`}
      >
        <Icono nombre="escanear" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold tabular-nums">{numero}</span>
        <span className="block text-text-muted">{detalle}</span>
      </span>
      <Cantidad
        valor={cantidad}
        className={`text-2xl font-bold ${cantidad < 0 ? "text-danger" : ""}`}
      />
    </li>
  );
}

/** Una sola línea de tiempo: el dueño pregunta qué le pasó al producto, no de qué bitácora salió. */
function FilaDelHistorial({
  evento: e,
  conCodigo,
  aqui,
}: {
  evento: EventoDelProducto;
  conCodigo: boolean;
  /** Esta ficha: la venta que se abra desde el historial vuelve aquí (`T-036`). */
  aqui: string;
}) {
  // El código solo se dice cuando el producto tiene alguno: en uno que nunca tuvo, «Sin código» en
  // cada fila sería ruido.
  const codigo = e.clase === "movimiento" && conCodigo ? `${e.codigo ? cola(e.codigo) : "Sin código"} · ` : "";
  const pie = `${codigo}${cuando.format(e.cuando)} · ${e.quien}`;

  if (e.clase === "precio") {
    return (
      <Fila icono="editar" titulo="Cambio de precio" testid="evento-precio">
        <span className="block">
          De {formatearPrecio(e.anterior)} a {formatearPrecio(e.nuevo)}
        </span>
        <span className="block text-text-muted">{pie}</span>
      </Fila>
    );
  }

  if (e.clase === "etiquetado") {
    // Suma cero: se dice así, sin signo de venta ni de entrada (`D-012`).
    return (
      <Fila
        icono="etiquetado"
        titulo="Etiquetado"
        testid="evento-etiquetado"
        cifra={<span className="text-lg font-bold text-text-muted tabular-nums">±0</span>}
      >
        <span className="block">
          {e.cantidad} de «sin código» a {cola(e.codigo)}
        </span>
        <span className="block text-text-muted">
          {cuando.format(e.cuando)} · {e.quien}
        </span>
      </Fila>
    );
  }

  if (e.clase === "activacion") {
    return (
      <Fila
        icono="retirar"
        titulo={e.activo ? "Volvió a la venta" : "Dejó de venderse"}
        testid="evento-activacion"
      >
        <span className="block text-text-muted">{pie}</span>
      </Fila>
    );
  }

  const suma = e.cantidad > 0;
  const cifra = (
    <Cantidad
      valor={e.cantidad}
      conSigno
      className={`text-lg font-bold ${suma ? "text-accent" : "text-danger"}`}
    />
  );
  const icono: NombreDeIcono =
    e.tipo === "sale" || e.tipo === "sale_void"
      ? "ventas"
      : e.tipo === "adjustment"
        ? "contar"
        : "productos";

  return (
    <Fila
      icono={icono}
      titulo={ETIQUETA_MOVIMIENTO[e.tipo]}
      testid={`movimiento-${e.tipo}`}
      cifra={cifra}
      href={e.ventaId ? conDesde(`/ventas/${e.ventaId}`, aqui) : undefined}
    >
      <span className="block text-text-muted">{pie}</span>
      {e.motivo ? <span className="block">{e.motivo}</span> : null}
    </Fila>
  );
}

function Fila({
  icono,
  titulo,
  testid,
  cifra,
  href,
  children,
}: {
  icono: NombreDeIcono;
  titulo: string;
  testid: string;
  cifra?: React.ReactNode;
  href?: string | undefined;
  children: React.ReactNode;
}) {
  const cuerpo = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-text-muted">
        <Icono nombre={icono} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{titulo}</span>
        {children}
      </span>
      {cifra}
    </>
  );
  return (
    <li data-testid={testid}>
      {href ? (
        <Link
          href={href}
          className="flex min-h-16 items-center gap-3 px-4 py-3"
          data-testid="de-una-venta"
        >
          {cuerpo}
          <Icono nombre="siguiente" className="text-text-muted" />
          <span className="sr-only">Ver la venta</span>
        </Link>
      ) : (
        <div className="flex min-h-16 items-center gap-3 px-4 py-3">{cuerpo}</div>
      )}
    </li>
  );
}
