import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sesionActual } from "@/domain/session";
import { Boton } from "@/ui/boton";
import { salir } from "../acceso/acciones";

/**
 * AC-001. La guardia vive donde se leen los datos, no en un middleware que solo mira si existe una
 * cookie: una cookie inventada o vencida no debe llegar nunca a una consulta. Toda pantalla del
 * negocio cuelga de aquí, así que olvidarse de proteger una requiere sacarla del grupo a propósito.
 */
export default async function LayoutProtegido({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");

  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
        <span className="flex items-center gap-4">
          <Link href="/" className="font-medium">
            Vender
          </Link>
          <Link href="/catalogo" className="text-[color:var(--color-text-muted)] underline">
            Catálogo
          </Link>
        </span>
        <span className="sr-only" data-testid="sesion-nombre">
          {sesion.nombre}
        </span>
        <form action={salir}>
          <Boton type="submit">Salir</Boton>
        </form>
      </header>
      {children}
    </div>
  );
}
