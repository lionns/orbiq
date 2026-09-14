import Link from "next/link";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_TEMA, leerTema } from "@/domain/tema";
import { sesionActual } from "@/domain/session";
import { NEGOCIO } from "@/domain/negocio";
import { Boton } from "@/ui/boton";
import { Icono } from "@/ui/iconos";
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
      <header className="flex items-center gap-1.5 bg-accent px-3 py-1.5 text-accent-text">
        {/* El nombre **es** el enlace a vender: tener además un «Vender» al lado decía lo mismo
            dos veces y costaba sitio que aquí no sobra. */}
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
          {/* El glifo va dentro de un cuadro claro para separarse del acento: sobre la banda, un
              trazo del mismo color se pierde. Lleva el nombre al lado, así que la regla de
              `T-022` se cumple. */}
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-accent">
            <Icono nombre="vender" className="size-4" />
          </span>
          <span className="truncate">{NEGOCIO.nombre}</span>
        </Link>
        {/* Solo «Ventas». El catálogo se alcanza desde la cuadrícula, que es donde tiene sentido
            ir a buscar lo que no está entre los frecuentes — y tenerlo además aquí era decirlo dos
            veces y costaba el nombre del negocio, que se truncaba a «Mi…». */}
        <nav className="shrink-0">
          {/* Sin píldora y sin subrayado: «Ventas» navega, no acciona. La píldora se reserva para
              lo que abre algo —el tema—, y así además cabe el nombre del negocio, que es lo
              primero que se sacrifica cuando esta fila se llena. */}
          <Link href="/ventas" className="flex min-h-12 items-center px-1 font-medium">
            Ventas
          </Link>
        </nav>
        {/* Se intentó meter «Salir» dentro del menú para que el nombre cupiera. Costaba un helper
            compartido y tres pruebas de sesión —salir dejaba de verse al cargar— a cambio de siete
            píxeles. Salen más barato de los huecos. */}
        <span className="flex shrink-0 items-center gap-1">
          <SelectorDeTema actual={tema} accion={elegirTema} />
          <form action={salir}>
            <Boton type="submit" variante="secundario" className="px-3">
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
