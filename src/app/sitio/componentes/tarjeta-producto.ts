import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from '../../shared/ui/icono';
import { enlaceWhatsapp, pesos, urlImagen } from '../../shared/formato';
import { AjustesSitio } from '../estado-sitio';
import { TarjetaProducto, textoEquivalencias } from '../sitio-api';

// Tarjeta de producto (Main.png "Referencias más vendidas"; en móvil, horizontal como Movil-Inicio.png)
@Component({
  selector: 'app-tarjeta-producto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icono],
  template: `
    <article class="tarjeta-p">
      <a [routerLink]="['/filtro', p().slug]" class="tarjeta-p__foto" tabindex="-1" aria-hidden="true">
        @if (imagen()) { <img [src]="imagen()" alt="" loading="lazy" width="400" height="300" /> }
        @else { <span class="tarjeta-p__sinfoto">Foto</span> }
        @if (p().tipoNombre) { <span class="tarjeta-p__tipo">{{ p().tipoNombre }}</span> }
      </a>
      <div class="tarjeta-p__cuerpo">
        <span class="tarjeta-p__tipo-movil">{{ p().tipoNombre }}</span>
        <h3 class="tarjeta-p__ref mono"><a [routerLink]="['/filtro', p().slug]">{{ p().referencia }}</a></h3>
        @if (equivale()) { <p class="tarjeta-p__eq">{{ p().tipo === 'kit' ? 'Incluye' : 'Equivale a' }}: {{ equivale() }}</p> }
        @if (p().diametroExterno || p().alto) {
          <div class="tarjeta-p__medidas mono">
            @if (p().diametroExterno) { <span>Ø ext {{ p().diametroExterno }} mm</span> }
            @if (p().alto) { <span>Alto {{ p().alto }} mm</span> }
          </div>
        }
        <div class="tarjeta-p__precio">
          <div class="tarjeta-p__valor">{{ precio() }}</div>
          @if (nota()) { <div class="tarjeta-p__nota">{{ nota() }}</div> }
        </div>
        <div class="tarjeta-p__acciones">
          <a [routerLink]="['/filtro', p().slug]" class="btn btn--oscuro tarjeta-p__ver">Ver ficha</a>
          @if (whatsapp(); as wa) {
            <a [href]="wa" class="btn-icono tarjeta-p__wa" target="_blank" rel="noopener" [attr.aria-label]="'Cotizar ' + p().referencia + ' por WhatsApp'">
              <f-icono nombre="whatsapp" />
            </a>
          }
        </div>
      </div>
    </article>
  `,
  styles: `
    .tarjeta-p { background: #fff; border: 1px solid var(--f-line); border-radius: var(--f-radio-tarjeta); overflow: hidden; display: flex; flex-direction: column; height: 100%; }
    .tarjeta-p__foto { aspect-ratio: 4 / 3; background: var(--f-placeholder); display: flex; align-items: center; justify-content: center; position: relative; color: var(--f-muted); font-size: 13px; }
    .tarjeta-p__foto img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .tarjeta-p__tipo { position: absolute; left: 12px; top: 12px; background: var(--f-ink); color: #fff; font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 4px; }
    .tarjeta-p__tipo-movil { display: none; }
    .tarjeta-p__cuerpo { padding: 18px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .tarjeta-p__ref { margin: 0; font-size: 18px; font-weight: 600; font-family: var(--f-font-mono); }
    .tarjeta-p__ref a { color: var(--f-ink); text-decoration: none; }
    .tarjeta-p__ref a:hover { text-decoration: underline; }
    .tarjeta-p__eq { margin: 0; font-size: 14px; color: var(--f-muted); line-height: 1.45; }
    .tarjeta-p__medidas { display: flex; gap: 16px; font-size: 13px; color: var(--f-text-2); border-top: 1px dashed var(--f-line); padding-top: 10px; }
    .tarjeta-p__precio { margin-top: auto; padding-top: 8px; }
    .tarjeta-p__valor { font-family: var(--f-font-display); font-size: 24px; font-weight: 700; }
    .tarjeta-p__nota { font-size: 12px; color: var(--f-muted); }
    .tarjeta-p__acciones { display: flex; gap: 8px; }
    .tarjeta-p__ver { flex: 1; }
    .tarjeta-p__wa { border-color: var(--f-green); color: var(--f-green); }
    @media (max-width: 760px) {
      .tarjeta-p { flex-direction: row; padding: 14px; gap: 14px; }
      .tarjeta-p__foto { width: 96px; height: 96px; flex: none; aspect-ratio: auto; border-radius: 8px; overflow: hidden; }
      .tarjeta-p__tipo { display: none; }
      .tarjeta-p__tipo-movil { display: block; font-size: 13px; color: var(--f-text-2); }
      .tarjeta-p__cuerpo { padding: 0; gap: 4px; min-width: 0; }
      .tarjeta-p__medidas, .tarjeta-p__acciones, .tarjeta-p__nota { display: none; }
      .tarjeta-p__ref { font-size: 17px; }
      .tarjeta-p__valor { font-size: 19px; }
      .tarjeta-p__eq { font-size: 13px; }
      .tarjeta-p__precio { padding-top: 2px; }
      .tarjeta-p__ref a::after { content: ''; position: absolute; inset: 0; }
      .tarjeta-p { position: relative; }
    }
  `
})
export class TarjetaProductoComponent {
  p = input.required<TarjetaProducto>();
  private ajustes = inject(AjustesSitio);

  imagen = computed(() => urlImagen(this.p().imagen));
  equivale = computed(() => (this.p().tipo === 'kit' ? (this.p().kit || []).join(', ') : textoEquivalencias(this.p().equivalencias)));
  precio = computed(() => (this.p().precio ? pesos(this.p().precio) : 'Cotizar'));
  nota = computed(() => [this.ajustes.valores().notaPrecios, this.p().tieneVolumen ? 'Precio por volumen disponible' : ''].filter(Boolean).join(' · '));
  whatsapp = computed(() => enlaceWhatsapp(this.ajustes.whatsapp(), `Hola, quiero cotizar la referencia ${this.p().referencia}.`));
}
