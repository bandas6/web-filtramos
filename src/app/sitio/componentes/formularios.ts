import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icono } from '../../shared/ui/icono';
import { AjustesSitio } from '../estado-sitio';
import { mensajeError, SitioApi } from '../sitio-api';

const WHATSAPP = /^\+?[\d\s()-]{10,20}$/;

// ---- Fabricación a medida (Main.png)
@Component({
  selector: 'app-form-medida',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icono, RouterLink],
  template: `
    @if (enviado()) {
      <div class="exito" role="status">
        <f-icono nombre="check" [tam]="28" [grosor]="2.4" />
        <h3>Recibimos su solicitud</h3>
        <p>Le respondemos por WhatsApp{{ ajustes.valores().tiempoRespuestaCotizacion ? ' en ' + ajustes.valores().tiempoRespuestaCotizacion : '' }}.</p>
        <button type="button" class="btn" (click)="enviado.set(false)">Enviar otra</button>
      </div>
    } @else {
      <form class="form" [formGroup]="form" (ngSubmit)="enviar()" novalidate aria-labelledby="fm-titulo">
        <h3 id="fm-titulo">Solicitar cotización a medida</h3>
        <div class="dos">
          <div class="field">
            <label for="fm-nombre">Nombre</label>
            <input id="fm-nombre" formControlName="nombre" autocomplete="name" [attr.aria-invalid]="mal('nombre')" />
            @if (mal('nombre')) { <small class="field__error">Escriba su nombre.</small> }
          </div>
          <div class="field">
            <label for="fm-wa">WhatsApp</label>
            <input id="fm-wa" type="tel" inputmode="tel" formControlName="whatsapp" autocomplete="tel" placeholder="57 300 000 0000" [attr.aria-invalid]="mal('whatsapp')" />
            @if (mal('whatsapp')) { <small class="field__error">Escriba su número con indicativo.</small> }
          </div>
        </div>
        <div class="field">
          <label for="fm-empresa">Empresa <small>(opcional)</small></label>
          <input id="fm-empresa" formControlName="empresa" autocomplete="organization" />
        </div>
        <div class="field">
          <label for="fm-medidas">Medidas, máquina o referencia actual</label>
          <textarea id="fm-medidas" formControlName="medidas" rows="3" [attr.aria-invalid]="mal('medidas')"></textarea>
          @if (mal('medidas')) { <small class="field__error">Cuéntenos las medidas o la máquina.</small> }
        </div>
        <div class="foto-fila">
          <label class="foto">
            <f-icono nombre="imagenes" />
            <span>{{ foto()?.name || 'Adjuntar foto del filtro' }}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" class="sr-only" (change)="elegirFoto($any($event.target))" />
          </label>
          <div class="field cantidad">
            <label for="fm-cant">Cantidad</label>
            <input id="fm-cant" type="number" min="1" step="1" inputmode="numeric" formControlName="cantidad" />
          </div>
        </div>
        <input type="text" formControlName="sitioWeb" class="trampa" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <label class="check consentimiento">
          <input type="checkbox" formControlName="consentimiento" [attr.aria-invalid]="mal('consentimiento')" />
          <span>Autorizo el tratamiento de mis datos para responder esta solicitud, según la
            <a routerLink="/legal" fragment="datos">política de tratamiento de datos</a>.</span>
        </label>
        @if (mal('consentimiento')) { <small class="field__error">Para enviar, acepte el tratamiento de datos.</small> }
        @if (error()) { <div class="alerta" role="alert">{{ error() }}</div> }
        <button type="submit" class="btn btn--verde btn--bloque" [disabled]="enviando()">{{ enviando() ? 'Enviando…' : 'Enviar solicitud' }}</button>
        <p class="nota">Le respondemos por WhatsApp. Sus datos se usan solo para esta cotización.</p>
      </form>
    }
  `,
  styleUrl: './formularios.scss'
})
export class FormMedida {
  private api = inject(SitioApi);
  ajustes = inject(AjustesSitio);
  private fb = inject(FormBuilder);

