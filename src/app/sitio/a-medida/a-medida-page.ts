import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormMedida } from '../componentes/formularios';
import { AjustesSitio } from '../estado-sitio';
import { Seo } from '../seo';

// Fabricación a medida: antes era una sección del inicio; ahora tiene su propia página.
@Component({
  selector: 'app-a-medida-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormMedida],
  template: `
    <section class="contenedor medida">
      <div class="medida__texto">
        <p class="kicker">Solo un fabricante puede hacerlo</p>
        <h1>¿No encuentra su filtro? Lo fabricamos a la medida.</h1>
        <p class="lead">Máquinas antiguas, importadas o con repuestos difíciles de conseguir. Envíenos las medidas o una foto del filtro usado y le cotizamos.</p>
        <ol class="pasos">
          <li><span class="pasos__n">1</span><div><b>Envíe medidas o una foto</b><span>Diámetros, altura y tipo de tapa, o una foto con un metro al lado.</span></div></li>
          <li><span class="pasos__n">2</span><div><b>{{ ajustes.valores().tiempoRespuestaCotizacion ? 'Cotizamos en ' + ajustes.valores().tiempoRespuestaCotizacion : 'Le enviamos la cotización' }}</b><span>Precio, cantidad mínima y fecha de entrega.</span></div></li>
          <li><span class="pasos__n">3</span><div><b>Fabricamos y despachamos</b><span>Guardamos su referencia para la próxima compra.</span></div></li>
        </ol>
      </div>
      <div class="medida__form tarjeta"><app-form-medida /></div>
    </section>
  `,
  styles: `
    .medida { padding-top: 48px; padding-bottom: 72px; display: flex; flex-wrap: wrap; gap: 32px 48px; align-items: flex-start; }
    .medida__texto { flex: 1 1 420px; min-width: 0; .kicker { margin: 0 0 8px; } }
    h1 { font-size: 40px; line-height: 1.1; }
    .lead { margin: 12px 0 0; font-size: 17px; color: var(--f-text-2); line-height: 1.5; max-width: 620px; }
    .medida__form { flex: 1 1 380px; min-width: 0; padding: 24px; }
    .pasos { list-style: none; margin: 28px 0 0; padding: 0; display: flex; flex-direction: column; gap: 18px;
      li { display: flex; gap: 14px; align-items: flex-start; }
      b { display: block; font-size: 16px; } span:not(.pasos__n) { font-size: 14px; color: var(--f-muted); } }
    .pasos__n { width: 32px; height: 32px; border-radius: 50%; background: var(--f-ink); color: #fff; flex: none; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    @media (max-width: 760px) {
      .medida { padding-top: 24px; padding-bottom: 40px; gap: 20px; }
      h1 { font-size: 28px; }
      .pasos { margin-top: 18px; gap: 12px; }
      .medida__form { padding: 18px; }
    }
  `
})
export class AMedidaPage implements OnInit {
  ajustes = inject(AjustesSitio);
  private seo = inject(Seo);
  ngOnInit() {
    this.seo.pagina({
      titulo: 'Fabricación de filtros a la medida · Filtramos',
      descripcion: 'Envíenos las medidas o una foto del filtro usado y le cotizamos la fabricación a la medida.',
      ruta: '/a-medida'
    });
  }
}
