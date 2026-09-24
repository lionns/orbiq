"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Icono } from "@/ui/iconos";
import { entrar, type EstadoAcceso } from "./acciones";

const inicial: EstadoAcceso = { error: null };

/** El acceso (`.diseno/cobalto/F-M-Acceso`): el error arriba, en rojo, y «Mostrar» la contraseña. */
export function FormularioAcceso() {
  const [estado, accion, enviando] = useActionState(entrar, inicial);
  const [ver, setVer] = useState(false);

  return (
    <form action={accion} className="mt-7 flex flex-col gap-5">
      {/* Vive siempre en el árbol para que el lector de pantalla lo anuncie al aparecer. Arriba y
          no al pie: es lo primero que hay que leer al volver a intentarlo. */}
      <Aviso conBorde={Boolean(estado.error)} data-testid="acceso-error">
        {estado.error ?? ""}
      </Aviso>

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
        type={ver ? "text" : "password"}
        autoComplete="current-password"
        required
        cola={
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-pressed={ver}
            className="flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 font-semibold text-accent"
          >
            <Icono nombre={ver ? "ocultar" : "mostrar"} className="size-4.5" />
            {ver ? "Ocultar" : "Mostrar"}
          </button>
        }
      />

      <Boton type="submit" variante="principal" tamano="alto" disabled={enviando} className="mt-1">
        <Icono nombre="entrar" />
        {enviando ? "Entrando…" : "Entrar"}
      </Boton>
    </form>
  );
}
