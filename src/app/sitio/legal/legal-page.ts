import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { AjustesSitio } from '../estado-sitio';
import { Seo } from '../seo';

// Textos legales tomados de Ajustes. Garantía y envíos se ocultan si faltan; el tratamiento de datos
// siempre aparece porque los formularios enlazan a él (con un texto mínimo mientras se completa).
@Component({
  selector: 'app-legal-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="contenedor legal">
      <h1>Políticas{{ ajustes.valores().garantia ? ' y garantía' : '' }}</h1>
      <article id="datos">
        <h2>Tratamiento de datos personales</h2>
        <p>{{ ajustes.valores().politicaDatos || 'La política de tratamiento de datos se publicará pronto. Mientras tanto, sus datos se usan solo para responder la solicitud que nos envía.' }}</p>
      </article>
      @if (ajustes.valores().garantia; as garantia) {
        <article id="garantia">
          <h2>Garantía</h2>
          <p>{{ garantia }}</p>
        </article>
      }
      @if (ajustes.valores().politicaEnvios; as envios) {
        <article id="envios">
          <h2>Envíos</h2>
          <p>{{ envios }}</p>
        </article>
      }
    </section>
  `,
  styles: `
    .legal { padding-top: 40px; padding-bottom: 72px; max-width: 820px; display: flex; flex-direction: column; gap: 28px; }
    h1 { font-size: 36px; }
    h2 { font-size: 24px; margin-bottom: 8px; }
    p { margin: 0; white-space: pre-line; line-height: 1.6; color: var(--f-text-2); }
    article { scroll-margin-top: 24px; }
  `
})
export class LegalPage implements OnInit {
  ajustes = inject(AjustesSitio);
  private seo = inject(Seo);
  ngOnInit() {
    this.seo.pagina({ titulo: 'Políticas y garantía · Filtramos', descripcion: 'Tratamiento de datos personales, garantía y envíos de Filtramos SAS.', ruta: '/legal' });
  }
}
