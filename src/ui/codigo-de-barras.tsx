import { modulos } from "@/domain/ean13";

/** Zona muda a cada lado, en módulos. Sin ella el lector no encuentra dónde empieza el código. */
const MUDA = 9;

/**
 * Las barras de un EAN-13, en SVG (`D-012`). El dibujo va en unidades de módulo y el tamaño lo pone
 * quien lo usa, así que lo mismo sirve en pantalla y en la hoja impresa, donde se mide en mm.
 *
 * Negro sobre blanco siempre, también en tema oscuro: un lector necesita barras oscuras sobre
 * fondo claro, y una etiqueta impresa no tiene tema.
 */
export function CodigoDeBarras({
  codigo,
  alto = 40,
  className = "",
}: {
  codigo: string;
  /** Alto de las barras, en módulos. */
  alto?: number;
  className?: string;
}) {
  const barras = modulos(codigo);
  const ancho = barras.length + MUDA * 2;
  const rects: React.ReactNode[] = [];
  for (let i = 0; i < barras.length; i++) {
    if (barras[i] !== "1") continue;
    // Módulos seguidos en un solo rectángulo: menos nodos, y sin rendijas entre barras al escalar.
    let fin = i;
    while (barras[fin + 1] === "1") fin++;
    rects.push(<rect key={i} x={i + MUDA} y={0} width={fin - i + 1} height={alto} />);
    i = fin;
  }
  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Código de barras ${codigo}`}
      className={`block bg-white ${className}`}
      shapeRendering="crispEdges"
      data-codigo={codigo}
    >
      <g fill="#000">{rects}</g>
    </svg>
  );
}
