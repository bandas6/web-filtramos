import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Icono } from '../../shared/ui/icono';
import { enlaceWhatsapp, whatsappLegible } from '../../shared/formato';
import { AjustesSitio, PedidoSitio } from '../estado-sitio';

const rutaDe = (url: string) => url.split(/[?#]/)[0];

@Component({
  selector: 'app-sitio-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Icono],
  templateUrl: './sitio-layout.html',
  styleUrl: './sitio-layout.scss',
  host: {
    '(document:keydown.escape)': 'cerrarMenu(true)',
    '(document:click)': 'clicFuera($event)'
  }
})
export class SitioLayout implements OnInit {
  ajustes = inject(AjustesSitio);
  pedido = inject(PedidoSitio);
  private router = inject(Router);
  private botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');
  private cabecera = viewChild<ElementRef<HTMLElement>>('cabecera');

  menuAbierto = signal(false);
  private ruta = signal(rutaDe(this.router.url));
  // En la ficha de producto hay una barra inferior propia (móvil)
  enFicha = computed(() => this.ruta().startsWith('/filtro/'));
  // El inicio ya tiene su buscador grande: el del encabezado se oculta allí
  enInicio = computed(() => this.ruta() === '/');

  numero = computed(() => whatsappLegible(this.ajustes.whatsapp()));
  enlaceCotizar = computed(() => enlaceWhatsapp(this.ajustes.whatsapp(), 'Hola, quiero cotizar filtros de aire.'));
  direccion = computed(() => [this.ajustes.valores().direccion, this.ajustes.valores().ciudad].filter(Boolean).join(', '));
  // Contacto solo existe si hay algún dato en Ajustes
  hayContacto = computed(() => !!(this.numero() || this.ajustes.valores().correoContacto || this.direccion()));
  anio = new Date().getFullYear();

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.menuAbierto.set(false);
      this.ruta.set(rutaDe((e as NavigationEnd).urlAfterRedirects));
    });
  }

  ngOnInit() {
    this.ajustes.cargar();
  }

  alternarMenu() {
    this.menuAbierto.update((v) => !v);
  }

  // Escape: cierra y devuelve el foco al botón (si el foco estaba en el menú)
  cerrarMenu(devolverFoco = false) {
    if (!this.menuAbierto()) return;
    this.menuAbierto.set(false);
    if (devolverFoco) this.botonMenu()?.nativeElement.focus();
  }

  clicFuera(e: MouseEvent) {
    if (this.menuAbierto() && !this.cabecera()?.nativeElement.contains(e.target as Node)) this.menuAbierto.set(false);
  }

  buscar(evento: Event, form: HTMLFormElement) {
    evento.preventDefault();
    const q = String(new FormData(form).get('q') || '').trim();
    this.router.navigate(['/catalogo'], { queryParams: q ? { q } : {} });
    form.reset();
  }
}
