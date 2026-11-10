import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnInit, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BadgeEstado } from '../../shared/ui/badge-estado';
import { Icono } from '../../shared/ui/icono';
import { AdminApi, mensajeDeError } from '../admin-api';
import { Imagen, LISTA_TIPOS, MOTIVOS, motivosDeBorrador, Producto } from '../modelos';

const NUMEROS = ['diametroExterno', 'diametroInterno', 'alto', 'alturaPliegue', 'cortePapel', 'cantidadPliegues'] as const;
const TEXTOS = ['descripcion', 'codigoSiigo', 'intervaloCambio', 'malla', 'longitudMallaExterna', 'longitudMallaInterna', 'poliuretano', 'anillo', 'tapa'] as const;

const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));
const lineas = (v: string) => String(v || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);

@Component({
  selector: 'app-producto-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icono, BadgeEstado, RouterLink],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.scss',
  host: { '(document:keydown.escape)': 'cerrar.emit()' }
})
export class ProductoForm implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(AdminApi);

  producto = input<Producto | null>(null);
  tipoInicial = input('');
  soloLectura = input(false);
  guardado = output<Producto>();
  cerrar = output<void>();

  readonly tipos = LISTA_TIPOS;
  readonly publicUrl = environment.publicUrl;
  readonly fichaNumerica = [
    { clave: 'diametroExterno', etiqueta: 'Diámetro externo (mm)' },
    { clave: 'diametroInterno', etiqueta: 'Diámetro interno (mm)' },
    { clave: 'alto', etiqueta: 'Alto (mm)' },
    { clave: 'alturaPliegue', etiqueta: 'Altura de pliegue (mm)' },
    { clave: 'cortePapel', etiqueta: 'Corte de papel (mm)' },
    { clave: 'cantidadPliegues', etiqueta: 'Cantidad de pliegues' }
  ];
  readonly fichaTexto = [
    { clave: 'malla', etiqueta: 'Malla' },
    { clave: 'longitudMallaExterna', etiqueta: 'Longitud malla externa' },
    { clave: 'longitudMallaInterna', etiqueta: 'Longitud malla interna' },
    { clave: 'poliuretano', etiqueta: 'Poliuretano' },
    { clave: 'anillo', etiqueta: 'Anillo' },
    { clave: 'tapa', etiqueta: 'Tapa' }
  ];

  guardando = signal(false);
  error = signal<string | null>(null);
  biblioteca = signal<Imagen[]>([]);
  eligiendoFotos = signal(false);
  opcionesKit = signal<{ uid: string; referencia: string }[]>([]);

  private primerCampo = viewChild<ElementRef<HTMLInputElement>>('primerCampo');

  form: FormGroup = this.fb.group({
    referencia: ['', [Validators.required, Validators.maxLength(60)]],
    tipo: [''],
    descripcion: [''],
    codigoSiigo: [''],
    intervaloCambio: [''],
    precioPublico: [null as number | null, Validators.min(0)],
    precioDistribuidor: [null as number | null, Validators.min(0)],
    volumen: this.fb.array([]),
    equivalencias: this.fb.array([]),
    kit: this.fb.array([]),
    aplicaciones: [''],
    papeles: [''],
    imagesUrl: [[] as string[]],
    publicar: [true],
    stockMinimo: [0, [Validators.min(0)]],
    ...Object.fromEntries(NUMEROS.map((c) => [c, [null as number | null, Validators.min(0)]])),
    ...Object.fromEntries(TEXTOS.filter((c) => !['descripcion', 'codigoSiigo', 'intervaloCambio'].includes(c)).map((c) => [c, ['']]))
  });

  get volumen() { return this.form.get('volumen') as FormArray<FormGroup>; }
  get equivalencias() { return this.form.get('equivalencias') as FormArray<FormGroup>; }
  get kit() { return this.form.get('kit') as FormArray<FormGroup>; }

  private valor = toSignal(this.form.valueChanges.pipe(startWith(null)));
  fotos = computed(() => { this.valor(); return (this.form.get('imagesUrl')!.value as string[]) || []; });
  esKit = computed(() => { this.valor(); return this.form.get('tipo')!.value === 'kit'; });
  motivos = computed(() => { this.valor(); return motivosDeBorrador(this.armar()); });
  fotosDisponibles = computed(() => this.biblioteca().filter((i) => !this.fotos().includes(i.imagen)));
  titulo = computed(() => {
    const p = this.producto();
    if (!p) return this.tipoInicial() === 'kit' ? 'Nuevo kit' : 'Nuevo producto';
    return `${this.soloLectura() ? 'Producto' : 'Editar'} ${p.referencia}`;
  });

  ngOnInit() {
    const p = this.producto();
    if (p) this.cargar(p);
    else if (this.tipoInicial()) this.form.patchValue({ tipo: this.tipoInicial() });
    if (this.soloLectura()) this.form.disable();

    this.api.imagenes().subscribe({ next: (l) => this.biblioteca.set(l), error: () => {} });
    this.api.opcionesKit().subscribe({
      next: (l) => this.opcionesKit.set(l.filter((o) => o.uid !== p?.uid)),
      error: () => {}
    });
    setTimeout(() => this.primerCampo()?.nativeElement.focus());
  }

  private cargar(p: Producto) {
    this.form.patchValue({
      referencia: p.referencia,
      tipo: p.tipo || '',
      precioPublico: p.precios?.publico ?? null,
      precioDistribuidor: p.precios?.distribuidor ?? null,
      aplicaciones: (p.aplicaciones || []).join('\n'),
      papeles: (p.papeles || []).join(', '),
      imagesUrl: [...(p.imagesUrl || [])],
      publicar: p.publicar !== false,
      stockMinimo: p.stockMinimo ?? 0,
      ...Object.fromEntries(NUMEROS.map((c) => [c, p[c] ?? null])),
      ...Object.fromEntries(TEXTOS.map((c) => [c, p[c] ?? '']))
    });
    (p.precios?.volumen || []).forEach((t) => this.agregarTramo(t.desde, t.precio));
    (p.equivalencias || []).forEach((e) => this.agregarEquivalencia(e.marca, e.referencia));
    (p.kit || []).forEach((c) => this.agregarComponente(c.producto, c.cantidad));
  }

  // ---- Listas repetibles
  agregarTramo(desde: number | null = null, precio: number | null = null) {
    this.volumen.push(this.fb.group({ desde: [desde, [Validators.required, Validators.min(2)]], precio: [precio, [Validators.required, Validators.min(0)]] }));
  }
  agregarEquivalencia(marca = '', referencia = '') {
    this.equivalencias.push(this.fb.group({ marca: [marca, Validators.required], referencia: [referencia, Validators.required] }));
  }
  agregarComponente(producto = '', cantidad = 1) {
    this.kit.push(this.fb.group({ producto: [producto, Validators.required], cantidad: [cantidad, [Validators.required, Validators.min(1)]] }));
  }
  quitar(lista: FormArray, i: number) { lista.removeAt(i); }

  // ---- Fotos
  agregarFoto(url: string) {
    this.form.patchValue({ imagesUrl: [...this.fotos(), url] });
    if (!this.fotosDisponibles().length) this.eligiendoFotos.set(false);
  }
  quitarFoto(url: string) { this.form.patchValue({ imagesUrl: this.fotos().filter((u) => u !== url) }); }
  moverFoto(i: number, paso: number) {
    const lista = [...this.fotos()];
    const j = i + paso;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.form.patchValue({ imagesUrl: lista });
  }

  // Cuerpo para la API: vacío = null (la API lo borra)
  armar(): Partial<Producto> & Record<string, unknown> {
    const v = this.form.getRawValue();
    const datos: Record<string, unknown> = {
      referencia: String(v.referencia || '').trim(),
      tipo: v.tipo || null,
      precios: {
        publico: num(v.precioPublico),
        distribuidor: num(v.precioDistribuidor),
        volumen: (v.volumen || []).filter((t: any) => t.desde !== null || t.precio !== null).map((t: any) => ({ desde: num(t.desde), precio: num(t.precio) }))
      },
      equivalencias: (v.equivalencias || []).map((e: any) => ({ marca: String(e.marca || '').trim(), referencia: String(e.referencia || '').trim() }))
        .filter((e: any) => e.marca || e.referencia),
      kit: v.tipo === 'kit' ? (v.kit || []).filter((c: any) => c.producto).map((c: any) => ({ producto: c.producto, cantidad: num(c.cantidad) || 1 })) : [],
      aplicaciones: lineas(v.aplicaciones),
      papeles: lineas(v.papeles),
      imagesUrl: v.imagesUrl || [],
      publicar: !!v.publicar,
      stockMinimo: num(v.stockMinimo) ?? 0
    };
    for (const c of NUMEROS) datos[c] = num(v[c]);
    for (const c of TEXTOS) datos[c] = String(v[c] || '').trim() || null;
    return datos as any;
  }

  textoMotivos(m: string[]) { return m.map((x) => MOTIVOS[x]).join(', '); }

  guardar() {
    if (this.soloLectura()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Revise los campos marcados.');
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    const datos = this.armar();
    const p = this.producto();
    const peticion = p ? this.api.actualizarProducto(p.uid, datos) : this.api.crearProducto(datos);
    peticion.subscribe({
      next: (guardado) => { this.guardando.set(false); this.guardado.emit(guardado); },
      error: (e) => { this.guardando.set(false); this.error.set(mensajeDeError(e, 'No se pudo guardar el producto.')); }
    });
  }

  invalido(ruta: string) {
    const c = this.form.get(ruta);
    return !!c && c.invalid && c.touched;
  }
}
