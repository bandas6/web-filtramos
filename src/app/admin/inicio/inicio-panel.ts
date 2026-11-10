import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Icono } from '../../shared/ui/icono';
import { AdminApi, mensajeDeError } from '../admin-api';
import { AyudaSeccion } from '../ayuda/componentes';
import { PRIMEROS_PASOS, SIGUIENTE_PASO } from '../ayuda/textos';
import { InicioPanel } from '../modelos';

// Inicio del panel: "Primeros pasos" (solo administrador) y avisos del día según el rol.
@Component({
  selector: 'app-inicio-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icono, AyudaSeccion],
  template: `
    <header class="cab">
      <h1>Hola{{ nombre() ? ', ' + nombre() : '' }}</h1>
      <p class="nota">{{ fecha }}</p>
    </header>

    <f-ayuda seccion="inicio" />

    @if (error()) { <div class="alerta" role="alert">{{ error() }} <button type="button" class="btn btn--enlace" (click)="cargar()">Reintentar</button></div> }

    @if (auth.esAdmin() && datos() && !pasosCompletos()) {
      <section class="tarjeta pasos" aria-labelledby="pasos-t">
        <div class="pasos__cab">
          <h2 id="pasos-t">Primeros pasos</h2>
          <span class="pasos__avance">{{ resueltos() }} de {{ pasos().length }}</span>
        </div>
        <div class="barra" role="progressbar" aria-label="Avance de los primeros pasos" aria-valuemin="0"
             [attr.aria-valuemax]="pasos().length" [attr.aria-valuenow]="resueltos()">
          <div class="barra__relleno" [style.width.%]="(resueltos() / pasos().length) * 100"></div>
        </div>
        <ol class="pasos__lista">
          @for (p of pasos(); track p.clave) {
            <li class="paso" [class.paso--hecho]="p.hecho" [class.paso--na]="p.noAplica && !p.hecho">
              <span class="paso__marca" aria-hidden="true">
                @if (p.hecho) { <f-icono nombre="check" [tam]="16" [grosor]="2.6" /> } @else if (p.noAplica) { – }
              </span>
              <div class="paso__texto">
                <b>{{ p.titulo }}</b>
                <span>{{ p.hecho ? 'Listo.' : p.noAplica ? 'Marcado como "no aplica".' : p.detalle }}</span>
              </div>
              @if (!p.hecho) {
                <div class="paso__acciones">
                  @if (!p.noAplica) {
                    <a class="btn btn--verde" [routerLink]="p.enlace" [queryParams]="p.clave === 'borradores' ? { estado: 'borrador' } : null">{{ p.accion }}</a>
                    <button type="button" class="btn btn--enlace" (click)="noAplica(p.clave, true)" [attr.aria-label]="'No aplica: ' + p.titulo">No aplica</button>
                  } @else {
                    <button type="button" class="btn btn--enlace" (click)="noAplica(p.clave, false)" [attr.aria-label]="'Deshacer: ' + p.titulo">Deshacer</button>
                  }
                </div>
              }
            </li>
          }
        </ol>
      </section>
    }

    <h2 class="titulo-avisos">Avisos de hoy</h2>
    @if (datos(); as d) {
      @if (!hayAvisos()) {
        <p class="tarjeta al-dia"><f-icono nombre="check" [tam]="18" [grosor]="2.4" /> Todo al día. No hay nada pendiente.</p>
      }
      <div class="avisos-dia">
        @if (ve('cotizaciones') && (d.avisos.pedidosNuevos || d.avisos.medidaNuevas)) {
          <section class="tarjeta aviso-dia" aria-labelledby="av-cot">
            <h3 id="av-cot"><f-icono nombre="cotizaciones" />Cotizaciones nuevas</h3>
            <p class="aviso-dia__num">{{ d.avisos.pedidosNuevos + d.avisos.medidaNuevas }}</p>
            <p class="nota">{{ d.avisos.pedidosNuevos }} {{ d.avisos.pedidosNuevos === 1 ? 'pedido' : 'pedidos' }} · {{ d.avisos.medidaNuevas }} a medida</p>
            <a class="btn" routerLink="/admin/cotizaciones">Responder</a>
          </section>
        }
        @if (ve('inventario') && d.avisos.stockBajo.total) {
          <section class="tarjeta aviso-dia" aria-labelledby="av-stock">
            <h3 id="av-stock"><f-icono nombre="aviso" />Stock bajo el mínimo <span class="badge badge--aviso">{{ d.avisos.stockBajo.total }}</span></h3>
            <ul class="aviso-dia__lista">
              @for (i of d.avisos.stockBajo.items; track i.uid) {
                <li><span class="mono">{{ i.referencia }}</span><span>{{ i.disponible <= 0 ? 'En cero' : 'Quedan ' + i.disponible }}@if (i.minimo) { <span class="muted"> · mín. {{ i.minimo }}</span> }</span></li>
              }
            </ul>
            <a class="btn" routerLink="/admin/inventario">Ver inventario</a>
          </section>
        }
        @if (auth.esAdmin() && d.avisos.borradores.total) {
          <section class="tarjeta aviso-dia" aria-labelledby="av-borr">
            <h3 id="av-borr"><f-icono nombre="productos" />No se ven en la web <span class="badge badge--aviso">{{ d.avisos.borradores.total }}</span></h3>
            <ul class="aviso-dia__lista">
              @for (b of d.avisos.borradores.items; track b.uid) {
                <li>
                  <span class="mono">{{ b.referencia }}</span>
                  @if (b.motivos[0]; as m) {
                    <a [routerLink]="'/admin/productos'" [queryParams]="{ editar: b.uid, campo: siguiente(m.clave).campo }">{{ siguiente(m.clave).texto }}<span class="sr-only"> a {{ b.referencia }}</span></a>
                  }
                </li>
              }
            </ul>
            <a class="btn" routerLink="/admin/productos" [queryParams]="{ estado: 'borrador' }">Ver todos los borradores</a>
          </section>
        }
      </div>
    } @else if (!error()) {
      <p class="nota" aria-busy="true">Cargando…</p>
    }
  `,
  styles: `
    .cab { margin-bottom: 16px; h1 { font-size: 30px; } .nota { margin: 4px 0 0; } }
    .nota { color: var(--f-muted); font-size: 14px; margin: 0; }
    .pasos { padding: 20px; margin-bottom: 28px; }
    .pasos__cab { display: flex; justify-content: space-between; align-items: baseline; h2 { font-size: 20px; } }
    .pasos__avance { font-weight: 700; color: var(--f-green-dark); }
    .barra { height: 8px; border-radius: 4px; background: var(--f-line-soft); margin: 10px 0 8px; overflow: hidden; }
    .barra__relleno { height: 100%; background: var(--f-green); border-radius: 4px; transition: width .3s; }
    .pasos__lista { list-style: none; margin: 0; padding: 0; }
    .paso { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-top: 1px solid var(--f-line-soft); flex-wrap: wrap; }
    .paso:first-child { border-top: none; }
    .paso__marca { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--f-control); flex: none; display: flex; align-items: center; justify-content: center; color: var(--f-muted); font-weight: 700; }
    .paso--hecho .paso__marca { background: var(--f-green); border-color: var(--f-green); color: #fff; }
    .paso--hecho .paso__texto b, .paso--na .paso__texto b { color: var(--f-muted); }
    .paso__texto { flex: 1 1 240px; min-width: 0; display: flex; flex-direction: column; span { font-size: 14px; color: var(--f-text-2); } }
    .paso__acciones { display: flex; align-items: center; gap: 4px; margin-left: auto; }
    .titulo-avisos { font-size: 20px; margin-bottom: 12px; }
    .al-dia { padding: 16px 18px; display: flex; align-items: center; gap: 10px; margin: 0 0 12px; color: var(--f-green-dark); font-weight: 600; }
    .avisos-dia { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; align-items: start; }
    .aviso-dia { padding: 18px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start;
      h3 { font-family: var(--f-font-body); font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; margin: 0; f-icono { color: var(--f-green); } } }
    .aviso-dia__num { margin: 0; font-family: var(--f-font-display); font-size: 36px; font-weight: 700; line-height: 1; }
    .aviso-dia__lista { list-style: none; margin: 0; padding: 0; width: 100%; font-size: 14px;
      li { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--f-line-soft); } }
    .muted { color: var(--f-muted); }
    @media (max-width: 600px) { .paso__acciones { margin-left: 38px; } }
  `
})
export class InicioPanelPage implements OnInit {
  private api = inject(AdminApi);
  auth = inject(Auth);

