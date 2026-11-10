import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Tarjeta de indicador (Productos e Inventario). "alerta" pinta el número en naranja.
@Component({
  selector: 'f-indicador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="indicador">
      <div class="indicador__titulo">{{ titulo() }}</div>
      <div class="indicador__valor" [class.indicador__valor--alerta]="alerta() && !!valor()">{{ valor() ?? '—' }}</div>
      @if (nota()) { <div class="indicador__nota">{{ nota() }}</div> }
    </div>
  `
})
export class TarjetaIndicador {
  titulo = input.required<string>();
  valor = input<number | null | undefined>(null);
  nota = input<string>('');
  alerta = input(false);
}
