"use client";

import { useEffect, useId, useState } from "react";
import { Campo } from "./campo";
import { Icono } from "./iconos";

const SUGERENCIAS = 5;

/**
 * La categoría que sugiere mientras se escribe y ofrece crear la que no existe
 * (`.diseno/cobalto/F-M-Nuevo`, punto 5 de formularios). Crear no es una operación aparte: la
 * categoría nace al guardar el producto, como siempre («Si no existe, se crea»).
 *
 * Sin JavaScript queda el `datalist` de siempre, que el navegador pinta a su manera: el campo se
 * envía igual. Con JavaScript, el `datalist` se retira y aparece la lista propia, con el patrón
 * «combobox» de ARIA para el teclado y el lector de pantalla.
 */
export function CampoCategoria({
  categorias,
  valorInicial = "",
  error,
}: {
  categorias: string[];
  valorInicial?: string;
  error?: string | undefined;
}) {
  const id = useId();
  const [mejorado, setMejorado] = useState(false);
  const [valor, setValor] = useState(valorInicial);
  const [abierta, setAbierta] = useState(false);
  const [activa, setActiva] = useState(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- sin JavaScript no hay efecto: es lo que distingue el campo mejorado del nativo
  useEffect(() => setMejorado(true), []);

  const texto = valor.trim();
  const coincidencias = categorias
    .filter((c) => c.toLocaleLowerCase("es").includes(texto.toLocaleLowerCase("es")))
    .slice(0, SUGERENCIAS);
  const existe = categorias.some((c) => c.toLocaleLowerCase("es") === texto.toLocaleLowerCase("es"));
  const opciones = [
    ...coincidencias.map((c) => ({ valor: c, crear: false })),
    ...(texto && !existe ? [{ valor: texto, crear: true }] : []),
  ];
  const visible = mejorado && abierta && opciones.length > 0;

  function elegir(v: string) {
    setValor(v);
    setAbierta(false);
  }

  return (
    <div className="relative">
      <Campo
        etiqueta="Categoría"
        nombre="categoria"
        opcional
        icono="categoria"
        value={valor}
        error={error}
        ayuda="Si no existe, se crea."
        autoComplete="off"
        list={mejorado ? undefined : `${id}-nativa`}
        role={mejorado ? "combobox" : undefined}
        aria-expanded={mejorado ? visible : undefined}
        aria-controls={mejorado ? `${id}-lista` : undefined}
        aria-activedescendant={visible ? `${id}-${activa}` : undefined}
        onChange={(e) => {
          setValor(e.target.value);
          setAbierta(true);
          setActiva(0);
        }}
        onFocus={() => setAbierta(true)}
        onBlur={() => setAbierta(false)}
        onKeyDown={(e) => {
          if (!visible) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiva((i) => (i + 1) % opciones.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiva((i) => (i - 1 + opciones.length) % opciones.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            elegir(opciones[activa]!.valor);
          } else if (e.key === "Escape") {
            setAbierta(false);
          }
        }}
      />
      {!mejorado ? (
        <datalist id={`${id}-nativa`}>
          {categorias.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      ) : null}
      {visible ? (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-label="Categorías"
          className="absolute inset-x-0 top-22 z-30 overflow-hidden rounded-button border border-border bg-surface shadow-[0_12px_32px_rgba(15,20,25,0.14)]"
        >
          {opciones.map((o, i) => (
            <li
              key={`${o.crear ? "crear" : "cat"}-${o.valor}`}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === activa}
              // `onMouseDown` y no `onClick`: el clic llega después del `blur`, que ya cerró la lista.
              onMouseDown={(e) => {
                e.preventDefault();
                elegir(o.valor);
              }}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 px-4 ${
                o.crear ? "border-t border-border font-semibold text-accent" : ""
              } ${i === activa ? "bg-accent-soft" : ""}`}
            >
              <Icono nombre={o.crear ? "nuevo" : "categoria"} className="size-4.5" />
              {o.crear ? `Crear «${o.valor}»` : o.valor}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
