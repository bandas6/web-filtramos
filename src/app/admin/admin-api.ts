import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { CampoAjuste, Imagen, PaginaProductos, Producto, Resumen, UsuarioAdmin } from './modelos';

// Acceso a /api/admin. El interceptor agrega el token.
@Injectable({ providedIn: 'root' })
export class AdminApi {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/admin`;

  // Productos
  productos(filtros: { q?: string; tipo?: string; estado?: string; pagina?: number; porPagina?: number }): Observable<PaginaProductos> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== '' && v !== null) params = params.set(k, String(v));
    return this.http.get<PaginaProductos>(`${this.url}/productos`, { params });
  }
  opcionesKit(): Observable<{ uid: string; referencia: string; tipo?: string }[]> {
    return this.http.get<any>(`${this.url}/productos/opciones`).pipe(map((r) => r.productos));
  }
  crearProducto(datos: Partial<Producto>): Observable<Producto> {
    return this.http.post<any>(`${this.url}/productos`, datos).pipe(map((r) => r.producto));
  }
  actualizarProducto(id: string, datos: Partial<Producto>): Observable<Producto> {
    return this.http.put<any>(`${this.url}/productos/${id}`, datos).pipe(map((r) => r.producto));
  }
  eliminarProducto(id: string): Observable<unknown> {
    return this.http.delete(`${this.url}/productos/${id}`);
  }
  resumen(): Observable<Resumen> {
    return this.http.get<any>(`${this.url}/resumen`).pipe(map((r) => r.resumen));
  }
  catalogoPdf(): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/productos/generarPdfHtml/pdfHtml`, { responseType: 'blob' });
  }

  // Imágenes
  imagenes(): Observable<Imagen[]> {
    return this.http.get<any>(`${this.url}/imagenes`).pipe(map((r) => r.imagenes));
  }
  subirImagen(archivo: File, nombre: string): Observable<Imagen> {
    const datos = new FormData();
    datos.append('imagen', archivo);
    datos.append('nombre', nombre);
    return this.http.post<any>(`${this.url}/imagenes`, datos).pipe(map((r) => r.imagen));
  }
  eliminarImagen(id: string): Observable<unknown> {
    return this.http.delete(`${this.url}/imagenes/${id}`);
  }

  // Usuarios
  usuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<any>(`${this.url}/usuarios`).pipe(map((r) => r.usuarios));
  }
  crearUsuario(datos: { nombre: string; email: string; rol: string; password: string }): Observable<UsuarioAdmin> {
    return this.http.post<any>(`${this.url}/usuarios`, datos).pipe(map((r) => r.usuario));
  }
  actualizarUsuario(id: string, datos: Partial<UsuarioAdmin>): Observable<UsuarioAdmin> {
    return this.http.put<any>(`${this.url}/usuarios/${id}`, datos).pipe(map((r) => r.usuario));
  }
  restablecerPassword(id: string, password: string): Observable<{ cerroSesion: boolean }> {
    return this.http.post<any>(`${this.url}/usuarios/${id}/password`, { password });
  }

  // Ajustes
  ajustes(): Observable<{ campos: CampoAjuste[]; valores: Record<string, string>; faltantes: string[] }> {
    return this.http.get<any>(`${this.url}/ajustes`);
  }
  guardarAjustes(valores: Record<string, string>): Observable<{ valores: Record<string, string>; faltantes: string[] }> {
    return this.http.put<any>(`${this.url}/ajustes`, valores);
  }
  estadoAjustes(): Observable<string[]> {
    return this.http.get<any>(`${this.url}/ajustes/estado`).pipe(map((r) => r.faltantes));
  }
}

// Mensaje legible de un error HTTP de la API
export const mensajeDeError = (err: any, porDefecto = 'No se pudo completar la acción.') =>
  err?.status === 0 ? 'No hay conexión con el servidor.' : err?.error?.error || porDefecto;
