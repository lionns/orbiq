"use client";

import { useEffect, useState } from "react";
import { Boton } from "@/ui/boton";
import { Icono } from "@/ui/iconos";

/** En el celular, o con la app abierta desde su ícono, imprimir la página no hace nada. */
function sinDialogoDeImpresion(): boolean {
  const instalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return instalada || window.matchMedia("(pointer: coarse)").matches;
}

/**
 * «Imprimir» (`T-038`). En computador abre el diálogo del navegador, que ya permite guardar como
 * PDF. En el celular abre el menú de compartir con el PDF de la hoja: en iPhone trae «Imprimir» y
 * «Guardar en Archivos»; en Android, abrirlo en el visor de PDF o guardarlo.
 *
 * El PDF se pide al montar y no al tocar: iPhone solo abre el menú de compartir si sale del toque
 * mismo, y una descarga en medio lo rompe.
 */
export function BotonImprimir({ pdf, className = "" }: { pdf: string; className?: string }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [movil, setMovil] = useState(false);

  useEffect(() => {
    if (!sinDialogoDeImpresion()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende de la pantalla, que el servidor no ve
    setMovil(true);
    let vigente = true;
    void fetch(pdf)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (vigente && b) setArchivo(new File([b], "etiquetas.pdf", { type: "application/pdf" }));
      });
    return () => {
      vigente = false;
    };
  }, [pdf]);

  function descargar() {
    const enlace = document.createElement("a");
    enlace.href = archivo ? URL.createObjectURL(archivo) : pdf;
    enlace.download = "etiquetas.pdf";
    enlace.click();
  }

  async function imprimir() {
    if (!movil) {
      window.print();
      return;
    }
    if (archivo && navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: "Etiquetas" });
        return;
      } catch (error) {
        // Cerrar el menú sin elegir nada no es un error; que el sistema lo rechace, sí.
        if ((error as Error).name === "AbortError") return;
      }
    }
    descargar();
  }

  return (
    <Boton
      type="button"
      variante="principal"
      tamano="alto"
      className={className}
      onClick={() => void imprimir()}
      disabled={movil && !archivo}
      data-testid="imprimir"
    >
      <Icono nombre="imprimir" />
      {movil && !archivo ? "Preparando el PDF…" : "Imprimir"}
    </Boton>
  );
}
