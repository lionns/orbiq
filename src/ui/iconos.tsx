import {
  ArrowLeft,
  ChevronRight,
  Camera,
  Check,
  LogOut,
  Package,
  ReceiptText,
  RotateCcw,
  ScanBarcode,
  Search,
  SunMoon,
  X,
} from "lucide-react";

/**
 * Los iconos de la aplicación, en un solo sitio.
 *
 * **Ninguno va solo.** `design-handoff.md` § Accessibility Notes lo pedía ya —ningún estado se
 * comunica solo por color ni solo por icono— y con un dueño mayor deja de ser buena práctica: un
 * dibujo sin su palabra al lado obliga a adivinar, y adivinar con alguien esperando en el mostrador
 * es exactamente lo que esta aplicación existe para evitar.
 *
 * Por eso el tipo de abajo no acepta un icono suelto: `Icono` **siempre** se renderiza junto a un
 * texto, y quien quiera lo contrario tiene que salirse de este archivo y explicar por qué.
 *
 * Son decorativos para la accesibilidad (`aria-hidden`): el texto de al lado ya dice lo que son, y
 * anunciarlos además haría que un lector de pantalla dijera la misma cosa dos veces.
 */
export const ICONOS = {
  vender: Package,
  catalogo: ReceiptText,
  ventas: ReceiptText,
  buscar: Search,
  camara: Camera,
  escanear: ScanBarcode,
  cobrar: Check,
  reintentar: RotateCcw,
  cerrar: X,
  tema: SunMoon,
  volver: ArrowLeft,
  siguiente: ChevronRight,
  salir: LogOut,
} as const;

export type NombreDeIcono = keyof typeof ICONOS;

/**
 * Un icono de 20 px, alineado con el texto que lo acompaña.
 *
 * `shrink-0` no es adorno: dentro de un flex con texto largo, el icono es lo primero que el
 * navegador aplasta, y un icono deformado se lee peor que ninguno.
 */
export function Icono({ nombre, className = "" }: { nombre: NombreDeIcono; className?: string }) {
  const Glifo = ICONOS[nombre];
  return <Glifo aria-hidden size={20} strokeWidth={2} className={`shrink-0 ${className}`} />;
}
