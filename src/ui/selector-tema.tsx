import { ETIQUETA_TEMA, TEMAS, type Tema } from "@/domain/tema";
import { Boton } from "./boton";

/**
 * Tres opciones y no un interruptor, porque son tres estados: claro, oscuro y no elegir.
 *
 * Van dentro de un `<details>` porque en la cabecera a 360 px no caben tres botones al lado de la
 * navegación. Y son botones dentro de un formulario, no un `<select>` con envío automático: así
 * funciona sin JavaScript, como el resto de la aplicación.
 *
 * La acción llega por parámetro y no por importación: `src/ui/` no puede depender de `src/app/`, o
 * la presentación acaba atada a una ruta concreta y deja de poder mirarse sola.
 */
export function SelectorDeTema({
  actual,
  accion,
}: {
  actual: Tema;
  accion: (datos: FormData) => void | Promise<void>;
}) {
  return (
    <details className="relative">
      <summary
        className="flex min-h-12 cursor-pointer list-none items-center px-2 underline"
        data-testid="abrir-tema"
      >
        Tema
      </summary>
      <form
        action={accion}
        // Absoluto: abrirlo no puede empujar la navegación ni la lista de abajo.
        className="absolute right-0 z-10 mt-1 flex flex-col gap-1 rounded-card border border-border-strong bg-bg p-2"
      >
        {TEMAS.map((tema) => (
          <Boton
            key={tema}
            type="submit"
            name="tema"
            value={tema}
            variante={tema === actual ? "principal" : "secundario"}
            aria-current={tema === actual ? "true" : undefined}
            data-testid={`tema-${tema}`}
            className="justify-start whitespace-nowrap"
          >
            {ETIQUETA_TEMA[tema]}
          </Boton>
        ))}
      </form>
    </details>
  );
}
