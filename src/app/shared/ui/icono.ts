import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NombreIcono =
  | 'productos' | 'kits' | 'cotizaciones' | 'imagenes' | 'usuarios' | 'ajustes' | 'inventario' | 'importar'
  | 'descargar' | 'subir' | 'mas' | 'editar' | 'eliminar' | 'menu' | 'cerrar' | 'arriba' | 'abajo'
  | 'sincronizar' | 'buscar' | 'whatsapp' | 'carrito' | 'check' | 'aviso' | 'excel' | 'camion' | 'escudo' | 'fabrica' | 'inicio';

// Íconos de trazo del diseño (24×24). Siempre decorativos: el texto o el aria-label del botón da el nombre.
@Component({
  selector: 'f-icono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', style: 'display:inline-flex;flex:none' },
  template: `
    <svg [attr.width]="tam()" [attr.height]="tam()" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         [attr.stroke-width]="grosor()" stroke-linecap="round" stroke-linejoin="round" focusable="false">
      @switch (nombre()) {
        @case ('productos') { <circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/> }
        @case ('inicio') { <path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/> }
        @case ('kits') { <path d="M4 7h16v13H4zM9 7V4h6v3"/> }
        @case ('cotizaciones') { <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5z"/> }
        @case ('whatsapp') { <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-5.2A8.5 8.5 0 1 1 21 11.5z"/> }
        @case ('imagenes') { <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 4v16"/> }
        @case ('usuarios') { <circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-3-1.8-5.2-4.5-5.8"/> }
        @case ('ajustes') { <path d="M12 3v3M12 18v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M3 12h3M18 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/> }
        @case ('inventario') { <path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/> }
        @case ('importar') { <path d="M6 3h9l4 4v14H6z"/><path d="M9 12l6 6M15 12l-6 6"/> }
        @case ('excel') { <path d="M6 3h9l4 4v14H6z"/><path d="M9 12l6 6M15 12l-6 6"/> }
        @case ('descargar') { <path d="M12 4v11M7 10l5 5 5-5M5 20h14"/> }
        @case ('subir') { <path d="M12 20V9M7 13l5-5 5 5M5 4h14"/> }
        @case ('mas') { <path d="M12 5v14M5 12h14"/> }
        @case ('editar') { <path d="M4 20h4L19 9l-4-4L4 16z"/> }
        @case ('eliminar') { <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/> }
        @case ('menu') { <path d="M4 7h16M4 12h16M4 17h16"/> }
        @case ('cerrar') { <path d="M6 6l12 12M18 6L6 18"/> }
        @case ('arriba') { <path d="M12 19V5M6 11l6-6 6 6"/> }
        @case ('abajo') { <path d="M12 5v14M6 13l6 6 6-6"/> }
        @case ('sincronizar') { <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/> }
        @case ('buscar') { <circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/> }
        @case ('carrito') { <path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/> }
        @case ('check') { <path d="M5 12.5l4.5 4.5L19 7.5"/> }
        @case ('aviso') { <path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17v.5"/> }
        @case ('camion') { <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/> }
        @case ('escudo') { <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/> }
        @case ('fabrica') { <path d="M3 20V10l5 3V10l5 3V6h4l1 14z"/><path d="M3 20h18"/> }
      }
    </svg>
  `
})
export class Icono {
  nombre = input.required<NombreIcono>();
  tam = input(18);
  grosor = input(1.8);
}
