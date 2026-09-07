import { formatearPrecio } from "@/domain/moneda";

/**
 * `tabular-nums` no es adorno: sin él los dígitos cambian de ancho y una columna de precios baila
 * al recargar. El dueño compara precios de un vistazo, no los lee.
 */
export function Precio({ valor, className = "" }: { valor: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{formatearPrecio(valor)}</span>;
}

/**
 * Las existencias, en rojo cuando hay que mirarlas.
 *
 * Entra aquí con solo dos usos —la lista del catálogo y la cuadrícula de venta— y no por ahorrar
 * líneas: decidimos permitir el saldo negativo, así que **mostrarlo es la única salvaguarda que
 * queda**. Repartida en dos archivos, un día uno se queda sin el rojo y nadie se entera.
 *
 * Las dos pantallas no coincidían: el catálogo alertaba solo en negativo y la cuadrícula también en
 * cero. Eso no se decidió, se escribió dos veces distinto — que es justo lo que este componente
 * evita. Se conserva cada comportamiento tal cual estaba y la diferencia queda a la vista, en un
 * parámetro con nombre, para poder decidirla en vez de heredarla.
 */
export function Existencias({
  cantidad,
  alertarEnCero = false,
  className = "",
}: {
  cantidad: number;
  /** En la venta, cero ya merece aviso: se está por vender algo que el conteo dice que no hay. */
  alertarEnCero?: boolean;
  className?: string;
}) {
  const alerta = alertarEnCero ? cantidad <= 0 : cantidad < 0;
  return (
    <span
      data-alerta={alerta ? "" : undefined}
      className={`tabular-nums ${
        alerta ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-text-muted)]"
      } ${className}`}
    >
      {cantidad} en existencia
    </span>
  );
}
