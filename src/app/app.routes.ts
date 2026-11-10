import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./view/auth/login/login').then((m) => m.Login),
    title: 'Iniciar sesión · Filtramos'
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadComponent: () => import('./admin/layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'productos' },
      { path: 'productos', loadComponent: () => import('./admin/productos/productos-page').then((m) => m.ProductosPage), title: 'Productos · Filtramos' },
      { path: 'inventario', loadComponent: () => import('./admin/inventario/inventario-page').then((m) => m.InventarioPage), title: 'Inventario · Filtramos' },
      { path: 'inventario/historial', loadComponent: () => import('./admin/inventario/historial-page').then((m) => m.HistorialPage), title: 'Historial de inventario · Filtramos' },
      { path: 'importar', canActivate: [adminGuard], loadComponent: () => import('./admin/importar/importar-page').then((m) => m.ImportarPage), title: 'Importar Excel · Filtramos' },
      { path: 'cotizaciones', loadComponent: () => import('./admin/cotizaciones/cotizaciones-page').then((m) => m.CotizacionesPage), title: 'Cotizaciones y pedidos · Filtramos' },
      { path: 'imagenes', canActivate: [adminGuard], loadComponent: () => import('./admin/imagenes/imagenes-page').then((m) => m.ImagenesPage), title: 'Imágenes · Filtramos' },
      { path: 'usuarios', canActivate: [adminGuard], loadComponent: () => import('./admin/usuarios/usuarios-page').then((m) => m.UsuariosPage), title: 'Usuarios y roles · Filtramos' },
      { path: 'ajustes', canActivate: [adminGuard], loadComponent: () => import('./admin/ajustes/ajustes-page').then((m) => m.AjustesPage), title: 'Ajustes · Filtramos' },
      { path: '**', redirectTo: 'productos' }
    ]
  },

  // Rutas anteriores del panel (Fase 0) -> nuevas
  { path: 'login', redirectTo: 'admin/login' },
  { path: 'pages/upload', redirectTo: 'admin/imagenes' },
  { path: 'pages', redirectTo: 'admin/productos', pathMatch: 'prefix' },

  // Sitio público (renderizado en el servidor para SEO)
  {
    path: '',
    loadComponent: () => import('./sitio/layout/sitio-layout').then((m) => m.SitioLayout),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./sitio/inicio/inicio-page').then((m) => m.InicioPage) },
      { path: 'catalogo', loadComponent: () => import('./sitio/catalogo/catalogo-page').then((m) => m.CatalogoPage) },
      { path: 'filtro/:slug', loadComponent: () => import('./sitio/producto/producto-page').then((m) => m.ProductoPage) },
      { path: 'pedido', loadComponent: () => import('./sitio/pedido/pedido-page').then((m) => m.PedidoPage) },
      { path: 'legal', loadComponent: () => import('./sitio/legal/legal-page').then((m) => m.LegalPage) },
      { path: '**', loadComponent: () => import('./sitio/no-encontrado').then((m) => m.NoEncontrado) }
    ]
  }
];
