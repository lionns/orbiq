import { Icono } from "./iconos";

const TAMANOS = {
  normal: { caja: "size-9 rounded-xl", glifo: "size-5" },
  grande: { caja: "size-14 rounded-button", glifo: "size-7" },
} as const;

/**
 * El cuadro de acento con la cesta: la marca mientras orbiq no tenga una propia
 * (`design-handoff.md` § Visual References). Siempre va junto al nombre del negocio, así que el
 * dibujo nunca está solo (`T-022`).
 */
export function Marca({ tamano = "normal" }: { tamano?: keyof typeof TAMANOS }) {
  const t = TAMANOS[tamano];
  return (
    <span className={`grid shrink-0 place-items-center bg-accent text-accent-text ${t.caja}`}>
      <Icono nombre="vender" className={t.glifo} />
    </span>
  );
}
