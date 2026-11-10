import { ChangeDetectionStrategy, Component, inject, OnInit, RESPONSE_INIT } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seo } from './seo';

@Component({
  selector: 'app-no-encontrado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="contenedor nf">
      <h1>Página no encontrada</h1>
      <p>La dirección no existe o cambió. Busque su filtro por la referencia.</p>
      <a routerLink="/catalogo" class="btn btn--oscuro">Ir al catálogo</a>
    </section>
  `,
  styles: `.nf { padding-top: 64px; padding-bottom: 72px; h1 { font-size: 36px; } p { color: var(--f-text-2); } }`
})
export class NoEncontrado implements OnInit {
  private respuesta = inject(RESPONSE_INIT, { optional: true });
  private seo = inject(Seo);
  ngOnInit() {
    if (this.respuesta) this.respuesta.status = 404;
    this.seo.pagina({ titulo: 'Página no encontrada · Filtramos', descripcion: 'La página no existe.', ruta: '/', indexar: false });
  }
}
