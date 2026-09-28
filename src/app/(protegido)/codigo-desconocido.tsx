"use client";

import { useEffect, useState } from "react";
import type { CandidatoParaCodigo } from "@/domain/catalogo";
import { cola } from "@/domain/codigos";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Precio } from "@/ui/cifras";
import { Icono } from "@/ui/iconos";
import { anadirCodigoAProducto, buscarParaCodigo } from "./acciones";

export type CodigoAnadido = {
  producto: { id: string; nombre: string; precio: number };
  codigo: { id: string; numero: string };
};

/**
 * «Ya lo vendo, cambió el código» (`.diseno/codigos/Elegir` y `Confirmar`, `D-010`).
 *
 * Dos pasos: encontrar por nombre el producto que ya se vende, y decir cuántas unidades llegaron
 * con el código nuevo. Es un componente y no una pantalla porque se usa en dos sitios: dentro de la
 * venta —que no puede navegar sin perder lo que lleva— y en Productos.
 */
export function AnadirAProducto({
  codigo,
  textoListo,
  onListo,
  onCancelar,
  textoCancelar,
  onNuevo,
}: {
  codigo: string;
  /** «Añadir código y vender» en la venta; «Añadir el código» en Productos. */
  textoListo: string;
  onListo: (r: CodigoAnadido) => void;
  onCancelar: () => void;
  textoCancelar: string;
  /** Si no aparece en la búsqueda, lo que queda es darlo de alta como nuevo. */
  onNuevo: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<CandidatoParaCodigo[] | null>(null);
  const [elegido, setElegido] = useState<CandidatoParaCodigo | null>(null);

  // Busca mientras se escribe, un momento después de la última tecla: con alguien esperando no se
  // pide pulsar «Buscar». La respuesta vieja que llega tarde se descarta.
  useEffect(() => {
    const limpio = texto.trim();
    if (!limpio) return;
    let vigente = true;
    const t = setTimeout(() => {
      void buscarParaCodigo(limpio).then((r) => {
        if (vigente) setResultados(r);
      });
    }, 200);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [texto]);

  if (elegido) {
    return (
      <Confirmar
        codigo={codigo}
        producto={elegido}
        textoListo={textoListo}
        onListo={onListo}
        onVolver={() => setElegido(null)}
      />
    );
  }

  const mostrados = texto.trim() ? resultados : null;

  return (
    <div className="flex flex-col" data-testid="anadir-a-producto">
      <button
        type="button"
        onClick={onCancelar}
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        {textoCancelar}
      </button>
      <h1 id="titulo-codigo" className="text-3xl font-bold tracking-tight">
        ¿Qué producto es?
      </h1>
      <p className="mt-1.5 text-text-muted">
        El código <span className="font-semibold text-text tabular-nums">{codigo}</span> se le añade
        al que elijas.
      </p>
      <div className="mt-4">
        <Campo
          etiqueta="Buscar por nombre"
          nombre="buscar-producto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          icono="buscar"
          autoFocus
          autoComplete="off"
          data-testid="buscar-producto-para-codigo"
        />
      </div>

      {mostrados === null ? null : mostrados.length === 0 ? (
        <p className="mt-4 text-text-muted" role="status">
          Ningún producto se llama «{texto.trim()}».
        </p>
      ) : (
        <ul
          className="mt-4 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
          data-testid="candidatos"
        >
          {mostrados.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setElegido(p)}
                className="flex min-h-18 w-full items-center gap-3 px-4 py-2.5 text-left"
                data-testid={`candidato-${p.id}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{p.nombre}</span>
                  <span className="block text-text-muted tabular-nums">
                    {p.codigos.length === 0
                      ? "Sin código"
                      : p.codigos.length === 1
                        ? "1 código"
                        : `${p.codigos.length} códigos`}{" "}
                    · Hay {p.existencias}
                  </span>
                </span>
                <Precio valor={p.precio} className="text-lg font-bold" />
                <Icono nombre="siguiente" className="text-text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onNuevo}
        className="mt-4 flex min-h-12 items-center gap-1.5 self-start font-semibold text-accent"
        data-testid="no-esta-darlo-de-alta"
      >
        <Icono nombre="nuevo" />
        No está: darlo de alta como nuevo
      </button>
    </div>
  );
}

function Confirmar({
  codigo,
  producto: p,
  textoListo,
  onListo,
  onVolver,
}: {
  codigo: string;
  producto: CandidatoParaCodigo;
  textoListo: string;
  onListo: (r: CodigoAnadido) => void;
  onVolver: () => void;
}) {
  const [llegaron, setLlegaron] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const n = /^\d+$/.test(llegaron) ? Number(llegaron) : 0;
  const paso = (d: number) => setLlegaron(String(Math.max(0, n + d)));

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      const r = await anadirCodigoAProducto(p.id, codigo, llegaron);
      if (!r.ok) return setError(r.mensaje);
      onListo({
        producto: { id: p.id, nombre: p.nombre, precio: p.precio },
        codigo: { id: r.codigoId, numero: codigo },
      });
    } catch {
      setError("No se guardó. Revisa la conexión y vuelve a intentarlo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col" data-testid="confirmar-codigo">
      <button
        type="button"
        onClick={onVolver}
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Elegir otro
      </button>
      <section className="flex flex-col rounded-card border border-border bg-surface p-5">
        <h1 id="titulo-codigo" className="text-2xl leading-tight font-semibold">
          {p.nombre}
        </h1>
        <Precio valor={p.precio} className="mt-2 text-4xl leading-none font-bold tracking-tight" />
        <span className="mt-1.5 text-text-muted">El mismo precio para todos sus códigos.</span>
      </section>

      <h2 className="mt-6 mb-2 text-xl font-bold tracking-tight">Sus códigos</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {p.codigos.map((c) => (
          <li key={c} className="flex min-h-14 items-center gap-3 px-4 font-medium tabular-nums">
            <Icono nombre="escanear" className="text-text-muted" />
            {c}
          </li>
        ))}
        <li className="flex min-h-14 items-center gap-3 bg-accent-soft px-4 font-bold tabular-nums">
          <Icono nombre="escanear" className="text-accent" />
          <span className="min-w-0 flex-1">{codigo}</span>
          <span className="rounded-full bg-accent px-2.5 py-0.5 font-semibold text-accent-text">
            Nuevo
          </span>
        </li>
      </ul>

      <label htmlFor="llegaron" className="mt-6 text-lg font-semibold">
        ¿Cuántas llegaron con este código?
      </label>
      <span className="mt-2 flex min-h-18 items-center justify-between gap-2 rounded-button border border-border-strong bg-surface p-1.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
        <button
          type="button"
          aria-label="Una menos"
          onClick={() => paso(-1)}
          className="grid size-14 place-items-center rounded-xl bg-bg text-3xl font-semibold active:bg-border"
        >
          −
        </button>
        <input
          id="llegaron"
          inputMode="numeric"
          value={llegaron}
          placeholder="0"
          onChange={(e) => setLlegaron(e.target.value.replace(/\D/g, ""))}
          className="w-24 min-w-0 flex-1 bg-transparent text-center text-4xl font-bold tabular-nums focus-visible:outline-none"
          data-testid="llegaron"
        />
        <button
          type="button"
          aria-label="Una más"
          onClick={() => paso(1)}
          className="grid size-14 place-items-center rounded-xl bg-bg text-3xl font-semibold active:bg-border"
        >
          +
        </button>
      </span>
      <p className="mt-2 text-text-muted tabular-nums" aria-live="polite">
        {n === 0
          ? "Si no las has contado, déjalo en cero y corrige el conteo después."
          : `Se suman a las ${p.existencias} que ya hay: quedan ${p.existencias + n} en total.`}
      </p>

      {error ? (
        <div className="mt-4">
          <Aviso asertivo conBorde data-testid="error-codigo">
            {error}
          </Aviso>
        </div>
      ) : null}

      <Boton
        type="button"
        variante="principal"
        tamano="cobro"
        onClick={guardar}
        disabled={guardando}
        className="mt-6"
        data-testid="guardar-codigo"
      >
        <Icono nombre="cobrar" />
        {guardando ? "Guardando…" : textoListo}
      </Boton>
    </div>
  );
}

/** Cómo se nombra el código en una línea de venta o del historial. */
export function nombreDeCodigo(numero: string | null | undefined): string {
  return numero ? `Código ${cola(numero)}` : "Sin código";
}
