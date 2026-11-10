import { ChangeDetectionStrategy, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface OpcionReferencia { referencia: string; tipo: string; disponible: number; }

let siguienteId = 0;
const MAXIMO = 8;
const normalizar = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

// Buscador de referencias con sugerencias (patrón combobox de WAI-ARIA):
// flechas para moverse, Enter para elegir, Escape para cerrar. Solo deja elegir referencias que existen;
// si se escribe una exacta (sin importar espacios o guiones) se toma como elegida.
@Component({
  selector: 'f-buscador-referencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BuscadorReferencia), multi: true }],
  template: `
    <div class="combo">
      <input [id]="inputId()" class="mono" type="text" role="combobox" autocomplete="off" spellcheck="false"
             aria-autocomplete="list" [attr.aria-expanded]="abierto()" [attr.aria-controls]="id + '-lista'"
             [attr.aria-activedescendant]="activa() >= 0 ? id + '-op-' + activa() : null"
             [attr.aria-invalid]="invalida() ? 'true' : null" [attr.aria-describedby]="id + '-estado'"
             [value]="texto()" [disabled]="deshabilitado()" placeholder="Escriba para buscar"
             (input)="escribir($any($event.target).value)" (focus)="abrir()" (blur)="alSalir()" (keydown)="tecla($event)" />
      @if (abierto() && sugerencias().length) {
        <ul class="combo__lista" role="listbox" [id]="id + '-lista'" [attr.aria-label]="'Referencias'">
          @for (o of sugerencias(); track o.referencia; let i = $index) {
            <li role="option" [id]="id + '-op-' + i" [attr.aria-selected]="i === activa()" [class.activa]="i === activa()"
                (mousedown)="$event.preventDefault(); elegir(o)">
              <span class="mono combo__ref">{{ o.referencia }}</span>
              <span class="combo__tipo">{{ o.tipo }}</span>
              <span class="combo__disp">Disp. {{ o.disponible }}</span>
            </li>
          }
        </ul>
      }
      <span [id]="id + '-estado'" class="combo__estado" [class.combo__estado--error]="invalida()" aria-live="polite">
        @if (invalida()) { No existe esa referencia. Elíjala de la lista. }
        @else if (abierto() && texto() && !sugerencias().length) { Sin coincidencias. }
      </span>
    </div>
  `,
  styles: `
    .combo { position: relative; }
    input { width: 100%; }
    .combo__lista {
      position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 40; list-style: none; margin: 0; padding: 4px;
      background: #fff; border: 1px solid var(--f-control); border-radius: 8px; box-shadow: 0 10px 24px rgba(0,0,0,.12); max-height: 280px; overflow-y: auto;
    }
    li { display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'ref disp' 'tipo disp'; column-gap: 12px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
    li.activa, li:hover { background: var(--f-green-tint); }
    .combo__ref { grid-area: ref; font-weight: 600; }
    .combo__tipo { grid-area: tipo; font-size: 12px; color: var(--f-muted); }
    .combo__disp { grid-area: disp; align-self: center; font-size: 13px; color: var(--f-text-2); }
    .combo__estado { display: block; font-size: 13px; color: var(--f-muted); min-height: 0; }
    .combo__estado:empty { display: none; }
    .combo__estado--error { color: var(--f-warn); margin-top: 4px; }
  `
})
export class BuscadorReferencia implements ControlValueAccessor {
  opciones = input<OpcionReferencia[]>([]);
  inputId = input('mv-ref');
  readonly id = `combo-${++siguienteId}`;

  texto = signal('');
  abierto = signal(false);
  activa = signal(-1);
  deshabilitado = signal(false);
  private tocado = signal(false);

  sugerencias = computed(() => {
    const q = normalizar(this.texto());
    const todas = this.opciones();
    if (!q) return todas.slice(0, MAXIMO);
    // Primero las que empiezan igual, luego las que contienen el texto
    const empieza = todas.filter((o) => normalizar(o.referencia).startsWith(q));
    const contiene = todas.filter((o) => !normalizar(o.referencia).startsWith(q) && normalizar(o.referencia).includes(q));
    return [...empieza, ...contiene].slice(0, MAXIMO);
  });
  private exacta = computed(() => this.opciones().find((o) => normalizar(o.referencia) === normalizar(this.texto())) || null);
  invalida = computed(() => this.tocado() && !!this.texto().trim() && !this.exacta() && !this.abierto());

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null) { this.texto.set(v || ''); this.tocado.set(false); }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.onTouched = fn; }
  setDisabledState(d: boolean) { this.deshabilitado.set(d); }

  abrir() { this.abierto.set(true); }

  escribir(v: string) {
    this.texto.set(v);
    this.abierto.set(true);
    this.activa.set(this.sugerencias().length ? 0 : -1);
    // Al formulario solo llega una referencia que existe (con su escritura oficial)
    this.onChange(this.exacta()?.referencia || '');
  }

  elegir(o: OpcionReferencia) {
    this.texto.set(o.referencia);
    this.onChange(o.referencia);
    this.abierto.set(false);
    this.activa.set(-1);
  }

  alSalir() {
    const ex = this.exacta();
    if (ex) this.texto.set(ex.referencia);
    this.abierto.set(false);
    this.tocado.set(true);
    this.onTouched();
  }

  tecla(e: KeyboardEvent) {
    const n = this.sugerencias().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!this.abierto()) this.abierto.set(true);
      if (n) this.activa.set((this.activa() + 1) % n);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (n) this.activa.set(this.activa() <= 0 ? n - 1 : this.activa() - 1);
    } else if (e.key === 'Enter') {
      if (this.abierto() && this.activa() >= 0 && n) { e.preventDefault(); this.elegir(this.sugerencias()[this.activa()]); }
    } else if (e.key === 'Escape') {
      if (this.abierto()) { e.preventDefault(); e.stopPropagation(); this.abierto.set(false); }
    }
  }
}
