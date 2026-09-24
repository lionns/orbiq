import { Icono } from "./iconos";

/**
 * Elegir una entre pocas, sin lista desplegable: todas a la vista y un toque cada una
 * (`.diseno/cobalto/F-M-Piezas`, punto 2). Por dentro son radios de verdad —van en el formulario
 * `GET` y funcionan sin JavaScript (`AC-018`)—; la píldora es solo su aspecto.
 *
 * El foco de teclado se ve en la píldora (`peer-focus-visible`), porque el radio está oculto.
 */
export function Opciones({
  etiqueta,
  nombre,
  opciones,
  elegida,
  "data-testid": testid,
}: {
  etiqueta: string;
  nombre: string;
  opciones: readonly { valor: string; texto: string }[];
  elegida: string;
  "data-testid"?: string;
}) {
  return (
    // `min-w-0`: el `fieldset` de fábrica no encoge y desborda a 360 px. Y el `flex` va en un hijo:
    // una `legend` dentro de un contenedor flex no se coloca donde uno espera.
    <fieldset className="min-w-0" data-testid={testid}>
      <legend className="mb-2.5 text-lg font-bold">{etiqueta}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <label key={o.valor} className="relative">
            <input
              type="radio"
              name={nombre}
              value={o.valor}
              defaultChecked={o.valor === elegida}
              className="peer sr-only"
            />
            <span className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-surface px-4 font-semibold whitespace-nowrap peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-text peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent [&>svg]:hidden peer-checked:[&>svg]:block">
              <Icono nombre="cobrar" className="size-4" />
              {o.texto}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Sí o no, con la forma de un interruptor y no la casilla del navegador (punto 4). Es un checkbox
 * real con `appearance-none`: se envía igual en el formulario y se opera igual con el teclado.
 */
export function Interruptor({
  etiqueta,
  ayuda,
  nombre,
  valor = "1",
  marcado,
}: {
  etiqueta: string;
  ayuda?: string;
  nombre: string;
  valor?: string;
  marcado: boolean;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-4">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{etiqueta}</span>
        {ayuda ? <span className="block text-text-muted">{ayuda}</span> : null}
      </span>
      <input
        type="checkbox"
        name={nombre}
        value={valor}
        defaultChecked={marcado}
        className="relative h-8 w-13 shrink-0 cursor-pointer appearance-none rounded-full bg-border-strong transition-colors before:absolute before:top-1 before:left-1 before:size-6 before:rounded-full before:bg-surface before:shadow before:transition-transform checked:bg-accent checked:before:translate-x-5"
      />
    </label>
  );
}