  datos = signal<InicioPanel | null>(null);
  error = signal<string | null>(null);
  readonly fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  nombre = computed(() => (this.auth.usuario()?.nombre || '').split(' ')[0]);
  // "No aplica" sale de las preferencias del usuario (se actualiza al instante al marcarlo)
  pasos = computed(() => (this.datos()?.pasos || []).map((p) => ({
    ...p, ...PRIMEROS_PASOS[p.clave], noAplica: this.auth.preferencias().pasosNoAplica.includes(p.clave)
  })));
  resueltos = computed(() => this.pasos().filter((p) => p.hecho || p.noAplica).length);
  pasosCompletos = computed(() => this.pasos().length > 0 && this.resueltos() === this.pasos().length);
  hayAvisos = computed(() => {
    const a = this.datos()?.avisos;
    if (!a) return false;
    return (this.ve('cotizaciones') && a.pedidosNuevos + a.medidaNuevas > 0)
      || (this.ve('inventario') && a.stockBajo.total > 0)
      || (this.auth.esAdmin() && a.borradores.total > 0);
  });

  ngOnInit() { this.cargar(); }

  cargar() {
    this.error.set(null);
    this.api.inicio().subscribe({
      next: (d) => this.datos.set(d),
      error: (e) => this.error.set(mensajeDeError(e, 'No se pudo cargar el inicio.'))
    });
  }

  // Bodega ve inventario; ventas ve cotizaciones; el administrador, todo
  ve(area: 'cotizaciones' | 'inventario') {
    const rol = this.auth.usuario()?.rol;
    return rol === 'admin' || (area === 'inventario' ? rol === 'bodega' : rol === 'ventas');
  }

  siguiente(motivo: string) { return SIGUIENTE_PASO[motivo] || { texto: 'Completar', campo: 'pf-ref' }; }

  noAplica(clave: string, marcar: boolean) {
    const actual = this.auth.preferencias().pasosNoAplica;
    this.auth.guardarPreferencias({ pasosNoAplica: marcar ? [...actual, clave] : actual.filter((c) => c !== clave) });
  }
}

