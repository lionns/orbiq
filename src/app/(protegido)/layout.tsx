import { redirect } from "next/navigation";
import { NEGOCIO } from "@/domain/negocio";
import { BarraDePestanas, MenuLateral } from "./navegacion";
import { sesionDeLaPeticion } from "./sesion";

/**
 * AC-001. La guardia vive donde se leen los datos, no en un middleware que solo mira si existe una
 * cookie: una cookie inventada o vencida no debe llegar nunca a una consulta. Toda pantalla del
 * negocio cuelga de aquí, así que olvidarse de proteger una requiere sacarla del grupo a propósito.
 */
export default async function LayoutProtegido({ children }: { children: React.ReactNode }) {
  const sesion = await sesionDeLaPeticion();
  if (!sesion) redirect("/acceso");
  return (
    // Sin banda de arriba: en el celular la navegación vive abajo, donde llega el pulgar, y en
    // computador a un lado (`.diseno/cobalto`, punto 2). El hueco de abajo es el de la barra fija.
    // Al imprimir no hay navegación: lo único que se imprime es la hoja de etiquetas (`T-038`).
    <div className="min-h-dvh lg:flex">
      <MenuLateral negocio={NEGOCIO.nombre} dueno={sesion.nombre} />
      <div className="min-w-0 flex-1 pb-24 lg:pb-0 print:pb-0">{children}</div>
      <BarraDePestanas />
      <span className="sr-only" data-testid="sesion-nombre">
        {sesion.nombre}
      </span>
    </div>
  );
}
