import { Component, computed, inject } from '@angular/core';
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

  private todos = [
    { label: 'Productos', link: '/pages/catalogo-admin', soloAdmin: false },
    { label: 'Imágenes', link: '/pages/upload', soloAdmin: true }
  ];

  // Bodega y ventas no ven las opciones de administración
  menuItems = computed(() => this.todos.filter((i) => !i.soloAdmin || this.auth.esAdmin()));

  salir() {
    this.auth.logout();
  }
}
