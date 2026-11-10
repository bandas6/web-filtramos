import { signal } from '@angular/core';
import { Auth } from '../app/services/auth/auth';

// Sesión simulada para pruebas de componentes
export function authFalso(rol: 'admin' | 'bodega' | 'ventas' = 'admin', uid = 'yo') {
  return {
    provide: Auth,
    useValue: {
      usuario: signal({ uid, nombre: 'Ana Prueba', email: 'ana@prueba.test', rol }),
      esAdmin: signal(rol === 'admin'),
      token: 'token-de-prueba',
      logout: jasmine.createSpy('logout'),
      verificarSesion: () => ({ pipe: () => ({}) })
    }
  };
}
