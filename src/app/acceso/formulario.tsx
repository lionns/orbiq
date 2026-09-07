"use client";

import { useActionState } from "react";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { entrar, type EstadoAcceso } from "./acciones";

const inicial: EstadoAcceso = { error: null };

export function FormularioAcceso() {
  const [estado, accion, enviando] = useActionState(entrar, inicial);

  return (
    <form action={accion} className="mt-8 flex flex-col gap-5">
      <Campo
        etiqueta="Correo"
        nombre="correo"
        type="email"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        required
      />
      <Campo
        etiqueta="Contraseña"
        nombre="contrasena"
        type="password"
        autoComplete="current-password"
        required
      />

      {/* Vive siempre en el árbol para que el lector de pantalla lo anuncie al aparecer. */}
      <Aviso data-testid="acceso-error">{estado.error ?? ""}</Aviso>

      <Boton type="submit" variante="principal" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>
    </form>
  );
}
