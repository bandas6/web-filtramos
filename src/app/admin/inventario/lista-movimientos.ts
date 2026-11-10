import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Movimiento, NOMBRE_MOTIVO, NOMBRE_MOVIMIENTO } from '../modelos';

const ORIGEN: Record<string, string> = { siigo: 'Siigo', importacion: 'Importación Excel', web: 'Sitio web', manual: '' };

// Lista de movimientos (Inventario.png, "Movimientos recientes"): +N verde, −N naranja; reservas en gris.
@Component({
  selector: 'app-lista-movimientos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="movs">
      @for (m of movimientos(); track m.uid) {
        <li class="mov">
          <span class="mov__cant mono" [class.mov__cant--mas]="esStock(m) && m.cantidad > 0" [class.mov__cant--menos]="esStock(m) && m.cantidad < 0">
            {{ signo(m) }}
          </span>
          <div class="mov__texto">
            <div><b class="mono">{{ m.referencia }}</b> · {{ tipo[m.tipo] }} · {{ motivo[m.motivo] || m.motivo }}</div>
            <div class="mov__detalle">
              {{ detalle(m) }}
            </div>
          </div>
        </li>
      } @empty {
        <li class="mov mov--vacio">Todavía no hay movimientos.</li>
      }
    </ul>
  `,
  styles: `
    .movs { margin: 0; padding: 0; list-style: none; }
    .mov { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-top: 1px solid var(--f-line-soft); }
    .mov__cant { flex: none; min-width: 52px; text-align: right; font-weight: 600; color: var(--f-text-2); }
    .mov__cant--mas { color: var(--f-green); }
    .mov__cant--menos { color: var(--f-warn); }
    .mov__texto { min-width: 0; font-size: 14px; overflow-wrap: anywhere; }
    .mov__detalle { font-size: 12px; color: var(--f-muted); }
    .mov--vacio { color: var(--f-muted); font-size: 14px; }
  `
})
export class ListaMovimientos {
  movimientos = input<Movimiento[]>([]);
  readonly tipo = NOMBRE_MOVIMIENTO;
  readonly motivo = NOMBRE_MOTIVO;
  readonly origen = ORIGEN;

  detalle(m: Movimiento) {
    const fecha = new Date(m.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    return [m.usuarioNombre || this.origen[m.origen], fecha, m.referenciaExterna, m.nota].filter(Boolean).join(' · ');
  }

  esStock(m: Movimiento) { return !['reserva', 'liberacion'].includes(m.tipo); }
  signo(m: Movimiento) {
    if (!this.esStock(m)) return String(Math.abs(m.cantidad));
    return m.cantidad > 0 ? `+${m.cantidad}` : `−${Math.abs(m.cantidad)}`;
  }
}
