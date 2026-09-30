import {
  Archive,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CirclePlus,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  House,
  Keyboard,
  Link2,
  LogIn,
  LogOut,
  Mail,
  Minus,
  Lock,
  Package,
  PackageX,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RotateCcw,
  ScanBarcode,
  Search,
  Settings,
  ShoppingBasket,
  SlidersHorizontal,
  SunMoon,
  Tag,
  Trash2,
  Undo2,
  UserCheck,
  Users,
  UserX,
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
  inicio: House,
  vender: ShoppingBasket,
  productos: Package,
  catalogo: Package,
  ventas: ReceiptText,
  ajustes: Settings,
  buscar: Search,
  camara: Camera,
  escanear: ScanBarcode,
  cobrar: Check,
  reintentar: RotateCcw,
  deshacer: Undo2,
  vaciar: Trash2,
  cerrar: X,
  tema: SunMoon,
  volver: ArrowLeft,
  ir: ArrowRight,
  siguiente: ChevronRight,
  abrir: ChevronDown,
  subir: ChevronUp,
  salir: LogOut,
  entrar: LogIn,
  nuevo: Plus,
  menos: Minus,
  alta: CirclePlus,
  agotados: PackageX,
  filtros: SlidersHorizontal,
  fecha: Calendar,
  categoria: Tag,
  contar: ClipboardCheck,
  editar: Pencil,
  retirar: Archive,
  correo: Mail,
  clave: Lock,
  mostrar: Eye,
  ocultar: EyeOff,
  alerta: CircleAlert,
  teclado: Keyboard,
  enlazar: Link2,
  imprimir: Printer,
  bajar: Download,
  etiquetado: ArrowRightLeft,
  personas: Users,
  darDeBaja: UserX,
  reactivar: UserCheck,
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
