import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { sesionActual } from "@/domain/session";
import { COOKIE_TEMA, leerTema } from "@/domain/tema";
import { SelectorDeTema } from "@/ui/selector-tema";
import { FormularioAcceso } from "./formulario";

// La sesión se lee en cada visita: una respuesta cacheada aquí serviría la pantalla de acceso a
// quien ya entró, o al revés.
export const dynamic = "force-dynamic";

export default async function Acceso() {
  if (await sesionActual(await headers())) redirect("/");
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      {/* Aquí también: es la primera pantalla que se ve, y la que más blanco tiene. */}
      <span className="absolute right-4 top-2">
        <SelectorDeTema actual={tema} />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight">Orbiq</h1>
      <p className="mt-2 text-[color:var(--color-text-muted)]">Entra para abrir la caja.</p>
      <FormularioAcceso />
    </main>
  );
}
