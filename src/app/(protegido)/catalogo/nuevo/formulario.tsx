"use client";

import { useActionState, useState } from "react";
import { Boton, BotonEnlace } from "@/ui/boton";
import { BarraInferior } from "@/ui/barra-inferior";
import { Campo } from "@/ui/campo";
import { CampoCategoria } from "@/ui/campo-categoria";
import { Icono } from "@/ui/iconos";
import { ObjetivoDeEscaneo } from "@/ui/objetivo-de-escaneo";
import { darDeAlta, type EstadoAlta } from "./acciones";

const inicial: EstadoAlta = { errores: {} };

/**
 * El alta (`.diseno/cobalto/F-M-Nuevo`, `F-D-Nuevo`). Precio y existencias van en pareja porque se
 * piensan juntos; lo opcional lo dice su etiqueta, no una ayuda repetida.
 */
export function FormularioProducto({
  categorias,
  codigo = "",
  cancelar,
}: {
  categorias: string[];
  /** Precargado cuando se llega desde un escaneo de código desconocido (`AC-007`). */
  codigo?: string;
  /** Adónde vuelve «Cancelar» en computador, donde el alta se abre al lado de la lista. */
  cancelar: string;
}) {
  const [estado, accion, enviando] = useActionState(darDeAlta, inicial);
  const [codigoDeBarras, setCodigoDeBarras] = useState(codigo);
  const [camara, setCamara] = useState(false);

  return (
    <form action={accion} className="mt-5 flex flex-col gap-5 pb-28 lg:pb-0">
      <Campo
        etiqueta="Nombre"
        nombre="nombre"
        error={estado.errores.nombre}
        placeholder="Como lo pide el cliente"
        required
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo
          etiqueta="Precio"
          nombre="precio"
          error={estado.errores.precio}
          inputMode="numeric"
          prefijo="$"
          required
        />
        <Campo
          etiqueta="Existencias"
          nombre="existenciasIniciales"
          error={estado.errores.existenciasIniciales}
          ayuda="Las que hay ahora."
          inputMode="numeric"
          placeholder="0"
        />
      </div>
      <CampoCategoria categorias={categorias} error={estado.errores.categoria} />
      <div className="flex flex-col gap-2">
        <Campo
          etiqueta="Código de barras"
          nombre="codigoDeBarras"
          opcional
          error={estado.errores.codigoDeBarras}
          ayuda="Granel, pan y huevos no tienen."
          inputMode="numeric"
          placeholder="Escanea o escribe"
          value={codigoDeBarras}
          onChange={(e) => setCodigoDeBarras(e.target.value)}
          cola={
            <button
              type="button"
              onClick={() => setCamara((estaba) => !estaba)}
              aria-pressed={camara}
              className="flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 font-semibold text-accent"
            >
              <Icono nombre={camara ? "cerrar" : "escanear"} />
              {camara ? "Cerrar" : "Escanear"}
            </button>
          }
        />
        {/* La misma cámara de la venta, sin botón propio: la enciende «Escanear», dentro del
            campo. Lo leído va al campo y la cámara se apaga sola. */}
        {camara ? (
          <ObjetivoDeEscaneo
            conCampo={false}
            camaraActiva={camara}
            onCamaraActiva={setCamara}
            claseBotonCamara="hidden!"
            onCodigo={(leido) => {
              setCodigoDeBarras(leido);
              setCamara(false);
            }}
          />
        ) : null}
      </div>

      <BarraInferior className="p-4 lg:static lg:mt-2 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto flex w-full max-w-2xl gap-2">
          <BotonEnlace href={cancelar} className="flex-1 max-lg:hidden">
            Cancelar
          </BotonEnlace>
          <Boton
            type="submit"
            variante="principal"
            tamano="alto"
            disabled={enviando}
            className="w-full lg:w-auto lg:flex-2"
          >
            <Icono nombre="cobrar" />
            {enviando ? "Guardando…" : "Guardar producto"}
          </Boton>
        </div>
      </BarraInferior>
    </form>
  );
}
