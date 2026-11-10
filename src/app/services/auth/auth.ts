import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'bodega' | 'ventas';
}

interface RespuestaAuth {
  ok: boolean;
  token: string;
  usuario: Usuario;
}

const TOKEN_KEY = 'filtramos_token';

@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private _usuario = signal<Usuario | null>(null);
  readonly usuario = this._usuario.asReadonly();
  readonly esAdmin = computed(() => this._usuario()?.rol === 'admin');

  get token(): string | null {
    if (!this.isBrowser) return null;
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  private guardarSesion({ token, usuario }: RespuestaAuth) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* almacenamiento no disponible */ }
    this._usuario.set(usuario);
  }

  login(email: string, password: string): Observable<Usuario> {
    return this.http
      .post<RespuestaAuth>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((r) => this.guardarSesion(r)), map((r) => r.usuario));
  }

  /** Valida el token guardado contra la API. Devuelve false si no hay sesión válida. */
  verificarSesion(): Observable<boolean> {
    if (!this.token) return of(false);
    if (this._usuario()) return of(true);
    return this.http.get<RespuestaAuth>(`${environment.apiUrl}/auth/renovar`).pipe(
      tap((r) => this.guardarSesion(r)),
      map(() => true),
      catchError(() => {
        this.limpiar();
        return of(false);
      })
    );
  }

  logout() {
    this.limpiar();
    this.router.navigateByUrl('/login');
  }

  private limpiar() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* nada */ }
    this._usuario.set(null);
  }
}
