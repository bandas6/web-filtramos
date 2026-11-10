import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeDisponibilidad } from '../../shared/ui/badge-disponibilidad';
import { pesos, urlImagen } from '../../shared/formato';
import { TarjetaProducto } from '../sitio-api';

// "Equivale a Donaldson P181052 +2" / "Incluye DEMO-AP-001, DEMO-AS-001": siempre una sola línea
export function lineaEquivalencias(p: TarjetaProducto): { prefijo: string; texto: string; mas: number } | null {
  if (p.tipo === 'kit') {
    const comps = p.kit || [];
    if (!comps.length) return null;
    return { prefijo: 'Incluye', texto: comps.slice(0, 2).join(', '), mas: Math.max(0, comps.length - 2) };
  }
  const eqs = p.equivalencias || [];
  if (!eqs.length) return null;
  const total = Math.max(p.totalEquivalencias ?? eqs.length, eqs.length);
  const e = eqs[0];
  return { prefijo: 'Equivale a', texto: [e.marca, e.referencia].filter(Boolean).join(' '), mas: total - 1 };
}

// Tarjeta del catálogo: badge de disponibilidad, foto pequeña, referencia, tipo, medidas, precio y un solo botón.
// En celular pasa a fila horizontal (foto a la izquierda).
@Component({
  selector: 'app-tarjeta-producto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeDisponibilidad],
  template: `
    <article class="tarjeta-p">
      <div class="tarjeta-p__foto" aria-hidden="true">
        @if (imagen()) { <img [src]="imagen()" alt="" loading="lazy" width="320" height="200" /> }
        @else { <span class="tarjeta-p__sinfoto">Sin foto</span> }
      </div>
      <div class="tarjeta-p__cuerpo">
        <f-disponibilidad class="tarjeta-p__disp" [estado]="p().disponibilidad.estado" />
        <h3 class="tarjeta-p__ref mono"><a [routerLink]="['/filtro', p().slug]">{{ p().referencia }}</a></h3>
        <span class="tarjeta-p__tipo">{{ p().tipoNombre }}</span>
        @if (medidas()) { <span class="tarjeta-p__medidas mono">{{ medidas() }}</span> }
        @if (eq(); as e) {
          <p class="eq"><span class="eq__t">{{ e.prefijo }} {{ e.texto }}</span>@if (e.mas) { <span class="eq__mas">+{{ e.mas }}<span class="sr-only"> más</span></span> }</p>
        }
        <div class="tarjeta-p__pie">
          <span class="tarjeta-p__valor">{{ precio() }}</span>
          <a [routerLink]="['/filtro', p().slug]" class="btn btn--oscuro tarjeta-p__btn" tabindex="-1" aria-hidden="true">Ver ficha</a>
        </div>
      </div>
    </article>
  `,
  styles: `
    .tarjeta-p { position: relative; background: #fff; border: 1px solid var(--f-line); border-radius: var(--f-radio-tarjeta); overflow: hidden; display: flex; flex-direction: column; height: 100%; }
    .tarjeta-p:hover { border-color: var(--f-ink); }
    .tarjeta-p:focus-within { outline: 2px solid var(--f-green); outline-offset: 2px; }
    .tarjeta-p__foto { height: 132px; background: #fff; border-bottom: 1px solid var(--f-line-soft); display: flex; align-items: center; justify-content: center; color: var(--f-muted); font-size: 13px; }
    .tarjeta-p__foto img { width: 100%; height: 100%; object-fit: contain; padding: 12px 24px; }
    .tarjeta-p__sinfoto { background: var(--f-placeholder); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .tarjeta-p__cuerpo { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
    .tarjeta-p__disp { align-self: flex-start; margin-bottom: 4px; }
    .tarjeta-p__ref { margin: 0; font-size: 17px; font-weight: 600; font-family: var(--f-font-mono); }
    .tarjeta-p__ref a { color: var(--f-ink); text-decoration: none; }
    /* Toda la tarjeta es el enlace (un solo destino; el botón es solo visual) */
    .tarjeta-p__ref a::after { content: ''; position: absolute; inset: 0; }
    .tarjeta-p__ref a:focus-visible { outline: none; }
    .tarjeta-p__tipo { font-size: 13px; color: var(--f-text-2); }
    .tarjeta-p__medidas { font-size: 12px; color: var(--f-text-2); }
    .eq { margin: 2px 0 0; display: flex; gap: 4px; min-width: 0; font-size: 13px; color: var(--f-muted); }
    .eq__t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .eq__mas { flex: none; font-weight: 700; color: var(--f-text-2); }
    .tarjeta-p__pie { margin-top: auto; padding-top: 10px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .tarjeta-p__valor { font-family: var(--f-font-display); font-size: 20px; font-weight: 700; }
    .tarjeta-p__btn { min-height: 40px; padding: 0 14px; font-size: 14px; }
    @media (max-width: 760px) {
      .tarjeta-p { flex-direction: row; gap: 12px; padding: 12px; }
      .tarjeta-p__foto { width: 84px; height: 84px; flex: none; aspect-ratio: auto; border: 1px solid var(--f-line-soft); border-radius: 8px; overflow: hidden; }
      .tarjeta-p__foto img { padding: 4px; }
      .tarjeta-p__cuerpo { padding: 0; gap: 2px; }
      .tarjeta-p__btn { display: none; }
      .tarjeta-p__pie { padding-top: 4px; }
      .tarjeta-p__valor { font-size: 18px; }
    }
  `
})
export class TarjetaProductoComponent {
  p = input.required<TarjetaProducto>();

