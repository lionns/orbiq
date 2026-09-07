"use client";

import { useActionState } from "react";
import { darDeAlta, type EstadoAlta } from "./acciones";

const inicial: EstadoAlta = { errores: {} };

const claseCampo =
  "min-h-12 rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] px-4";

function Campo({
  etiqueta,
  nombre,
  error,
  ayuda,
  ...resto
}: {
  etiqueta: string;
  nombre: string;
  error?: string | undefined;
  ayuda?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const idError = `${nombre}-error`;
  return (
    <label className="flex flex-col gap-2">
      <span className="font-medium">{etiqueta}</span>
      {ayuda ? <span className="text-[color:var(--color-text-muted)]">{ayuda}</span> : null}
      <input
        name={nombre}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        className={claseCampo}
        {...resto}
      />
      {/* El error va donde falló, no en una lista arriba (design-handoff.md § Interaction States). */}
      {error ? (
        <span id={idError} className="text-[color:var(--color-danger)]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

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

      <div className="fixed inset-x-0 bottom-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
        <button
          type="submit"
          disabled={enviando}
          className="mx-auto flex min-h-12 w-full max-w-2xl items-center justify-center rounded-[var(--radius-button)] bg-[color:var(--color-accent)] px-4 font-medium text-[color:var(--color-accent-text)] disabled:opacity-60"
        >
          {enviando ? "Guardando…" : "Guardar producto"}
        </button>
      </div>
    </form>
  );
}
