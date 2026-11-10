import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { Auth } from '../services/auth/auth';

// Solo deja entrar al panel con una sesión válida
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(Auth).verificarSesion().pipe(
    map((ok) => (ok ? true : router.createUrlTree(['/login'])))
  );
};
