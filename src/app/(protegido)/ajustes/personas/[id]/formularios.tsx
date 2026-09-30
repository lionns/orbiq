"use client";

import { useActionState, useState } from "react";
import { CONTRASENA_MINIMA } from "@/domain/persona";
import { Aviso } from "@/ui/aviso";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Icono } from "@/ui/iconos";
import { bajaDeEmpleado, cambiarClave, type EstadoBaja, type EstadoClave } from "../acciones";

/** Cambiar su contraseña: el dueño la escribe y se la dice. Cierra sus sesiones abiertas. */
export function FormularioClave({ id }: { id: string }) {
  const [estado, accion, enviando] = useActionState<EstadoClave, FormData>(
    cambiarClave.bind(null, id),
    { error: null, hecho: null },
  );
  const [ver, setVer] = useState(false);
  return (
    <form action={accion} className="flex flex-col gap-3">
      <Campo
        etiqueta="Contraseña nueva"
        nombre="contrasena"
        type={ver ? "text" : "password"}
        autoComplete="new-password"
        icono="clave"
        minLength={CONTRASENA_MINIMA}
        error={estado.error ?? undefined}
        ayuda={`Mínimo ${CONTRASENA_MINIMA}. Dísela en persona.`}
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
      {estado.hecho ? (
        <p role="status" className="font-semibold text-accent" data-testid="clave-cambiada">
          {estado.hecho}
        </p>
      ) : null}
      <Boton type="submit" variante="principal" disabled={enviando} data-testid="cambiar-clave">
        <Icono nombre="clave" />
        Cambiar la contraseña
      </Boton>
    </form>
  );
}

/**
 * Dar de baja (`.diseno/personas/Persona-baja`): dice qué pasa y qué se conserva antes del botón.
 * Está detrás de «Dar de baja», que se abre a propósito, como anular una venta.
 */
export function BotonBaja({ id, nombre, ventas }: { id: string; nombre: string; ventas: string }) {
  const [estado, accion, enviando] = useActionState<EstadoBaja, FormData>(
    bajaDeEmpleado.bind(null, id),
    { error: null },
  );
  return (
    <form action={accion} className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {[
          "Se le cierra la sesión ahora, en su celular y donde sea.",
          "Ya no puede volver a entrar.",
          ventas,
          `Puedes volver a darle acceso cuando quieras.`,
        ].map((t) => (
          <li key={t} className="flex gap-2.5">
            <Icono nombre="alerta" className="mt-0.5 text-text-muted" />
            {t}
          </li>
        ))}
      </ul>
      <Aviso conBorde={Boolean(estado.error)}>{estado.error ?? ""}</Aviso>
      <Boton type="submit" variante="peligro" tamano="alto" disabled={enviando} data-testid="confirmar-baja">
        <Icono nombre="darDeBaja" />
        Dar de baja a {nombre}
      </Boton>
    </form>
  );
}
