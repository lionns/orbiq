"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { acumular, FORMATOS, LECTURA_VACIA, type LecturaEnCurso } from "@/domain/escaneo";
import { Boton } from "@/ui/boton";
import { CLASE_CONTROL } from "@/ui/campo";

/**
 * El objetivo de escaneo único de `D-009`: **una salida, tres entradas**.
 *
 * Quien lo usa recibe un código y no sabe si vino de la cámara, de una pistola lectora o del
 * teclado — que es exactamente lo que pide `AC-006`. Las tres entradas terminan en `emitir`, así
 * que no hay tres caminos que puedan divergir: hay uno con tres puertas.
 */

/**
 * Lo mínimo que necesitamos de un detector. Tipar así, y no contra la clase concreta, es lo que
 * deja intercambiar el nativo del navegador por el de WebAssembly sin una rama en el que lo usa.
 */
type Detector = { detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]> };

type ClaseNativa = {
  new (opciones: { formats: readonly string[] }): Detector;
  getSupportedFormats(): Promise<string[]>;
};

/**
 * Que exista `BarcodeDetector` no basta: la implementación de cada navegador soporta los formatos
 * que quiere, y pedirle uno que no tiene es un `TypeError` por especificación. Medido en Chromium:
 * anuncia `ean_13` y `ean_8` pero **no `upc_a`**, que es uno de los tres que un producto de tienda
 * puede traer.
 *
 * Así que el nativo se usa solo si los cubre todos. Cubrir dos de tres significaría que un
 * producto con UPC-A no escanea nunca y nadie sabe por qué.
 */
async function nativoCompleto(): Promise<ClaseNativa | null> {
  if (typeof globalThis === "undefined" || !("BarcodeDetector" in globalThis)) return null;
  const Nativo = (globalThis as unknown as { BarcodeDetector: ClaseNativa }).BarcodeDetector;
  try {
    const soportados = new Set(await Nativo.getSupportedFormats());
    return FORMATOS.every((f) => soportados.has(f)) ? Nativo : null;
  } catch {
    return null;
  }
}

/**
 * En Android `BarcodeDetector` es del navegador y no cuesta nada. En iPhone no existe —Safari no
 * lo implementa— y entra el respaldo en WebAssembly, que pesa 1,1 MB y por eso se importa solo
 * cuando hace falta y nunca en el paquete inicial. El `.wasm` sale de nuestro origen, no de un CDN
 * de terceros (`scripts/copiar-wasm.mjs`).
 */
async function crearDetector(): Promise<Detector> {
  const Nativo = await nativoCompleto();
  if (Nativo) return new Nativo({ formats: FORMATOS });
  const { BarcodeDetector, setZXingModuleOverrides } = await import("barcode-detector/ponyfill");
  setZXingModuleOverrides({
    locateFile: (ruta: string, prefijo: string) =>
      ruta.endsWith(".wasm") ? "/zxing_reader.wasm" : `${prefijo}${ruta}`,
  });
  return new BarcodeDetector({ formats: [...FORMATOS] }) as Detector;
}

