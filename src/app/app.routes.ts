import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./view/auth/login/login').then(m => m.Login)
  },
  {
    path: 'pages',
    canActivate: [authGuard],
    loadChildren: () => import('./view/pages/pages-routing-module').then(m => m.PagesRoutingModule)
  },
  {
    path: '',
    redirectTo: 'pages',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'pages'
  }
];
