import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'pages',
        loadChildren: () => import('./view/pages/pages-routing-module').then(m => m.PagesRoutingModule)
    },
    {
        path: '',
        redirectTo: 'pages',
        pathMatch: 'full'
    }
];
