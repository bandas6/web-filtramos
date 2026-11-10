import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';

export interface Aviso { id: number; texto: string; tipo: 'ok' | 'error'; }

// Mensajes breves de resultado (reemplaza a SweetAlert). Se anuncian a lectores de pantalla.
@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly lista = signal<Aviso[]>([]);
  private siguiente = 1;

  ok(texto: string) { this.mostrar(texto, 'ok'); }
  error(texto: string) { this.mostrar(texto, 'error', 8000); }

  cerrar(id: number) { this.lista.update((l) => l.filter((a) => a.id !== id)); }

  private mostrar(texto: string, tipo: Aviso['tipo'], ms = 4000) {
    const id = this.siguiente++;
    this.lista.update((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => this.cerrar(id), ms);
  }
}

@Component({
  selector: 'f-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="avisos" role="status" aria-live="polite">
      @for (a of avisos.lista(); track a.id) {
        <div class="aviso" [class.aviso--error]="a.tipo === 'error'">
          <span>{{ a.texto }}</span>
          <button type="button" class="aviso__cerrar" aria-label="Cerrar aviso" (click)="avisos.cerrar(a.id)">×</button>
        </div>
      }
    </div>
  `
})
export class ListaAvisos {
  avisos = inject(Avisos);
}
