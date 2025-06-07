import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogoAdmin } from './catalogo-admin/catalogo-admin';
import { Pages } from './pages';
import { Upload } from './upload/upload';

const routes: Routes = [
  {
    path: '',
    component: Pages,
    children: [
      {
        path: 'catalogo-admin',
        component: CatalogoAdmin,
      },
      {
        path: 'upload',
        component: Upload
      },
      {
        path: '',
        redirectTo: 'catalogo-admin',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
