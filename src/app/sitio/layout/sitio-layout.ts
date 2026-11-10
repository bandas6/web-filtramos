import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Icono } from '../../shared/ui/icono';
import { enlaceWhatsapp, whatsappLegible } from '../../shared/formato';
import { AjustesSitio, PedidoSitio } from '../estado-sitio';

@Component({
  selector: 'app-sitio-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Icono],
  templateUrl: './sitio-layout.html',
  styleUrl: './sitio-layout.scss'
})
export class SitioLayout implements OnInit {
  ajustes = inject(AjustesSitio);
  pedido = inject(PedidoSitio);
  private router = inject(Router);

  menuAbierto = signal(false);
  // En la ficha de producto hay una barra inferior propia (móvil)
  enFicha = signal(this.router.url.startsWith('/filtro/'));

  numero = computed(() => whatsappLegible(this.ajustes.whatsapp()));
  enlaceCotizar = computed(() => enlaceWhatsapp(this.ajustes.whatsapp(), 'Hola, quiero cotizar filtros de aire.'));
  direccion = computed(() => [this.ajustes.valores().direccion, this.ajustes.valores().ciudad].filter(Boolean).join(', '));
  anio = new Date().getFullYear();

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.menuAbierto.set(false);
      this.enFicha.set((e as NavigationEnd).urlAfterRedirects.startsWith('/filtro/'));
    });
  }

  ngOnInit() {
    this.ajustes.cargar();
  }
}
