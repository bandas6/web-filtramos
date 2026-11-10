import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MOTIVOS } from '../../admin/modelos';

// "Publicado" (verde) o "Borrador · motivo" (naranja), como en Admin.png
@Component({
  selector: 'f-badge-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class.badge--ok]="publicado()" [class.badge--aviso]="!publicado()">{{ texto() }}</span>`
})
export class BadgeEstado {
  publicado = input.required<boolean>();
  motivos = input<string[]>([]);

  texto = computed(() => {
    if (this.publicado()) return 'Publicado';
    const m = this.motivos().map((x) => MOTIVOS[x] || x);
    return m.length ? `Borrador · ${m.join(', ')}` : 'Borrador';
  });
}
