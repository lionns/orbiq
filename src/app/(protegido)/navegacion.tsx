"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, type NombreDeIcono } from "@/ui/iconos";
import { Marca } from "@/ui/marca";
import { useArticulosEnVenta } from "./venta-guardada";

/**
 * Las cuatro secciones, en el mismo orden abajo en el celular y en el lateral del computador
 * (`.diseno/cobalto`, punto 2). «Nuevo producto» no está: es una acción, no un lugar (punto 10).
 */
const SECCIONES: { ruta: string; nombre: string; icono: NombreDeIcono }[] = [
  { ruta: "/", nombre: "Inicio", icono: "inicio" },
  { ruta: "/vender", nombre: "Vender", icono: "vender" },
  { ruta: "/ventas", nombre: "Ventas", icono: "ventas" },
  { ruta: "/catalogo", nombre: "Productos", icono: "productos" },
];

function activa(ruta: string, actual: string): boolean {
  return ruta === "/" ? actual === "/" : actual === ruta || actual.startsWith(`${ruta}/`);
}

/** Cuántos artículos esperan en Vender. Sin venta en curso no se pinta nada. */
function Insignia({ cantidad, className = "" }: { cantidad: number; className?: string }) {
  if (!cantidad) return null;
  return (
    <span
      className={`inline-grid min-w-6 place-items-center rounded-full px-1.5 text-sm font-bold tabular-nums ${className}`}
      data-testid="insignia-venta"
    >
      {/* El número suelto no dice qué cuenta; el lector de pantalla oye la frase entera. */}
      {cantidad}
      <span className="sr-only"> artículos en la venta en curso</span>
    </span>
  );
}

/**
 * Celular: la barra fija abajo, donde llega el pulgar (`design-handoff.md` § Responsive Behavior).
 *
 * El alta de producto la esconde: ahí abajo vive «Guardar producto», y dos barras apiladas le
 * quitaban media pantalla al formulario (`.diseno/cobalto/F-M-Nuevo`).
 */
export function BarraDePestanas() {
  const actual = usePathname();
  const enVenta = useArticulosEnVenta();
  if (actual === "/catalogo/nuevo") return null;

  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      data-testid="barra-de-pestanas"
    >
      {SECCIONES.map((s) => {
        const on = activa(s.ruta, actual);
        return (
          <Link
            key={s.ruta}
            href={s.ruta}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-0.5 text-sm ${
              on ? "font-bold text-accent" : "font-medium text-text-muted"
            }`}
          >
            <span
              className={`relative grid h-8 w-14 place-items-center rounded-full ${on ? "bg-accent-soft" : ""}`}
            >
              <Icono nombre={s.icono} />
              {s.ruta === "/vender" ? (
                <Insignia
                  cantidad={enVenta}
                  className="absolute -top-1 -right-1 h-5 bg-danger text-accent-text"
                />
              ) : null}
            </span>
            {s.nombre}
          </Link>
        );
      })}
    </nav>
  );
}

/** Computador: el menú lateral, con el dueño al pie; su tarjeta lleva a Ajustes (punto 7). */
export function MenuLateral({ negocio, dueno }: { negocio: string; dueno: string }) {
  const actual = usePathname();
  const enVenta = useArticulosEnVenta();

  return (
    <nav
      aria-label="Secciones"
      className="sticky top-0 hidden h-dvh w-62 shrink-0 flex-col gap-1 border-r border-border bg-surface px-4 py-6 lg:flex"
    >
      <Link href="/" className="mb-6 flex items-center gap-2.5 px-1.5">
        <Marca />
        <span className="truncate text-lg font-bold">{negocio}</span>
      </Link>
      {SECCIONES.map((s) => {
        const on = activa(s.ruta, actual);
        return (
          <Link
            key={s.ruta}
            href={s.ruta}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-button px-3.5 ${
              on ? "bg-accent-soft font-bold text-accent" : "font-medium text-text-muted"
            }`}
          >
            <Icono nombre={s.icono} />
            {s.nombre}
            {s.ruta === "/vender" && !on ? (
              <Insignia cantidad={enVenta} className="ml-auto h-6 bg-accent text-accent-text" />
            ) : null}
          </Link>
        );
      })}
      <Link
        href="/ajustes"
        aria-current={actual === "/ajustes" ? "page" : undefined}
        className="mt-auto flex items-center gap-3 rounded-button bg-bg px-3.5 py-3"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft font-bold text-accent">
          {dueno.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{dueno}</span>
          <span className="block text-sm text-text-muted">Ajustes y salir</span>
        </span>
        <Icono nombre="ajustes" className="text-text-muted" />
      </Link>
    </nav>
  );
}
