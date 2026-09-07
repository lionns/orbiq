import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { sesionActual } from "@/domain/session";
import { FormularioAcceso } from "./formulario";

// La sesión se lee en cada visita: una respuesta cacheada aquí serviría la pantalla de acceso a
// quien ya entró, o al revés.
export const dynamic = "force-dynamic";

export default async function Acceso() {
  if (await sesionActual(await headers())) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Orbiq</h1>
      <p className="mt-2 text-[color:var(--color-text-muted)]">Entra para abrir la caja.</p>
      <FormularioAcceso />
    </main>
  );
}
