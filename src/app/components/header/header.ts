import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  auth = inject(Auth);

  menuItems = [
    { label: 'Productos', link: '/pages/catalogo-admin' },
    { label: 'Imágenes', link: '/pages/upload' }
  ];

  salir() {
    this.auth.logout();
  }
}
