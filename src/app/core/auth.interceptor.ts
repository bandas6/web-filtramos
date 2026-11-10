import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../services/auth/auth';
import { environment } from '../../environments/environment';

// Agrega el token a las peticiones hacia la API y cierra la sesión si vence
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token;
  const esApi = req.url.startsWith(environment.apiUrl);

  const request = token && esApi
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((err: HttpErrorResponse) => {
      const esLogin = req.url.endsWith('/auth/login');
      if (esApi && err.status === 401 && !esLogin) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