  enviado = signal(false);
  enviando = signal(false);
  error = signal<string | null>(null);
  foto = signal<File | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    whatsapp: ['', [Validators.required, Validators.pattern(WHATSAPP)]],
    empresa: [''],
    medidas: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    sitioWeb: [''],
    consentimiento: [false, Validators.requiredTrue]
  });

  mal(c: keyof typeof this.form.controls) { const x = this.form.controls[c]; return x.invalid && x.touched; }

  elegirFoto(input: HTMLInputElement) {
    const f = input.files?.[0] || null;
    if (f && f.size > 5 * 1024 * 1024) { this.error.set('La foto supera 5 MB.'); input.value = ''; return; }
    this.error.set(null);
    this.foto.set(f);
  }

  enviar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const datos = new FormData();
    for (const [k, val] of Object.entries(v)) datos.append(k, String(val));
    if (this.foto()) datos.append('foto', this.foto()!);
    this.enviando.set(true);
    this.error.set(null);
    this.api.solicitudMedida(datos).subscribe({
      next: () => { this.enviando.set(false); this.enviado.set(true); this.form.reset(); this.foto.set(null); },
      error: (e) => { this.enviando.set(false); this.error.set(mensajeError(e)); }
    });
  }
}

// ---- Recordatorio de cambio (franja oscura de Main.png y tarjeta de la ficha)
@Component({
  selector: 'app-form-recordatorio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    @if (enviado()) {
      <p class="ok-oscuro" role="status">Listo. Le escribiremos por WhatsApp cuando toque el cambio.</p>
    } @else {
      <form class="recordatorio" [formGroup]="form" (ngSubmit)="enviar()" novalidate [attr.aria-label]="'Activar recordatorio' + (referencia() ? ' de ' + referencia() : '')">
        <div class="recordatorio__fila">
          <label class="sr-only" [for]="id + '-wa'">Su número de WhatsApp</label>
          <input [id]="id + '-wa'" type="tel" inputmode="tel" class="recordatorio__input" formControlName="whatsapp" placeholder="Su número de WhatsApp" autocomplete="tel" [attr.aria-invalid]="mal()" />
          <button type="submit" class="recordatorio__btn" [disabled]="enviando()">{{ enviando() ? 'Enviando…' : 'Activar recordatorio' }}</button>
        </div>
        @if (!slug()) {
          <label class="sr-only" [for]="id + '-maq'">Máquina o flota</label>
          <input [id]="id + '-maq'" class="recordatorio__input" formControlName="maquina" placeholder="Máquina o flota (opcional)" />
        }
        <input type="text" formControlName="sitioWeb" class="trampa" tabindex="-1" autocomplete="off" aria-hidden="true" />
        <label class="check recordatorio__check">
          <input type="checkbox" formControlName="consentimiento" />
          <span>Autorizo el uso de mi WhatsApp para este recordatorio, según la <a routerLink="/legal" fragment="datos">política de tratamiento de datos</a>.</span>
        </label>
        @if (mal()) { <small class="recordatorio__error">Escriba su WhatsApp con indicativo y acepte el tratamiento de datos.</small> }
        @if (error()) { <small class="recordatorio__error" role="alert">{{ error() }}</small> }
      </form>
    }
  `,
  styleUrl: './formularios.scss'
})
export class FormRecordatorio {
  private api = inject(SitioApi);
  private fb = inject(FormBuilder);
  slug = input<string | null>(null);
  referencia = input<string | null>(null);
  readonly id = `rec-${Math.random().toString(36).slice(2, 8)}`;

  enviado = signal(false);
  enviando = signal(false);
  error = signal<string | null>(null);
  intentado = signal(false);

  form = this.fb.nonNullable.group({
    whatsapp: ['', [Validators.required, Validators.pattern(WHATSAPP)]],
    maquina: [''],
    sitioWeb: [''],
    consentimiento: [false, Validators.requiredTrue]
  });

  mal = computed(() => this.intentado());

  enviar() {
    if (this.form.invalid) { this.intentado.set(true); return; }
    this.intentado.set(false);
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.api.recordatorio({ whatsapp: v.whatsapp, maquina: v.maquina || undefined, slug: this.slug() || undefined, consentimiento: v.consentimiento, sitioWeb: v.sitioWeb }).subscribe({
      next: () => { this.enviando.set(false); this.enviado.set(true); },
      error: (e) => { this.enviando.set(false); this.error.set(mensajeError(e)); }
    });
  }
}
