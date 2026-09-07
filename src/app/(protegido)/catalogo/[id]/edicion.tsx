"use client";

import { useActionState } from "react";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
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
    <form action={accion} className="mt-4 flex flex-col gap-4">
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
        required
      />
      <Campo
        etiqueta="Categoría"
        nombre="categoria"
        defaultValue={producto.categoria ?? ""}
        error={estado.errores.categoria}
        list="categorias"
      />
      <datalist id="categorias">
        {categorias.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Campo
        etiqueta="Código de barras"
        nombre="codigoDeBarras"
        defaultValue={producto.codigoDeBarras ?? ""}
        error={estado.errores.codigoDeBarras}
        inputMode="numeric"
      />

      {estado.hecho ? (
        <p role="status" className="text-text-muted" data-testid="edicion-hecha">
          Guardado.
        </p>
      ) : null}

      <Boton type="submit" variante="principal" disabled={enviando} data-testid="guardar-edicion">
        {enviando ? "Guardando…" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
