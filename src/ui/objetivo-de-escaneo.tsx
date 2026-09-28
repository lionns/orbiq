"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  acumular,
  ajustesDeCamara,
  FORMATOS,
  LECTURA_VACIA,
  type AjustesDeCamara,
  type CapacidadesDeCamara,
  type LecturaEnCurso,
} from "@/domain/escaneo";
import { Boton } from "@/ui/boton";
import { CLASE_CONTROL } from "@/ui/campo";
import { Icono } from "@/ui/iconos";

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

/** Aplica un ajuste que no está en los tipos del estándar. Si la cámara lo rechaza, se sigue. */
async function ajustar(pista: MediaStreamTrack, ajuste: Record<string, unknown>): Promise<void> {
  try {
    await pista.applyConstraints({ advanced: [ajuste as MediaTrackConstraintSet] });
  } catch {
    // Anunciado y luego rechazado: pasa. La cámara abierta vale más que el ajuste.
  }
}

/**
 * Lo que la cámara acepta más allá del estándar. `focusMode` lo exponen Chrome y Edge en Android;
 * Safari en iPhone no, y ahí el teléfono enfoca por su cuenta sin que la página pueda pedírselo.
 */
type CapacidadesDeEnfoque = MediaTrackCapabilities & { focusMode?: string[] };

/**
 * Pide enfoque automático **continuo** donde la cámara lo permita (`T-034`). Sin pedirlo, algunos
 * Android enfocan una vez al abrir y se quedan ahí: el código se acerca y sale borroso. Donde no se
 * puede, no pasa nada: la cámara sigue con lo suyo.
 */
