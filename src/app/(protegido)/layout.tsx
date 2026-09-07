import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sesionActual } from "@/domain/session";
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
        <span className="text-[color:var(--color-text-muted)]" data-testid="sesion-nombre">
          {sesion.nombre}
        </span>
        <form action={salir}>
          <button
            type="submit"
            className="min-h-12 rounded-[var(--radius-button)] border border-[color:var(--color-border-strong)] px-4"
          >
            Salir
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
