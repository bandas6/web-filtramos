import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from '../../services/auth/auth';
import { Icono, NombreIcono } from '../../shared/ui/icono';
import { ListaAvisos } from '../../shared/ui/avisos';
import { EstadoAjustes } from '../estado-ajustes';
import { ROLES } from '../modelos';

interface Opcion { texto: string; ruta: string; icono: NombreIcono; query?: Record<string, string>; roles?: string[]; }

// Menú del diseño (Admin.png / Inventario.png). Las opciones de etapas futuras se agregan aquí.
const OPCIONES: Opcion[] = [
  { texto: 'Productos', ruta: '/admin/productos', icono: 'productos' },
  { texto: 'Inventario', ruta: '/admin/inventario', icono: 'inventario' },
  { texto: 'Importar Excel', ruta: '/admin/importar', icono: 'importar', roles: ['admin'] },
  { texto: 'Kits', ruta: '/admin/productos', icono: 'kits', query: { tipo: 'kit' } },
  { texto: 'Cotizaciones y pedidos', ruta: '/admin/cotizaciones', icono: 'cotizaciones' },
  { texto: 'Imágenes', ruta: '/admin/imagenes', icono: 'imagenes', roles: ['admin'] },
  { texto: 'Usuarios y roles', ruta: '/admin/usuarios', icono: 'usuarios', roles: ['admin'] },
  { texto: 'Ajustes', ruta: '/admin/ajustes', icono: 'ajustes', roles: ['admin'] }
];

@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, Icono, ListaAvisos],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayout implements OnInit {
  auth = inject(Auth);
  private router = inject(Router);
  estadoAjustes = inject(EstadoAjustes);

  menuAbierto = signal(false);
  private url = signal(this.router.url);

  opciones = computed(() => {
    const rol = this.auth.usuario()?.rol || '';
    return OPCIONES.filter((o) => !o.roles || o.roles.includes(rol));
  });

  iniciales = computed(() => {
    const partes = (this.auth.usuario()?.nombre || '').trim().split(/\s+/).filter(Boolean);
    return ((partes[0]?.[0] || '') + (partes[1]?.[0] || partes[0]?.[1] || '')).toUpperCase();
  });
  nombreRol = computed(() => ROLES[this.auth.usuario()?.rol || ''] || '');
  faltaWhatsapp = computed(() => this.estadoAjustes.faltantes().includes('whatsappVentas'));

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.url.set(this.router.url);
      this.menuAbierto.set(false);
    });
  }

  ngOnInit() {
    this.estadoAjustes.refrescar();
  }

  // "Productos" y "Kits" comparten ruta: se distingue por ?tipo=kit
  activa(o: Opcion): boolean {
    const url = this.url();
    if (!url.startsWith(o.ruta)) return false;
    const esKits = /[?&]tipo=kit(&|$)/.test(url);
    if (o.ruta === '/admin/productos') return o.query ? esKits : !esKits;
    return true;
  }

  salir() {
    this.auth.logout();
  }
}
