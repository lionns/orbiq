import { formatearPrecio } from "@/domain/moneda";

/**
 * `tabular-nums` no es adorno: sin él los dígitos cambian de ancho y una columna de precios baila
 * al recargar. El dueño compara precios de un vistazo, no los lee.
 */
export function Precio({
  valor,
  className = "",
  ...resto
}: { valor: number; className?: string } & { "data-testid"?: string }) {
  return (
    <span className={`tabular-nums ${className}`} {...resto}>
      {formatearPrecio(valor)}
    </span>
  );
}

/**
 * Las existencias, en rojo cuando hay que mirarlas.
 *
 * Entra aquí con solo dos usos —la lista del catálogo y los resultados de la venta— y no por ahorrar
 * líneas: decidimos permitir el saldo negativo, así que **mostrarlo es la única salvaguarda que
 * queda**. Repartida en dos archivos, un día uno se queda sin el rojo y nadie se entera.
 *
 * Las dos pantallas no coincidían: el catálogo alertaba solo en negativo y la venta también en
 * cero. Eso no se decidió, se escribió dos veces distinto — que es justo lo que este componente
 * evita. Se conserva cada comportamiento tal cual estaba y la diferencia queda a la vista, en un
 * parámetro con nombre, para poder decidirla en vez de heredarla.
 */
export function Existencias({
  cantidad,
  alertarEnCero = false,
  compacto = false,
  className = "",
  ...resto
}: {
  cantidad: number;
  /** En la venta, cero ya merece aviso: se está por vender algo que el conteo dice que no hay. */
  alertarEnCero?: boolean;
  /**
   * En los resultados de la venta, donde el precio manda y el sitio se paga caro. «117 en existencia» a 16 px
   * inflaba la casilla y competía con el precio.
   *
   * **La alerta conserva las palabras**: es donde el texto hace falta, porque es el estado que no
   * puede comunicarse solo por color (`design-handoff.md` § Accessibility Notes). Un saldo sano se
   * lee con el número solo.
   */
  compacto?: boolean;
  className?: string;
} & { "data-testid"?: string }) {
  const alerta = alertarEnCero ? cantidad <= 0 : cantidad < 0;
  return (
    <span
      data-alerta={alerta ? "" : undefined}
      // Píldora y no texto suelto: es lo que la separa del precio sin tener que encogerla. La alerta
      // lleva el rojo suave de Cobalto; un saldo sano, el fondo de la página sobre la tarjeta.
      // `max-w-full` + `truncate`: una etiqueta nunca sale de su casilla, por estrecha que sea.
      className={`inline-block max-w-full truncate rounded-full px-2.5 py-0.5 font-semibold tabular-nums ${
        alerta ? "bg-danger-soft text-danger" : "bg-bg text-text-muted"
      } ${className}`}
      {...resto}
    >
      {/* «Conteo en -2» y no «Debe 2»: en una tienda de barrio «debe» es fiado, y se leía como un
          cliente que debe dos. Lo que dice es que el conteo no cuadra (`.diseno/cobalto`, punto 12).
          Sigue siendo texto, que es lo que pide la regla: no puede comunicarse solo por color. */}
      {cantidad < 0
        ? `Conteo en ${cantidad}`
        : cantidad === 0 && (alerta || compacto)
          ? "Agotado"
          : compacto
            ? cantidad
            : `Hay ${cantidad}`}
    </span>
  );
}

/**
 * Una cantidad a secas: la del carrito, la de un movimiento del libro. Ni precio ni existencias, y
 * por eso no es ninguno de los dos componentes de arriba.
 *
 * Existe para que `tabular-nums` no vuelva a repartirse por las pantallas. Estaba suelto en tres
 * sitios, y una regla escrita en tres archivos es una regla que un día se queda en dos
 * (`design-handoff.md` § Typography).
 */
export function Cantidad({
  valor,
  conSigno = false,
  className = "",
  ...resto
}: {
  valor: number;
  /** Con signo siempre en el libro: un «3» sin signo no dice si entró o salió. */
  conSigno?: boolean;
  className?: string;
} & { "data-testid"?: string }) {
  return (
    <span className={`tabular-nums ${className}`} {...resto}>
      {conSigno && valor > 0 ? "+" : ""}
      {valor}
    </span>
  );
}
