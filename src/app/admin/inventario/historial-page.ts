import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi, mensajeDeError } from '../admin-api';
import { Movimiento } from '../modelos';
import { ListaMovimientos } from './lista-movimientos';

// Historial completo de movimientos (solo lectura: se corrige con un ajuste, nunca editando)
@Component({
  selector: 'app-historial-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ListaMovimientos],
  template: `
    <header>
      <a routerLink="/admin/inventario" class="volver">← Inventario</a>
      <h1>Historial de movimientos</h1>
      <p class="nota">No se edita ni se borra. Para corregir un error registre un ajuste por conteo físico.</p>
    </header>
    @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
    <section class="tarjeta caja" aria-label="Movimientos">
      <app-lista-movimientos [movimientos]="movimientos()" />
      <div class="tabla__pie">
        <span>{{ total() }} movimientos</span>
        @if (paginas() > 1) {
          <nav class="paginas" aria-label="Páginas">
            @for (n of numeros(); track n) {
              <button type="button" (click)="ir(n)" [attr.aria-current]="n === pagina() ? 'page' : null" [attr.aria-label]="'Página ' + n">{{ n }}</button>
            }
          </nav>
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: contents; }
    h1 { font-size: 32px; margin-top: 6px; }
    .nota { margin: 4px 0 0; color: var(--f-muted); font-size: 15px; }
    .volver { font-weight: 600; font-size: 14px; }
    .caja { padding: 8px 18px 0; }
    .tabla__pie { margin: 0 -18px; }
  `
})
export class HistorialPage implements OnInit {
  private api = inject(AdminApi);
  movimientos = signal<Movimiento[]>([]);
  pagina = signal(1);
  paginas = signal(1);
  total = signal(0);
  error = signal<string | null>(null);
  numeros = computed(() => Array.from({ length: Math.min(this.paginas(), 50) }, (_, i) => i + 1));

  ngOnInit() { this.ir(1); }

  ir(n: number) {
    this.api.movimientos({ pagina: n, porPagina: 30 }).subscribe({
      next: (r) => { this.movimientos.set(r.movimientos); this.pagina.set(r.pagina); this.paginas.set(r.paginas); this.total.set(r.total); },
      error: (e) => this.error.set(mensajeDeError(e))
    });
  }
}
