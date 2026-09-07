"use client";

import { useActionState } from "react";
import { Boton } from "@/ui/boton";
import { BarraInferior } from "@/ui/barra-inferior";
import { Campo } from "@/ui/campo";
import { darDeAlta, type EstadoAlta } from "./acciones";

const inicial: EstadoAlta = { errores: {} };

export function FormularioProducto({ categorias }: { categorias: string[] }) {
  const [estado, accion, enviando] = useActionState(darDeAlta, inicial);

  return (
    <form action={accion} className="mt-6 flex flex-col gap-5 pb-28">
      <Campo etiqueta="Nombre" nombre="nombre" error={estado.errores.nombre} required autoFocus />
      <Campo
        etiqueta="Precio"
        nombre="precio"
        error={estado.errores.precio}
        inputMode="numeric"
        required
      />
      <Campo
        etiqueta="Existencias iniciales"
        nombre="existenciasIniciales"
        error={estado.errores.existenciasIniciales}
        ayuda="Cuántas tienes ahora. Puede quedar vacío."
        inputMode="numeric"
      />
      <Campo
        etiqueta="Categoría"
        nombre="categoria"
        error={estado.errores.categoria}
        ayuda="Opcional. Si no existe, se crea."
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
        error={estado.errores.codigoDeBarras}
        ayuda="Opcional. Granel, pan y huevos no tienen."
        inputMode="numeric"
      />

      <BarraInferior className="p-4">
        <Boton
          type="submit"
          variante="principal"
          disabled={enviando}
          className="mx-auto w-full max-w-2xl"
        >
          {enviando ? "Guardando…" : "Guardar producto"}
        </Boton>
      </BarraInferior>
    </form>
  );
}
