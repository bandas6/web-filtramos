import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Auth } from '../services/auth/auth';

// Solo deja entrar al panel con una sesión válida
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(Auth).verificarSesion().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/admin/login'])))
  );
};

// Solo administradores (p. ej. la biblioteca de imágenes). Bodega y ventas vuelven al catálogo.
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(Auth);
  return auth.verificarSesion().pipe(
    map((ok) => {
      if (!ok) return router.createUrlTree(['/admin/login']);
      return auth.esAdmin() ? true : router.createUrlTree(['/admin']);
    })
  );
};
