import { signal } from '@angular/core';
import { Auth, Preferencias } from '../app/services/auth/auth';

// Sesión simulada para pruebas de componentes. "guardarPreferencias" cambia las preferencias en memoria
// (como hace el servicio real antes de responder la API) y queda espiado para comprobar la llamada.
export function authFalso(rol: 'admin' | 'bodega' | 'ventas' = 'admin', uid = 'yo', prefs: Partial<Preferencias> = {}) {
  const preferencias = signal<Preferencias>({ ayudaCerrada: [], pasosNoAplica: [], ...prefs });
  return {
    provide: Auth,
    useValue: {
      usuario: signal({ uid, nombre: 'Ana Prueba', email: 'ana@prueba.test', rol }),
      esAdmin: signal(rol === 'admin'),
      token: 'token-de-prueba',
      preferencias,
      guardarPreferencias: jasmine.createSpy('guardarPreferencias').and.callFake((c: Partial<Preferencias>) => preferencias.update((p) => ({ ...p, ...c }))),
      logout: jasmine.createSpy('logout'),
      verificarSesion: () => ({ pipe: () => ({}) })
    }
  };
}
