import { ETIQUETA_TEMA, TEMAS, type Tema } from "@/domain/tema";
import { Icono } from "./iconos";
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
        // Un botón secundario como los demás: ya no vive sobre la banda de acento, sino en la
        // pantalla de acceso, sobre el fondo (`.diseno/cobalto/F-M-Acceso`).
        className="flex min-h-12 cursor-pointer list-none items-center gap-1.5 rounded-button border border-border-strong bg-surface px-3.5 font-semibold [&::-webkit-details-marker]:hidden"
        data-testid="abrir-tema"
      >
        <Icono nombre="tema" />
        Tema
      </summary>
      {/* Un solo panel absoluto: abrirlo no puede empujar la navegación ni la lista de abajo. El
          formulario del tema y lo que cuelgue debajo son hermanos — un formulario dentro de otro no
          es HTML válido, y salir es su propio envío. */}
      <div className="absolute right-0 z-10 mt-1 flex flex-col gap-1 rounded-card border border-border bg-surface p-2 text-text shadow-[0_8px_24px_rgba(28,25,23,0.18)]">
        <form action={accion} className="flex flex-col gap-1">
        {TEMAS.map((tema) => (
          <Boton
            key={tema}
            type="submit"
            name="tema"
            value={tema}
            variante={tema === actual ? "principal" : "secundario"}
            aria-current={tema === actual ? "true" : undefined}
            data-testid={`tema-${tema}`}
            className="justify-start gap-2 whitespace-nowrap"
          >
            {/* El elegido lleva su visto: el relleno solo no dice cuál está puesto cuando se mira
                de reojo, y es lo primero que se busca al abrir esto. */}
            <span className="grid size-5 shrink-0 place-items-center">
              {tema === actual ? <Icono nombre="cobrar" className="size-5" /> : null}
            </span>
            {ETIQUETA_TEMA[tema]}
          </Boton>
        ))}
        </form>
      </div>
    </details>
  );
}