async function enfocarSiempre(pista: MediaStreamTrack | undefined): Promise<void> {
  const capacidades = pista?.getCapabilities?.() as CapacidadesDeEnfoque | undefined;
  if (!pista || !capacidades?.focusMode?.includes("continuous")) return;
  try {
    await pista.applyConstraints({
      advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
    });
  } catch {
    // Anunciarlo y luego rechazarlo pasa. La cámara abierta vale más que el enfoque perfecto.
  }
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
  admiteNombre = false,
  onVaciar,
  camaraActiva,
  onCamaraActiva,
  claseBotonCamara = "",
  enfocarEnComputador = false,
  comoEscanear = false,
  conLector = true,
  resumen,
}: {
  /**
   * Escuchar al lector de códigos en todo el documento. Falso donde ya hay otro objetivo que lo
   * escucha, o un campo propio donde el lector escribe: en la ficha, el de «Añadir otro código» le
   * robaría las lecturas al buscador de Productos cuando la ficha es un panel (`T-034`).
   */
  conLector?: boolean;
  /** Lo que lleva la venta en curso, dicho dentro del visor: se sabe que no se perdió (`T-034`). */
  resumen?: string | undefined;
  /** El botón dice «Escanear» en vez de «Cámara»: en Productos es lo que se va a hacer con ella. */
  comoEscanear?: boolean;
  /**
   * Devolver `true` vacía el campo. La venta lo pide cuando lo tecleado era un código que ya entró
   * al carrito: un lector de códigos escribe en este campo, y el siguiente código no puede caer
   * pegado al anterior. Un nombre buscado, en cambio, se queda (`T-017`).
   */
  onCodigo: (codigo: string) => void | boolean | Promise<void | boolean>;
  /**
   * La cámara puede encenderse desde fuera: en la venta del celular el botón vive abajo, junto a
   * Cobrar, donde llega el pulgar (`.diseno/cobalto`, punto 4). Sin estas dos, se maneja sola.
   */
  camaraActiva?: boolean;
  onCamaraActiva?: (activa: boolean) => void;
  /** Para esconder el botón propio donde otro ya lo sustituye (`hidden lg:inline-flex`). */
  claseBotonCamara?: string;
  /**
   * En computador el cursor vive en el campo: así un lector USB escribe ahí sin tocar nada
   * (punto 13). En el celular no, porque enfocar abre el teclado y tapa media pantalla.
   */
  enfocarEnComputador?: boolean;
  /** Se avisa al quedar el campo vacío: la venta lo usa para volver a los frecuentes. */
  onVaciar?: (() => void) | undefined;
  etiqueta?: string;
  /**
   * En la venta el mismo campo acepta nombre o código (`FR-015`): quien decide qué era es la
   * función de dominio, no la pantalla. Cambia el teclado que sale en el celular — con nombres, el
   * numérico no sirve.
   */
  admiteNombre?: boolean;
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
  const [activaPropia, setActivaPropia] = useState(false);
  const activa = camaraActiva ?? activaPropia;
  const setActiva = useCallback(
    (valor: boolean | ((estaba: boolean) => boolean)) => {
      const siguiente = typeof valor === "function" ? valor(activa) : valor;
      if (onCamaraActiva) onCamaraActiva(siguiente);
      else setActivaPropia(siguiente);
    },
    [activa, onCamaraActiva],
  );
  const campo = useRef<HTMLInputElement>(null);
  /**
   * Apagar desde dentro del efecto de la cámara sin que el efecto dependa del padre: si dependiera
   * de `onCamaraActiva`, que es una función nueva en cada render, React reiniciaría el efecto y la
   * cámara se moriría a los pocos milisegundos (`T-016`).
   */
  const apagar = useRef(() => setActiva(false));
  useEffect(() => {
    apagar.current = () => setActiva(false);
  });

  useEffect(() => {
    if (enfocarEnComputador && window.matchMedia("(min-width: 1024px)").matches) {
      campo.current?.focus();
    }
  }, [enfocarEnComputador]);
  const [fallo, setFallo] = useState(false);
  // Lo que esta cámara permite (`T-034`): se sabe al abrirla, y se olvida al cerrarla.
  const pistaActual = useRef<MediaStreamTrack | null>(null);
  const [ajustes, setAjustes] = useState<AjustesDeCamara | null>(null);
  const [acercado, setAcercado] = useState(false);
  const [toque, setToque] = useState<{ x: number; y: number } | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
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
    if (!conLector) return;
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
  }, [emitir, conLector]);

  // El visor se cierra con Esc, como cualquier ventana, y al abrirse lleva el foco a «Cerrar»: quien
  // opera con teclado tiene que poder salir (`AC-X02`).
  const cerrar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!activa) return;
    cerrar.current?.focus();
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape") apagar.current();
    }
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [activa]);

  // Entrada 3 — la cámara. El bucle vive aquí y no en un `setInterval` suelto: al desmontar hay que
  // apagar la cámara, o el piloto del teléfono se queda encendido después de salir de la pantalla.
  useEffect(() => {
    if (!activa) return;
    let flujo: MediaStream | null = null;
    let vivo = true;

    (async () => {
      try {
        flujo = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            // Más resolución, más barras por código: se lee a más distancia, que es donde la
            // cámara sí enfoca. 1280 y no 1920: en iPhone decodifica el respaldo en WebAssembly, y
            // cada cuadro más grande es más lento de leer (`T-016`, `NFR-001`).
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (!vivo) return;
        const el = video.current;
        if (el) {
          el.srcObject = flujo;
          await el.play();
        }
        if (!vivo) return;
        // Después de enseñar la imagen, no antes: pedirle a la cámara que ajuste el enfoque tarda,
        // y ese rato sería pantalla negra con alguien esperando.
        const [pista] = flujo.getVideoTracks();
        pistaActual.current = pista ?? null;
        void enfocarSiempre(pista);
        setAjustes(
          ajustesDeCamara(
            pista?.getCapabilities?.() as CapacidadesDeCamara | undefined,
            navigator.mediaDevices.getSupportedConstraints() as Record<string, boolean | undefined>,
            (pista?.getSettings?.() as { zoom?: number } | undefined)?.zoom,
          ),
        );
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
            apagar.current();
            break;
          }
          await new Promise((r) => setTimeout(r, 120));
        }
      } catch {
        // Sin permiso o sin cámara. Se dice, no se disimula (`NFR-004`): quedan las otras dos
        // entradas y el dueño tiene que saber cuál le queda.
        if (vivo) {
          setFallo(true);
          apagar.current();
        }
      }
    })();

    return () => {
      vivo = false;
      flujo?.getTracks().forEach((t) => t.stop());
      pistaActual.current = null;
      setAjustes(null);
      setAcercado(false);
      setToque(null);
    };
  }, [activa, emitir]);

  /**
   * Tocar la imagen enfoca ahí, como en la cámara del teléfono (`.diseno/codigos/Visor`). Solo
   * donde la cámara lo permite; el círculo es la respuesta al toque y se va solo. Al rato vuelve el
   * enfoque continuo, para que siga al código si se mueve.
   */
  function enfocarEn(evento: React.MouseEvent<HTMLDivElement>) {
    const pista = pistaActual.current;
    if (!ajustes?.enfocarAlTocar || !pista) return;
    const caja = evento.currentTarget.getBoundingClientRect();
    const x = evento.clientX - caja.left;
    const y = evento.clientY - caja.top;
    setToque({ x, y });
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      setToque(null);
      void enfocarSiempre(pistaActual.current ?? undefined);
    }, 1500);
    void ajustar(pista, {
      pointsOfInterest: [{ x: x / caja.width, y: y / caja.height }],
      focusMode: "single-shot",
    });
  }
  useEffect(() => () => clearTimeout(temporizador.current), []);

  function alternarZoom(evento: React.MouseEvent) {
    evento.stopPropagation();
    const pista = pistaActual.current;
    if (!ajustes?.zoom || !pista) return;
    const siguiente = !acercado;
    setAcercado(siguiente);
    void ajustar(pista, { zoom: siguiente ? ajustes.zoom.acercado : ajustes.zoom.normal });
  }

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
            ref={campo}
            name="codigo"
            value={tecleado}
            onChange={(e) => {
              setTecleado(e.target.value);
              if (!e.target.value) onVaciar?.();
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              // El texto **se queda**. Al buscar por nombre, vaciarlo es como se vuelve a los
              // frecuentes (`T-017`), y no se puede vaciar lo que ya se vació solo. La cámara y el
              // lector no pasan por este campo, así que no les afecta.
              const texto = tecleado.trim();
              if (!texto) return;
              // Se vacía solo si sigue diciendo lo que se envió (`T-038`). La respuesta llega después,
              // y entretanto el lector pudo empezar a escribir el siguiente código —o el dueño, un
              // nombre—: vaciarlo a ciegas lo cortaba a medias.
              void Promise.resolve(onCodigo(texto)).then((limpiar) => {
                if (limpiar) setTecleado((ahora) => (ahora.trim() === texto ? "" : ahora));
              });
            }}
            // El teclado que sale en el celular. Numérico mientras solo entren códigos; con
            // nombres tiene que ser el normal o no se puede escribir «panela».
            inputMode={admiteNombre ? "text" : "numeric"}
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
          variante="suave"
          className={`shrink-0 ${claseBotonCamara}`}
        >
          <Icono nombre={comoEscanear ? "escanear" : "camara"} className="text-accent" />
          {comoEscanear ? "Escanear" : "Cámara"}
        </Boton>
      </div>

      {activa
        ? createPortal(
            // El visor (`.diseno/codigos/Visor`, `T-034`): la cámara al centro y tapándolo todo, para
            // que se note que se está dentro de ella. A pantalla completa en el celular; en computador,
            // una ventana centrada sobre la pantalla oscurecida. Oscuro en los dos temas. Va al `body`
            // por un portal: dentro de un contenedor con `transform` o `overflow`, `fixed` no tapa la
            // pantalla, sino ese contenedor.
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-visor"
              className="fixed inset-0 z-50 flex bg-visor text-visor-text lg:items-center lg:justify-center lg:bg-visor/80"
              data-testid="visor"
            >
              <div className="flex w-full flex-col pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:max-w-2xl lg:rounded-bloque lg:bg-visor lg:p-5">
                <div className="flex items-center justify-between gap-3 px-4 lg:px-0">
                  <h2 id="titulo-visor" className="text-xl font-bold tracking-tight lg:text-2xl">
                    Apunta al código
                  </h2>
                  <button
                    ref={cerrar}
                    type="button"
                    onClick={() => apagar.current()}
                    className="flex min-h-12 items-center gap-1.5 rounded-full bg-visor-text/15 px-4 font-semibold"
                    data-testid="cerrar-camara"
                  >
                    <Icono nombre="cerrar" />
                    Cerrar
                  </button>
                </div>

                <div className="grid flex-1 place-items-center px-4 py-4 lg:px-0">
                  <div
                    onClick={enfocarEn}
                    className="relative aspect-3/4 w-full max-w-md overflow-hidden rounded-card bg-visor lg:aspect-video lg:max-w-none"
                  >
                    <video
                      ref={video}
                      muted
                      playsInline
                      data-testid="camara"
                      className="absolute inset-0 size-full object-cover"
                    />
                    {/* El marco dice dónde poner el código. Es dibujo: no lo anuncia un lector. */}
                    <div aria-hidden="true" className="absolute inset-x-8 top-1/3 bottom-1/3 lg:inset-x-1/4">
                      <span className="absolute top-0 left-0 size-9 rounded-tl-xl border-t-4 border-l-4 border-visor-marco" />
                      <span className="absolute top-0 right-0 size-9 rounded-tr-xl border-t-4 border-r-4 border-visor-marco" />
                      <span className="absolute bottom-0 left-0 size-9 rounded-bl-xl border-b-4 border-l-4 border-visor-marco" />
                      <span className="absolute right-0 bottom-0 size-9 rounded-br-xl border-r-4 border-b-4 border-visor-marco" />
                      <span className="absolute inset-x-2 top-1/2 h-0.5 bg-visor-marco" />
                    </div>
                    {toque ? (
                      <span
                        aria-hidden="true"
                        style={{ left: toque.x, top: toque.y }}
                        className="pointer-events-none absolute -mt-7 -ml-7 size-14 rounded-full border-3 border-visor-text"
                        data-testid="enfoque-tocado"
                      />
                    ) : null}
                    {ajustes?.zoom ? (
                      <button
                        type="button"
                        onClick={alternarZoom}
                        aria-pressed={acercado}
                        aria-label={acercado ? "Volver al tamaño normal" : "Acercar dos veces"}
                        className={`absolute right-3 bottom-3 min-h-12 min-w-16 rounded-full border-2 px-3.5 text-lg font-bold ${
                          acercado
                            ? "border-visor-marco bg-visor-marco text-visor"
                            : "border-visor-borde bg-visor/70 text-visor-text"
                        }`}
                        data-testid="acercar"
                      >
                        {acercado ? "1×" : "2×"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3 px-4 text-center lg:px-0">
                  <p className="text-lg font-semibold">Se lee solo. No hace falta tocar nada.</p>
                  {/* Dice qué hacer cuando pasa, no una medida: «a un palmo» no se entendía. */}
                  <p className="text-lg font-semibold lg:hidden">
                    ¿Se ve borroso? Aleja un poco el teléfono.
                  </p>
                  {ajustes?.zoom ? (
                    <p className="text-visor-muted lg:hidden">
                      Si el código se ve muy pequeño, toca 2×.
                    </p>
                  ) : null}
                  <p className="text-visor-muted max-lg:hidden">
                    ¿Se ve borroso? Aleja un poco el código de la cámara. Con el lector de códigos no
                    hace falta abrirla.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      apagar.current();
                      campo.current?.focus();
                    }}
                    className="flex min-h-14 items-center justify-center gap-2 self-stretch rounded-button border border-visor-borde text-lg font-semibold lg:hidden"
                  >
                    <Icono nombre="teclado" />
                    Escribir el código
                  </button>
                  {resumen ? (
                    <span className="rounded-full bg-visor-text/10 px-3.5 py-1.5 font-semibold tabular-nums">
                      {resumen}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {fallo ? (
        <p role="alert" className="text-danger" data-testid="camara-sin-permiso">
          No se pudo abrir la cámara. Teclea el código o usa el lector.
        </p>
      ) : null}
    </div>
  );
}