  imagen = computed(() => urlImagen(this.p().imagen, 400));
  eq = computed(() => lineaEquivalencias(this.p()));
  precio = computed(() => (this.p().precio ? pesos(this.p().precio) : 'A cotizar'));
  medidas = computed(() => [
    this.p().diametroExterno ? `Ø ext ${this.p().diametroExterno} mm` : '',
    this.p().alto ? `Alto ${this.p().alto} mm` : ''
  ].filter(Boolean).join(' · '));
}

// Fila compacta (Movil-Inicio.png): foto pequeña a la izquierda; referencia, tipo, precio y disponibilidad a la derecha.
@Component({
  selector: 'app-item-producto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BadgeDisponibilidad],
  template: `
    <article class="item">
      <div class="item__foto" aria-hidden="true">
        @if (imagen()) { <img [src]="imagen()" alt="" loading="lazy" width="72" height="72" /> } @else { <span>Sin foto</span> }
      </div>
      <div class="item__datos">
        <span class="item__tipo">{{ p().tipo === 'kit' ? (p().aplicaciones?.[0] || p().tipoNombre) : p().tipoNombre }}</span>
        <h3 class="item__ref mono"><a [routerLink]="['/filtro', p().slug]">{{ p().referencia }}</a></h3>
        @if (eq(); as e) { <p class="eq"><span class="eq__t">{{ e.prefijo }} {{ e.texto }}</span>@if (e.mas) { <span class="eq__mas">+{{ e.mas }}<span class="sr-only"> más</span></span> }</p> }
      </div>
      <div class="item__der">
        <span class="item__precio">{{ p().precio ? pesos(p().precio) : 'A cotizar' }}</span>
        <f-disponibilidad [estado]="p().disponibilidad.estado" />
      </div>
    </article>
  `,
  styles: `
    .item { position: relative; display: flex; gap: 12px; align-items: center; background: #fff; border: 1px solid var(--f-line); border-radius: var(--f-radio-tarjeta); padding: 10px 14px 10px 10px; }
    .item:hover { border-color: var(--f-ink); }
    .item:focus-within { outline: 2px solid var(--f-green); outline-offset: 2px; }
    .item__foto { width: 72px; height: 72px; flex: none; border-radius: 8px; overflow: hidden; background: var(--f-placeholder); display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--f-muted); }
    .item__foto img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .item__datos { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .item__tipo { font-size: 13px; color: var(--f-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item__ref { margin: 0; font-size: 16px; font-weight: 600; font-family: var(--f-font-mono); }
    .item__ref a { color: var(--f-ink); text-decoration: none; }
    .item__ref a::after { content: ''; position: absolute; inset: 0; }
    .item__ref a:focus-visible { outline: none; }
    .eq { margin: 2px 0 0; display: flex; gap: 4px; min-width: 0; font-size: 13px; color: var(--f-muted); }
    .eq__t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .eq__mas { flex: none; font-weight: 700; color: var(--f-text-2); }
    .item__der { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex: none; }
    .item__precio { font-family: var(--f-font-display); font-weight: 700; font-size: 17px; }
  `
})
export class ItemProductoComponent {
  p = input.required<TarjetaProducto>();
  readonly pesos = pesos;
  imagen = computed(() => urlImagen(this.p().imagen, 160));
  eq = computed(() => lineaEquivalencias(this.p()));
}
