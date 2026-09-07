"use client";

import { useActionState } from "react";
import { entrar, type EstadoAcceso } from "./acciones";

const inicial: EstadoAcceso = { error: null };

export function FormularioAcceso() {
  const [estado, accion, enviando] = useActionState(entrar, inicial);

  return (
    <form action={accion} className="mt-8 flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="font-medium">Correo</span>
        <input
          name="correo"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          required
          className="min-h-12 rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg)] px-4"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium">Contraseña</span>
        <input
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-bg)] px-4"
        />
      </label>

      {/* Vive siempre en el árbol para que el lector de pantalla lo anuncie al aparecer. */}
      <p
        role="alert"
        aria-live="polite"
        data-testid="acceso-error"
        className="text-[color:var(--color-danger)]"
      >
        {estado.error ?? ""}
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-12 rounded-[var(--radius-button)] bg-[color:var(--color-accent)] px-4 font-medium text-[color:var(--color-accent-text)] disabled:opacity-60"
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
