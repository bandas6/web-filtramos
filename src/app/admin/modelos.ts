// Tipos y reglas del catálogo en el panel (mismas reglas que utils/catalogo.js de la API)

export const TIPOS: Record<string, string> = {
  'aire-primario': 'Aire primario',
  'aire-seguridad': 'Aire seguridad',
  prefiltro: 'Prefiltro',
  compresor: 'Compresor',
  cabina: 'Cabina',
  kit: 'Kit de mantenimiento'
};
export const LISTA_TIPOS = Object.entries(TIPOS).map(([valor, nombre]) => ({ valor, nombre }));

export const MOTIVOS: Record<string, string> = {
  'sin-tipo': 'sin tipo',
  'sin-precio': 'sin precio',
  'sin-foto': 'sin foto',
  'sin-componentes': 'sin componentes',
  oculto: 'oculto'
};

export const ROLES: Record<string, string> = {
  admin: 'Administrador',
  bodega: 'Bodega',
  ventas: 'Ventas'
};

export interface Equivalencia { marca: string; referencia: string; }
export interface Tramo { desde: number; precio: number; }
export interface Componente { producto: string; referencia?: string; cantidad: number; }

export interface Producto {
  uid: string;
  referencia: string;
  slug?: string;
  tipo?: string;
  descripcion?: string;
  codigoSiigo?: string;
  precios?: { publico?: number; distribuidor?: number; volumen?: Tramo[] };
  equivalencias: Equivalencia[];
  aplicaciones: string[];
  intervaloCambio?: string;
  diametroExterno?: number;
  diametroInterno?: number;
  alto?: number;
  alturaPliegue?: number;
  cortePapel?: number;
  cantidadPliegues?: number;
  malla?: string;
  longitudMallaExterna?: string;
  longitudMallaInterna?: string;
  poliuretano?: string;
  anillo?: string;
  tapa?: string;
  papeles: string[];
  imagesUrl: string[];
  kit: Componente[];
  publicar: boolean;
  publicado: boolean;
  motivosBorrador: string[];
  stock: number;
  reservado: number;
  stockMinimo: number;
}

export interface PaginaProductos {
  productos: Producto[];
  total: number;
  pagina: number;
  paginas: number;
  porPagina: number;
}

export interface Resumen { publicados: number; borradores: number; sinFoto: number; sinPrecio: number; stockBajo: number; }

export interface Imagen { uid: string; nombre: string; imagen: string; }

export interface UsuarioAdmin {
  uid: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'bodega' | 'ventas';
  estado: boolean;
  ultimoAcceso?: string;
}

export interface CampoAjuste {
  clave: string;
  etiqueta: string;
  publico: boolean;
  obligatorio?: boolean;
  tipo?: string;
  ayuda?: string;
  multilinea?: boolean;
}

// Misma regla que la API, para mostrar los motivos mientras se edita
export function motivosDeBorrador(p: Partial<Producto>): string[] {
  const motivos: string[] = [];
  if (!p.tipo) motivos.push('sin-tipo');
  if (!(p.precios?.publico && p.precios.publico > 0)) motivos.push('sin-precio');
  if (!p.imagesUrl?.length) motivos.push('sin-foto');
  if (p.tipo === 'kit' && !p.kit?.length) motivos.push('sin-componentes');
  if (p.publicar === false) motivos.push('oculto');
  return motivos;
}

const formatoPesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const pesos = (n: number | null | undefined) => (n || n === 0 ? formatoPesos.format(n) : '—');

// ---- Inventario (etapa C)
export type EstadoDisponibilidad = 'disponible' | 'ultimas' | 'bajo-pedido';

export interface FilaInventario {
  uid: string;
  referencia: string;
  tipo?: string;
  esKit: boolean;
  stock: number | null;
  reservado: number | null;
  stockMinimo: number | null;
  disponible: number;
  estado: EstadoDisponibilidad;
  quedan: number | null;
  nivel: number;
  componentes?: string[];
}

export interface IndicadoresInventario { referenciasActivas: number; bajoMinimo: number; enCero: number; unidadesReservadas: number; }

export interface Movimiento {
  uid: string;
  producto: string;
  referencia: string;
  tipo: 'entrada' | 'salida' | 'ajuste' | 'reserva' | 'liberacion';
  cantidad: number;
  motivo: string;
  origen: 'manual' | 'siigo' | 'importacion' | 'web';
  referenciaExterna?: string;
  usuarioNombre?: string;
  nota?: string;
  stockResultante?: number;
  fecha: string;
}

export const NOMBRE_MOVIMIENTO: Record<string, string> = {
  entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste', reserva: 'Reserva', liberacion: 'Liberación'
};
export const NOMBRE_MOTIVO: Record<string, string> = {
  produccion: 'Producción', venta: 'Venta', devolucion: 'Devolución', 'conteo-fisico': 'Conteo físico',
  'carga-inicial': 'Carga inicial', 'pedido-web': 'Pedido web'
};
// Motivos que se pueden elegir al registrar a mano (iguales a services/inventario.js)
export const MOTIVOS_MANUALES: Record<'entrada' | 'salida' | 'ajuste', string[]> = {
  entrada: ['produccion', 'devolucion'],
  salida: ['venta'],
  ajuste: ['conteo-fisico']
};
