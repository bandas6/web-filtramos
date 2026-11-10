import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type Disponibilidad = 'disponible' | 'ultimas' | 'bajo-pedido';

// Disponibilidad según diseno/Disponibilidad.png. Se usa en el panel (variante "corta"),
// y en tarjeta, ficha y carrito del sitio (variante "bloque").
// Los tiempos vienen de Ajustes; si faltan, esa parte del texto se omite (nunca se inventa).
@Component({
  selector: 'f-disponibilidad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (variante() === 'corta') {
      <span class="badge" [class.badge--ok]="estado() === 'disponible'" [class.badge--aviso]="estado() === 'ultimas'"
            [class.badge--neutro]="estado() === 'bajo-pedido'">{{ titulo() }}</span>
    } @else {
      <div class="disp" [class]="'disp disp--' + estado()">
        <div class="disp__titulo">{{ titulo() }}</div>
        @if (detalle()) { <div class="disp__detalle">{{ detalle() }}</div> }
      </div>
    }
  `,
  styles: `
    .disp { border-radius: 8px; padding: 10px 12px; }
    .disp__titulo { font-weight: 700; }
    .disp__detalle { font-size: 13px; }
    .disp--disponible { background: var(--f-green-tint); color: var(--f-green-dark); }
    .disp--ultimas { background: var(--f-warn-bg); color: var(--f-warn); }
    .disp--bajo-pedido { background: var(--f-neutral-bg); color: #2b2f2b; }
  `
})
export class BadgeDisponibilidad {
  estado = input.required<Disponibilidad>();
  quedan = input<number | null>(null);
  variante = input<'corta' | 'bloque'>('corta');
  tiempoDespacho = input<string | undefined>(undefined);
  tiempoFabricacion = input<string | undefined>(undefined);

  titulo = computed(() => ({ disponible: 'Disponible', ultimas: 'Últimas unidades', 'bajo-pedido': 'Bajo pedido' })[this.estado()]);

  detalle = computed(() => {
    const despacho = this.tiempoDespacho() ? `despacho en ${this.tiempoDespacho()}` : '';
    switch (this.estado()) {
      case 'disponible': return despacho ? `Despacho en ${this.tiempoDespacho()}` : '';
      case 'ultimas': return [this.quedan() ? `Quedan ${this.quedan()}` : '', despacho].filter(Boolean).join(' · ');
      default: return this.tiempoFabricacion() ? `Lo fabricamos en ${this.tiempoFabricacion()}` : 'Lo fabricamos para usted';
    }
  });
}
