import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avisos } from '../../shared/ui/avisos';
import { Icono } from '../../shared/ui/icono';
import { AdminApi, mensajeDeError } from '../admin-api';
import { AnalisisImportacion, descargar, ResultadoImportacion } from '../modelos';

type Paso = 1 | 2 | 3 | 4;

// Asistente de importación (Importar.png): subir -> asociar columnas -> revisar -> confirmar.
// La asociación es manual. Solo se proponen columnas con el encabezado exacto de la plantilla
// oficial o la asociación usada la vez anterior. Las sugerencias por nombre esperan el Excel real.
@Component({
  selector: 'app-importar-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icono],
  templateUrl: './importar-page.html',
  styleUrl: './importar-page.scss'
})
export class ImportarPage {
  private api = inject(AdminApi);
  private avisos = inject(Avisos);

  readonly pasos = ['Subir archivo', 'Asociar columnas', 'Revisar', 'Confirmar'];

  paso = signal<Paso>(1);
  archivo = signal<File | null>(null);
  analisis = signal<AnalisisImportacion | null>(null);
  asociacion = signal<Record<string, string>>({});
  previa = signal<AnalisisImportacion | null>(null);
  omitirErrores = signal(true);
  cargando = signal(false);
  calculando = signal(false);
  error = signal<string | null>(null);
  errorPrevia = signal<string | null>(null);
  resultado = signal<ResultadoImportacion | null>(null);

  referenciaAsociada = computed(() => Object.values(this.asociacion()).includes('referencia'));
  camposUsados = computed(() => new Set(Object.values(this.asociacion()).filter(Boolean)));
  resumen = computed(() => this.previa()?.resumen);
  puedeContinuar = computed(() => {
    const r = this.resumen();
    return !!r && !this.calculando() && !this.errorPrevia() && (r.nuevos + r.actualizan) > 0 && (r.conErrores === 0 || this.omitirErrores());
  });
  filaEjemplo = computed(() => (this.analisis()?.filaEncabezados || 1) + 1);

  private espera: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.espera));
  }

  descargarPlantilla() {
    this.api.plantilla().subscribe({
      next: (b) => descargar(b, 'plantilla-productos-filtramos.xlsx'),
      error: () => this.avisos.error('No se pudo descargar la plantilla.')
    });
  }

  // ---- Paso 1
  elegirArchivo(input: HTMLInputElement) {
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.xlsx')) { this.error.set('Elija un archivo de Excel .xlsx. Si es .xls, ábralo en Excel y guárdelo como .xlsx.'); return; }
    if (f.size > 10 * 1024 * 1024) { this.error.set('El archivo supera 10 MB.'); return; }
    this.archivo.set(f);
    this.analizar({});
  }

  // ---- Paso 2: hoja y fila de encabezados cambian las columnas
  private analizar(o: { hoja?: string; filaEncabezados?: number }) {
    const f = this.archivo();
    if (!f) return;
    this.cargando.set(true);
    this.error.set(null);
    this.api.analizarImportacion(f, o).subscribe({
      next: (a) => {
        this.cargando.set(false);
        this.analisis.set(a);
        this.asociacion.set({ ...a.asociacion });
        this.previa.set(null);
        this.paso.set(2);
        this.calcularPrevia();
      },
      error: (e) => { this.cargando.set(false); this.error.set(mensajeDeError(e, 'No se pudo leer el archivo.')); }
    });
  }
  cambiarHoja(hoja: string) { this.analizar({ hoja }); }
  cambiarFilaEncabezados(valor: string) {
    const n = Number(valor);
    if (Number.isInteger(n) && n >= 1) this.analizar({ hoja: this.analisis()?.hoja, filaEncabezados: n });
  }

  asociar(indice: number, campo: string) {
    this.asociacion.update((a) => {
      const nueva = { ...a };
      // Un campo solo puede estar en una columna: se quita de la anterior
      if (campo) for (const k of Object.keys(nueva)) if (nueva[k] === campo) delete nueva[k];
      if (campo) nueva[indice] = campo; else delete nueva[indice];
      return nueva;
    });
    clearTimeout(this.espera);
    this.espera = setTimeout(() => this.calcularPrevia(), 350);
  }

  origenDe(indice: number): string {
    const o = this.analisis()?.origen?.[indice];
    return o === 'plantilla' ? 'Plantilla oficial' : o === 'guardada' ? 'Como la vez pasada' : '';
  }

  ejemplo(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    const s = String(v);
    return s.length > 40 ? `${s.slice(0, 40)}…` : s;
  }

  private calcularPrevia() {
    const f = this.archivo();
    const a = this.analisis();
    if (!f || !a) return;
    this.errorPrevia.set(null);
    if (!this.referenciaAsociada()) { this.previa.set(null); return; }
    this.calculando.set(true);
    this.api.analizarImportacion(f, { hoja: a.hoja, filaEncabezados: a.filaEncabezados, asociacion: this.asociacion() }).subscribe({
      next: (p) => { this.previa.set(p); this.calculando.set(false); },
      error: (e) => { this.calculando.set(false); this.previa.set(null); this.errorPrevia.set(mensajeDeError(e)); }
    });
  }

  descargarErrores() {
    const f = this.archivo();
    const a = this.analisis();
    if (!f || !a) return;
    this.api.erroresImportacion(f, { hoja: a.hoja, filaEncabezados: a.filaEncabezados, asociacion: this.asociacion() }).subscribe({
      next: (b) => descargar(b, 'filas-con-errores.xlsx'),
      error: () => this.avisos.error('No se pudo generar el Excel de errores.')
    });
  }

  // ---- Pasos 3 y 4
  irARevisar() { if (this.puedeContinuar()) this.paso.set(3); }

  confirmar() {
    const f = this.archivo();
    const a = this.analisis();
    if (!f || !a) return;
    this.cargando.set(true);
    this.error.set(null);
    this.api.confirmarImportacion(f, { hoja: a.hoja, filaEncabezados: a.filaEncabezados, asociacion: this.asociacion(), omitirErrores: this.omitirErrores() }).subscribe({
      next: (r) => { this.cargando.set(false); this.resultado.set(r); this.paso.set(4); },
      error: (e) => { this.cargando.set(false); this.error.set(mensajeDeError(e, 'No se pudo completar la importación. No se guardó nada.')); }
    });
  }

  reiniciar() {
    this.paso.set(1);
    this.archivo.set(null);
    this.analisis.set(null);
    this.previa.set(null);
    this.asociacion.set({});
    this.resultado.set(null);
    this.error.set(null);
  }
}
