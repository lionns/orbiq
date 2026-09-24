"use client";

import { useActionState } from "react";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { CampoCategoria } from "@/ui/campo-categoria";
import { Icono } from "@/ui/iconos";
import { editar, type EstadoEdicion } from "./acciones";

const inicial: EstadoEdicion = { errores: {}, hecho: false };

export function FormularioEdicion({
  productoId,
  producto,
  categorias,
}: {
  productoId: string;
  producto: { nombre: string; precio: number; categoria: string | null; codigoDeBarras: string | null };
  categorias: string[];
}) {
  const [estado, accion, enviando] = useActionState(editar.bind(null, productoId), inicial);

  return (
    <form action={accion} className="flex flex-col gap-5">
      <Campo
        etiqueta="Nombre"
        nombre="nombre"
        defaultValue={producto.nombre}
        error={estado.errores.nombre}
        required
      />
      <Campo
        etiqueta="Precio"
        nombre="precio"
        defaultValue={producto.precio}
        error={estado.errores.precio}
        ayuda="Cambiarlo queda registrado abajo. No toca lo que ya se cobró."
        inputMode="numeric"
        prefijo="$"
        required
      />
      <CampoCategoria
        categorias={categorias}
        valorInicial={producto.categoria ?? ""}
        error={estado.errores.categoria}
      />
      <Campo
        etiqueta="Código de barras"
        nombre="codigoDeBarras"
        defaultValue={producto.codigoDeBarras ?? ""}
        error={estado.errores.codigoDeBarras}
        inputMode="numeric"
        icono="escanear"
        opcional
      />

      {estado.hecho ? (
        <p role="status" className="text-text-muted" data-testid="edicion-hecha">
          Guardado.
        </p>
      ) : null}

      <Boton
        type="submit"
        variante="principal"
        tamano="alto"
        disabled={enviando}
        data-testid="guardar-edicion"
      >
        <Icono nombre="cobrar" />
        {enviando ? "Guardando…" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
