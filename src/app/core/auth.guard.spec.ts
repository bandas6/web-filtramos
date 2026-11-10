import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';
import { providersDePrueba } from '../../testing/providers';
import { Auth } from '../services/auth/auth';
import { adminGuard, authGuard } from './auth.guard';

function ejecutar(guard: typeof authGuard, sesion: boolean, admin: boolean) {
  TestBed.configureTestingModule({
    providers: [
      ...providersDePrueba,
      { provide: Auth, useValue: { verificarSesion: () => of(sesion), esAdmin: signal(admin) } }
    ]
  });
  const resultado = TestBed.runInInjectionContext(() => guard({} as any, {} as any)) as Observable<boolean | UrlTree>;
  return firstValueFrom(resultado);
}

const url = (r: boolean | UrlTree) => (r instanceof UrlTree ? TestBed.inject(Router).serializeUrl(r) : r);

describe('Guards', () => {
  it('authGuard: sin sesión va a /login', async () => {
    expect(url(await ejecutar(authGuard, false, false))).toBe('/admin/login');
  });

  it('authGuard: con sesión deja pasar', async () => {
    expect(await ejecutar(authGuard, true, false)).toBeTrue();
  });

  it('adminGuard: bodega o ventas vuelven al catálogo', async () => {
    expect(url(await ejecutar(adminGuard, true, false))).toBe('/admin');
  });

  it('adminGuard: admin entra', async () => {
    expect(await ejecutar(adminGuard, true, true)).toBeTrue();
  });
});
