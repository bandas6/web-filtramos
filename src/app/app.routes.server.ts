import { RenderMode, ServerRoute } from '@angular/ssr';

// El panel es privado: se renderiza en el navegador, donde está la sesión.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
