import Link from "next/link";
import { redirect } from "next/navigation";
import { puede } from "@/domain/permisos";
import { Icono } from "@/ui/iconos";
import { sesionDeLaPeticion } from "../../../sesion";
import { FormularioPersona } from "./formulario";

export const dynamic = "force-dynamic";

/** Añadir persona (`.diseno/personas/Anadir`). Solo el dueño; entra como empleado (`D-013`). */
export default async function NuevaPersona() {
  if (!puede((await sesionDeLaPeticion())?.rol, "administrarPersonas")) redirect("/ajustes");
  return (
    <main className="mx-auto flex max-w-xl flex-col px-4 pt-1 pb-32 lg:px-12 lg:py-10">
      <Link
        href="/ajustes/personas"
        className="-ml-1 flex min-h-12 items-center gap-1.5 self-start pr-3 font-semibold text-text-muted"
      >
        <Icono nombre="volver" />
        Personas
      </Link>
      <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Añadir persona</h1>
      <FormularioPersona />
    </main>
  );
}
