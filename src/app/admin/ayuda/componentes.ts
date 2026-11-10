import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Auth } from '../../services/auth/auth';
import { Icono } from '../../shared/ui/icono';
import { AYUDA_CAMPO, AYUDA_SECCION, CampoAyuda, Rol, Seccion } from './textos';

let siguienteId = 0;

// Cuadro "¿Cómo funciona esta pantalla?". Se cierra con ✕ y se reabre con el botón "Ayuda";
// la preferencia se guarda por usuario en la API. El texto se adapta al rol.
@Component({
  selector: 'f-ayuda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono],
  template: `
    @if (abierta()) {
      <section class="ayuda" [attr.aria-labelledby]="id + '-t'">
        <div class="ayuda__cab">
          <h2 [id]="id + '-t'"><span class="ayuda__icono" aria-hidden="true">?</span>{{ texto().titulo }}</h2>
          <button type="button" class="btn-icono ayuda__cerrar" #cerrarBtn (click)="cerrar()" aria-label="Cerrar la ayuda"><f-icono nombre="cerrar" [tam]="18" /></button>
        </div>
        <ol class="ayuda__pasos">
          @for (p of texto().pasos; track $index) { <li>{{ p }}</li> }
        </ol>
      </section>
    } @else {
      <button type="button" class="btn ayuda__abrir" #abrirBtn (click)="abrir()" [attr.aria-label]="'Ayuda: ' + texto().titulo">
        <span class="ayuda__icono" aria-hidden="true">?</span>Ayuda
      </button>
    }
  `,
  styles: `
    :host { display: block; margin-bottom: 16px; }
    .ayuda { background: var(--f-green-tint); border: 1px solid #cfe5d1; border-radius: var(--f-radio-tarjeta); padding: 14px 16px 16px; }
    .ayuda__cab { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    h2 { font-family: var(--f-font-body); font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 10px; margin: 0; }
    .ayuda__icono { width: 22px; height: 22px; border-radius: 50%; background: var(--f-green); color: #fff; font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
    .ayuda__cerrar { background: transparent; border-color: transparent; }
    .ayuda__pasos { margin: 8px 0 0; padding-left: 22px; display: flex; flex-direction: column; gap: 4px; font-size: 15px; line-height: 1.45; color: var(--f-ink); }
    .ayuda__abrir { min-height: 36px; padding: 0 12px; font-size: 14px; font-weight: 600; gap: 8px; }
  `
})
export class AyudaSeccion {
  seccion = input.required<Seccion>();
  private auth = inject(Auth);
  private abrirBtn = viewChild<ElementRef<HTMLButtonElement>>('abrirBtn');
  private cerrarBtn = viewChild<ElementRef<HTMLButtonElement>>('cerrarBtn');
  readonly id = `ayuda-${++siguienteId}`;

  texto = computed(() => {
    const def = AYUDA_SECCION[this.seccion()];
    const rol = (this.auth.usuario()?.rol || 'admin') as Rol;
    return def.porRol?.[rol] || def;
  });
  abierta = computed(() => !this.auth.preferencias().ayudaCerrada.includes(this.seccion()));

  cerrar() {
    this.auth.guardarPreferencias({ ayudaCerrada: [...this.auth.preferencias().ayudaCerrada, this.seccion()] });
    setTimeout(() => this.abrirBtn()?.nativeElement.focus());
  }
  abrir() {
    this.auth.guardarPreferencias({ ayudaCerrada: this.auth.preferencias().ayudaCerrada.filter((s) => s !== this.seccion()) });
    setTimeout(() => this.cerrarBtn()?.nativeElement.focus());
  }
}

// Ícono "?" con la explicación de un campo. Botón accesible con teclado: Enter/Espacio abre, Escape cierra.
// El texto también está en aria-describedby, así el lector de pantalla lo lee al enfocar el botón.
@Component({
  selector: 'f-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'abierto.set(false)', '(focusout)': 'alSalir($event)' },
  template: `
    <button type="button" class="info" (click)="abierto.set(!abierto())" [attr.aria-expanded]="abierto()"
            [attr.aria-label]="'Qué es ' + (etiqueta() || 'este dato')" [attr.aria-describedby]="id">?</button>
    <span [id]="id" role="tooltip" class="globo" [class.visible]="abierto()">{{ texto() }}</span>
  `,
  styles: `
    :host { position: relative; display: inline-flex; vertical-align: middle; margin-left: 4px; }
    .info {
      width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--f-control); background: #fff; color: var(--f-text-2);
      font: 700 12px var(--f-font-body); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; padding: 0;
    }
    /* Área táctil de 44 px sin cambiar el tamaño visual */
    .info::before { content: ''; position: absolute; inset: -12px; }
    .info:hover, .info[aria-expanded='true'] { background: var(--f-ink); color: #fff; border-color: var(--f-ink); }
    .globo {
      position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); z-index: 50; width: max-content; max-width: 260px;
      background: var(--f-ink); color: #fff; font: 400 13px/1.45 var(--f-font-body); text-transform: none; letter-spacing: 0;
      padding: 8px 10px; border-radius: 8px; box-shadow: 0 6px 18px rgba(0,0,0,.2);
      /* Oculto a la vista pero presente para aria-describedby */
      clip-path: inset(50%); opacity: 0; pointer-events: none;
    }
    .globo.visible { clip-path: none; opacity: 1; }
    @media (max-width: 600px) { .globo { left: auto; right: -8px; transform: none; max-width: 220px; } }
  `
})
export class InfoCampo {
  campo = input.required<CampoAyuda>();
  etiqueta = input('');
  abierto = signal(false);
  readonly id = `info-${++siguienteId}`;
  texto = computed(() => AYUDA_CAMPO[this.campo()]);

  alSalir(e: FocusEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) this.abierto.set(false);
  }
}

// Pantalla vacía: qué significa y qué hacer (el botón de acción se proyecta)
@Component({
  selector: 'f-vacio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vacio">
      <p class="vacio__t">{{ titulo() }}</p>
      @if (texto()) { <p class="vacio__d">{{ texto() }}</p> }
      <div class="vacio__acciones"><ng-content /></div>
    </div>
  `,
  styles: `
    .vacio { padding: 28px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .vacio__t { margin: 0; font-weight: 700; font-size: 16px; color: var(--f-ink); }
    .vacio__d { margin: 0; color: var(--f-text-2); font-size: 14px; max-width: 460px; line-height: 1.5; }
    .vacio__acciones { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 8px; }
    .vacio__acciones:empty { display: none; }
  `
})
export class Vacio {
  titulo = input.required<string>();
  texto = input('');
}
