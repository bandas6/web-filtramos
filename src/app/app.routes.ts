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

  // El sitio público ocupará "/" en la etapa F
  { path: '', pathMatch: 'full', redirectTo: 'admin' },
  { path: '**', redirectTo: 'admin' }
];
