import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_TEMA, leerTema } from "@/domain/tema";
import { sesionActual } from "@/domain/session";
import { NEGOCIO } from "@/domain/negocio";
import { Boton } from "@/ui/boton";
import { SelectorDeTema } from "@/ui/selector-tema";
import { elegirTema } from "@/app/acciones-tema";
import { salir } from "../acceso/acciones";

/**
 * AC-001. La guardia vive donde se leen los datos, no en un middleware que solo mira si existe una
 * cookie: una cookie inventada o vencida no debe llegar nunca a una consulta. Toda pantalla del
 * negocio cuelga de aquí, así que olvidarse de proteger una requiere sacarla del grupo a propósito.
 */
export default async function LayoutProtegido({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual(await headers());
  if (!sesion) redirect("/acceso");
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <div className="min-h-dvh">
      {/* Una sola fila, y contada por las dos dimensiones. En dos filas la identidad costaba
          21 px de alto y empujaba el primer producto del catálogo bajo el pliegue (medido: 761 con
          740 de pantalla). A lo ancho, el nombre trunca en vez de empujar: un negocio con nombre
          largo no puede sacar la navegación de la pantalla. */}
      <header className="flex items-center gap-3 bg-accent px-4 py-1.5 text-accent-text">
        {/* El nombre **es** el enlace a vender: tener además un «Vender» al lado decía lo mismo
            dos veces y costaba sitio que aquí no sobra. */}
        <Link href="/" className="min-w-0 flex-1 truncate font-semibold">
          {NEGOCIO.nombre}
        </Link>
        <nav className="flex shrink-0 items-center gap-3">
          <Link href="/catalogo" className="underline">
            Catálogo
          </Link>
          <Link href="/ventas" className="underline">
            Ventas
          </Link>
        </nav>
        <span className="flex shrink-0 items-center gap-1">
          <SelectorDeTema actual={tema} accion={elegirTema} />
          <form action={salir}>
            <Boton type="submit" variante="secundario">
              Salir
            </Boton>
          </form>
        </span>
        <span className="sr-only" data-testid="sesion-nombre">
          {sesion.nombre}
        </span>
      </header>
      {children}
    </div>
  );
}
