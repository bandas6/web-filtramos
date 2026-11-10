import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Disponibilidad } from '../shared/ui/badge-disponibilidad';

export interface Equivalencia { marca?: string; referencia: string; }

export interface TarjetaProducto {
  slug: string;
  referencia: string;
  tipo: string;
  tipoNombre: string;
  precio: number | null;
  tieneVolumen: boolean;
  equivalencias: Equivalencia[];
  totalEquivalencias?: number;
  diametroExterno: number | null;
  alto: number | null;
  imagen: string | null;
  disponibilidad: { estado: Disponibilidad; quedan: number | null };
  kit?: string[];
  aplicaciones?: string[];
}

export interface FichaProducto extends TarjetaProducto {
  descripcion: string | null;
  precios: { publico: number | null; volumen: { desde: number; precio: number }[] };
  aplicaciones: string[];
  papeles: string[];
  intervaloCambio: string | null;
  imagenes: string[];
  ficha: Record<string, string | number>;
  componentes: { referencia: string; slug: string; cantidad: number }[];
  actualizado: string;
}

export interface AjustesPublicos {
  whatsappVentas?: string;
  correoContacto?: string;
  direccion?: string;
  ciudad?: string;
  tiempoDespacho?: string;
  tiempoFabricacion?: string;
  tiempoRespuestaCotizacion?: string;
  notaPrecios?: string;
  garantia?: string;
  politicaEnvios?: string;
  politicaDatos?: string;
}

export interface Busqueda {
  q?: string; maquina?: string; diamExt?: string; alto?: string; tipo?: string;
  disponibilidad?: string; diamMin?: string; diamMax?: string; altoMin?: string; altoMax?: string;
  orden?: 'referencia' | 'precio-asc' | 'precio-desc' | string;
  pagina?: number;
}

// Parámetros del catálogo que viajan en la URL (en este orden)
export const PARAMS_BUSQUEDA = ['q', 'maquina', 'diamExt', 'alto', 'tipo', 'disponibilidad', 'diamMin', 'diamMax', 'altoMin', 'altoMax', 'orden'] as const;

export interface ConteoTipo { valor: string; nombre: string; total: number; }

// Acceso a /api/public (sin sesión). En el servidor (SSR) las respuestas se transfieren al navegador.
@Injectable({ providedIn: 'root' })
export class SitioApi {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/public`;

  ajustes(): Observable<AjustesPublicos> {
    return this.http.get<any>(`${this.url}/ajustes`).pipe(map((r) => r.ajustes || {}));
  }
  buscar(b: Busqueda): Observable<{ productos: TarjetaProducto[]; total: number; pagina: number; paginas: number }> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(b)) if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    return this.http.get<any>(`${this.url}/productos`, { params });
  }
  tipos(): Observable<ConteoTipo[]> {
    return this.http.get<any>(`${this.url}/tipos`).pipe(map((r) => r.tipos));
  }
  destacados(): Observable<{ criterio: 'ventas' | 'recientes'; productos: TarjetaProducto[] }> {
    return this.http.get<any>(`${this.url}/productos/destacados`);
  }
  kits(): Observable<TarjetaProducto[]> {
    return this.http.get<any>(`${this.url}/kits`).pipe(map((r) => r.productos));
  }
  producto(slug: string): Observable<{ producto: FichaProducto; relacionados: TarjetaProducto[] }> {
    return this.http.get<any>(`${this.url}/productos/${encodeURIComponent(slug)}`);
  }
  solicitudMedida(datos: FormData): Observable<unknown> {
    return this.http.post(`${this.url}/solicitudes-medida`, datos);
  }
  recordatorio(datos: { whatsapp: string; slug?: string; maquina?: string; consentimiento: boolean; sitioWeb?: string }): Observable<unknown> {
    return this.http.post(`${this.url}/recordatorios`, datos);
  }
  pedido(datos: unknown): Observable<{ numero: number; lineas: { referencia: string; cantidad: number; precioUnitario: number | null; subtotal: number | null }[]; totalEstimado: number | null }> {
    return this.http.post<any>(`${this.url}/pedidos`, datos);
  }
}

export const mensajeError = (err: any, porDefecto = 'No se pudo enviar. Intente de nuevo.') =>
  err?.status === 0 ? 'No hay conexión. Revise su internet e intente de nuevo.' : err?.error?.error || porDefecto;

// Precio unitario por cantidad según los tramos por volumen (igual que la API)
export function precioPorCantidad(publico: number | null, volumen: { desde: number; precio: number }[], cantidad: number): number | null {
  const tramo = [...volumen].sort((a, b) => b.desde - a.desde).find((t) => cantidad >= t.desde);
  return tramo ? tramo.precio : publico;
}

export const textoEquivalencias = (eqs: Equivalencia[]) =>
  eqs.map((e) => [e.marca, e.referencia].filter(Boolean).join(' ')).join(' · ');