/** Un campo de texto tiene el foco, así que las teclas son de quien escribe, no de un lector. */
function escribiendo(destino: EventTarget | null): boolean {
  const el = destino as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function ObjetivoDeEscaneo({
  onCodigo,
  etiqueta = "Código de barras",
  conCampo = true,
}: {
  onCodigo: (codigo: string) => void;
  etiqueta?: string;
  /**
   * El catálogo ya tiene un campo que busca por nombre **o código**, así que allí el objetivo
   * aporta la cámara y el lector y no un segundo cuadro de texto. Dos campos que aceptan lo mismo
   * en la misma pantalla no es una entrada más: es una duda.
   */
  conCampo?: boolean;
}) {
  const [tecleado, setTecleado] = useState("");
  /**
   * Dos estados y no uno con cuatro valores. `activa` es lo único que dispara el efecto de la
   * cámara, y el efecto **no lo escribe** salvo para apagarla: si el estado que enciende la cámara
   * cambiara mientras está encendida, React limpiaría el efecto y pararía el flujo a los pocos
   * milisegundos — la imagen aparecía y se moría sola. `fallo` queda fuera de sus dependencias a
   * propósito.
   */
  const [activa, setActiva] = useState(false);
  const [fallo, setFallo] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const lectura = useRef<LecturaEnCurso>(LECTURA_VACIA);

  const emitir = useCallback(
    (codigo: string) => {
      if (codigo) onCodigo(codigo);
    },
    [onCodigo],
  );

  // Entrada 1 — la pistola lectora. Es un teclado, así que se escucha en el documento; el ritmo lo
  // separa de una persona (`src/domain/escaneo.ts`). Mientras alguien escribe en un campo las
  // teclas son suyas: sin esto, escribir un nombre de producto sería indistinguible de escanear, y
  // `AC-X02` exige que toda pantalla siga siendo operable con teclado.
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent) {
      if (escribiendo(evento.target)) return;
      const paso = acumular(lectura.current, { tecla: evento.key, ahora: evento.timeStamp });
      lectura.current = paso.estado;
      if (paso.codigo) {
        evento.preventDefault();
        emitir(paso.codigo);
      }
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [emitir]);

  // Entrada 3 — la cámara. El bucle vive aquí y no en un `setInterval` suelto: al desmontar hay que
  // apagar la cámara, o el piloto del teléfono se queda encendido después de salir de la pantalla.
  useEffect(() => {
    if (!activa) return;
    let flujo: MediaStream | null = null;
    let vivo = true;

    (async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!vivo) return;
        const el = video.current;
        if (el) {
          el.srcObject = flujo;
          await el.play();
        }
        const detector = await crearDetector();

        while (vivo && el) {
          const encontrados = await detector.detect(el);
          if (!vivo) break;
          const primero = encontrados[0]?.rawValue;
          if (primero) {
            emitir(primero);
            // Se escanea un artículo y se ve el resultado: el escaneo continuo está fuera de
            // alcance. Cerrar es además el acuse de recibo — una cámara que sigue abierta y ya no
            // lee es peor que ninguna.
            setActiva(false);
            break;
          }
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch {
        // Sin permiso o sin cámara. Se dice, no se disimula (`NFR-004`): quedan las otras dos
        // entradas y el dueño tiene que saber cuál le queda.
        if (vivo) {
          setFallo(true);
          setActiva(false);
        }
      }
    })();

    return () => {
      vivo = false;
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [activa, emitir]);

  // Sin campo propio el objetivo es un botón dentro de una fila ajena: no ocupa alto mientras está
  // cerrado, y se lleva la fila entera solo cuando hay algo que enseñar.
  const ocupaLaFila = !conCampo && (activa || fallo) ? "basis-full" : "";

  return (
    <div className={`flex flex-col gap-2 ${ocupaLaFila}`} data-testid="objetivo-de-escaneo">
      <div className="flex gap-2">
        {/* Entrada 2 — tecleado a mano. Es el camino de quien tiene el código impreso borrado. */}
        {conCampo ? (
        <label className="min-w-0 flex-1">
          <span className="sr-only">{etiqueta}</span>
          <input
            name="codigo"
            value={tecleado}
            onChange={(e) => setTecleado(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              emitir(tecleado.trim());
              setTecleado("");
            }}
            // `inputMode` saca el teclado numérico en celular sin impedir pegar un código.
            inputMode="numeric"
            autoComplete="off"
            placeholder={etiqueta}
            data-testid="codigo-tecleado"
            className={CLASE_CONTROL}
          />
        </label>
        ) : null}
        <Boton
          type="button"
          onClick={() => {
            setFallo(false);
            setActiva((estaba) => !estaba);
          }}
          data-testid="alternar-camara"
          className="shrink-0"
        >
          {activa ? "Cerrar" : "Cámara"}
        </Boton>
      </div>

      {activa ? (
        <video
          ref={video}
          muted
          playsInline
          data-testid="camara"
          className="w-full rounded-card border border-border-strong bg-surface"
        />
      ) : null}

      {fallo ? (
        <p role="alert" className="text-danger" data-testid="camara-sin-permiso">
          No se pudo abrir la cámara. Teclea el código o usa el lector.
        </p>
      ) : null}
    </div>
  );
}
