"use client";

import { useActionState, useState } from "react";
import { CONTRASENA_MINIMA } from "@/domain/persona";
import { BarraInferior } from "@/ui/barra-inferior";
import { Boton } from "@/ui/boton";
import { Campo } from "@/ui/campo";
import { Icono } from "@/ui/iconos";
import { darDeAltaEmpleado, type EstadoAlta } from "../acciones";

const inicial: EstadoAlta = { errores: {} };

/**
 * Nombre, correo y contraseña inicial, y a la vista lo que un empleado puede y no puede hacer: el
 * dueño decide sabiendo qué entrega (`.diseno/personas/Anadir`).
 */
export function FormularioPersona() {
  const [estado, accion, enviando] = useActionState(darDeAltaEmpleado, inicial);
  const [ver, setVer] = useState(false);
  // Controlados: React vacía un formulario al volver de su acción, y un error no debe borrar lo
  // escrito.
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const e = estado.errores;

  return (
    <form action={accion} className="mt-5 flex flex-col gap-5">
      <Campo
        etiqueta="Nombre"
        nombre="nombre"
        autoComplete="off"
        error={e.nombre}
        value={nombre}
        onChange={(ev) => setNombre(ev.target.value)}
        required
      />
      <Campo
        etiqueta="Correo"
        nombre="correo"
        type="email"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        icono="correo"
        value={correo}
        onChange={(ev) => setCorreo(ev.target.value)}
        error={e.correo}
        ayuda="Con él entra. No se le envía ningún correo."
        required
      />
      <Campo
        etiqueta="Contraseña"
        nombre="contrasena"
        type={ver ? "text" : "password"}
        autoComplete="new-password"
        icono="clave"
        minLength={CONTRASENA_MINIMA}
        value={contrasena}
        onChange={(ev) => setContrasena(ev.target.value)}
        error={e.contrasena}
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

      <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4" data-testid="lo-que-puede">
        <p className="font-bold">Un empleado puede</p>
        {["Vender, escanear y buscar", "Ver Inicio y las ventas, con sus totales"].map((t) => (
          <p key={t} className="flex gap-2.5">
            <Icono nombre="cobrar" className="mt-0.5 text-accent" />
            {t}
          </p>
        ))}
        <p className="mt-1.5 font-bold">Solo tú puedes</p>
        {[
          "Anular una venta",
          "Cambiar precios, editar o dar de alta productos",
          "Corregir el conteo y registrar lo que llegó",
          "Dar de alta o de baja a personas",
        ].map((t) => (
          <p key={t} className="flex gap-2.5 text-text-muted">
            <Icono nombre="clave" className="mt-0.5" />
            {t}
          </p>
        ))}
      </div>

      <BarraInferior className="p-4 lg:static lg:mt-1 lg:border-0 lg:bg-transparent lg:p-0">
        <div className="mx-auto w-full max-w-xl">
          <Boton
            type="submit"
            variante="principal"
            tamano="alto"
            disabled={enviando}
            className="w-full text-lg"
            data-testid="dar-de-alta-persona"
          >
            <Icono nombre="cobrar" />
            {enviando ? "Dando de alta…" : nombre.trim() ? `Dar de alta a ${nombre.trim()}` : "Dar de alta"}
          </Boton>
        </div>
      </BarraInferior>
    </form>
  );
}
