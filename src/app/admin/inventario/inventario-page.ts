import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Avisos } from '../../shared/ui/avisos';
import { BadgeDisponibilidad } from '../../shared/ui/badge-disponibilidad';
import { TarjetaIndicador } from '../../shared/ui/tarjeta-indicador';
import { AdminApi, mensajeDeError } from '../admin-api';
import { FilaInventario, IndicadoresInventario, Movimiento, MOTIVOS_MANUALES, NOMBRE_MOTIVO, TIPOS } from '../modelos';
import { ListaMovimientos } from './lista-movimientos';

type TipoManual = 'entrada' | 'salida' | 'ajuste';

@Component({
  selector: 'app-inventario-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, TarjetaIndicador, BadgeDisponibilidad, ListaMovimientos],
  templateUrl: './inventario-page.html',
  styleUrl: './inventario-page.scss'
})
export class InventarioPage implements OnInit {
  private api = inject(AdminApi);
  private fb = inject(FormBuilder);
  private avisos = inject(Avisos);
  auth = inject(Auth);

  readonly nombreTipo = TIPOS;
  readonly nombreMotivo = NOMBRE_MOTIVO;
  readonly tiposMovimiento: { valor: TipoManual; nombre: string }[] = [
    { valor: 'entrada', nombre: 'Entrada' }, { valor: 'salida', nombre: 'Salida' }, { valor: 'ajuste', nombre: 'Ajuste' }
  ];

  filas = signal<FilaInventario[]>([]);
  indicadores = signal<IndicadoresInventario | null>(null);
  recientes = signal<Movimiento[]>([]);
  q = signal('');
  soloBajo = signal(false);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  errorForm = signal<string | null>(null);

  tipoMov = signal<TipoManual>('entrada');
  motivos = computed(() => MOTIVOS_MANUALES[this.tipoMov()]);
  puedeRegistrar = computed(() => ['admin', 'bodega'].includes(this.auth.usuario()?.rol || ''));
  // Referencias para el autocompletado (los kits no tienen stock propio)
  referencias = computed(() => this.filas().filter((f) => !f.esKit).map((f) => f.referencia));

  form = this.fb.nonNullable.group({
    referencia: ['', Validators.required],
    cantidad: [null as number | null],
    motivo: ['produccion', Validators.required],
    nota: ['']
  });

  private espera: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.espera));
  }

  ngOnInit() {
    this.cargar();
    this.cargarRecientes();
  }

  cargar() {
    this.api.inventario({ q: this.q(), soloBajoMinimo: this.soloBajo() }).subscribe({
      next: (r) => { this.filas.set(r.productos); this.indicadores.set(r.indicadores); this.cargando.set(false); this.error.set(null); },
      error: (e) => { this.error.set(mensajeDeError(e, 'No se pudo cargar el inventario.')); this.cargando.set(false); }
    });
  }

  cargarRecientes() {
    this.api.movimientos({ porPagina: 6 }).subscribe({ next: (r) => this.recientes.set(r.movimientos), error: () => {} });
  }

  buscar(valor: string) {
    clearTimeout(this.espera);
    this.espera = setTimeout(() => { this.q.set(valor.trim()); this.cargar(); }, 300);
  }
  alternarBajo(valor: boolean) { this.soloBajo.set(valor); this.cargar(); }

  elegirTipo(tipo: TipoManual) {
    this.tipoMov.set(tipo);
    this.form.patchValue({ motivo: MOTIVOS_MANUALES[tipo][0], cantidad: null });
    this.errorForm.set(null);
  }

  // Flechas izquierda/derecha entre los botones del grupo (patrón de radiogroup)
  teclaTipo(evento: KeyboardEvent, i: number) {
    if (!['ArrowLeft', 'ArrowRight'].includes(evento.key)) return;
    evento.preventDefault();
    const n = this.tiposMovimiento.length;
    const siguiente = this.tiposMovimiento[(i + (evento.key === 'ArrowRight' ? 1 : n - 1)) % n];
    this.elegirTipo(siguiente.valor);
    (evento.currentTarget as HTMLElement).parentElement?.querySelectorAll('button')[this.tiposMovimiento.indexOf(siguiente)]?.focus();
  }

  usarReferencia(f: FilaInventario) {
    if (f.esKit || !this.puedeRegistrar()) return;
    this.form.patchValue({ referencia: f.referencia });
  }

  guardar() {
    const v = this.form.getRawValue();
    const cantidad = v.cantidad === null || (v.cantidad as unknown) === '' ? null : Number(v.cantidad);
    if (!v.referencia.trim()) { this.errorForm.set('Escriba la referencia.'); return; }
    if (cantidad === null || !Number.isInteger(cantidad) || cantidad < (this.tipoMov() === 'ajuste' ? 0 : 1)) {
      this.errorForm.set(this.tipoMov() === 'ajuste' ? 'Escriba el stock contado (entero, 0 o más).' : 'Escriba una cantidad entera mayor que 0.');
      return;
    }
    this.guardando.set(true);
    this.errorForm.set(null);
    const datos = {
      referencia: v.referencia.trim(), tipo: this.tipoMov(), motivo: v.motivo, nota: v.nota.trim() || undefined,
      ...(this.tipoMov() === 'ajuste' ? { stockContado: cantidad } : { cantidad })
    };
    this.api.registrarMovimiento(datos).subscribe({
      next: (m) => {
        this.guardando.set(false);
        this.form.patchValue({ cantidad: null, nota: '' });
        const signo = m.cantidad > 0 ? `+${m.cantidad}` : `${m.cantidad}`;
        this.avisos.ok(`${m.referencia}: ${signo}. Stock actual: ${m.stockResultante}.`);
        this.cargar();
        this.cargarRecientes();
      },
      error: (e) => { this.guardando.set(false); this.errorForm.set(mensajeDeError(e, 'No se pudo registrar el movimiento.')); }
    });
  }
}
