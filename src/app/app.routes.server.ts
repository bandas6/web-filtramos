import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El panel es privado: se renderiza en el navegador, donde está la sesión.
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  // El pedido vive en el navegador (localStorage)
  { path: 'pedido', renderMode: RenderMode.Client },
  // Sitio público: en el servidor en cada petición (precios y disponibilidad al día, SEO)
  { path: '**', renderMode: RenderMode.Server }
];
