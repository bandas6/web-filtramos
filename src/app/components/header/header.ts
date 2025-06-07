import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {

  menuItems = [
    { label: 'Gestión catálogo', link: '/pages/catalogo-admin' },
    { label: 'Gestión Archivos', link: '/pages/upload' }
  ];

}
