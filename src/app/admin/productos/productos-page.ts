import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { Auth } from '../../services/auth/auth';
import { Avisos } from '../../shared/ui/avisos';
import { BadgeEstado } from '../../shared/ui/badge-estado';
import { Icono } from '../../shared/ui/icono';
import { TarjetaIndicador } from '../../shared/ui/tarjeta-indicador';
import { AdminApi, mensajeDeError } from '../admin-api';
import { LISTA_TIPOS, PaginaProductos, pesos, Producto, Resumen, TIPOS } from '../modelos';
import { ProductoForm } from './producto-form';

@Component({
  selector: 'app-productos-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono, BadgeEstado, TarjetaIndicador, ProductoForm],
  templateUrl: './productos-page.html',
  styleUrl: './productos-page.scss'
})
export class ProductosPage implements OnInit {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private avisos = inject(Avisos);
  auth = inject(Auth);

  readonly tipos = LISTA_TIPOS;
  readonly nombreTipo = TIPOS;
  readonly pesos = pesos;
  readonly publicUrl = environment.publicUrl;

  q = signal('');
  tipo = signal('');
  estado = signal('');
  pagina = signal(1);

  datos = signal<PaginaProductos | null>(null);
  resumen = signal<Resumen | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);
  exportando = signal(false);

  // Formulario lateral: undefined = cerrado, null = nuevo, Producto = editar/ver
  enEdicion = signal<Producto | null | undefined>(undefined);

  esKits = computed(() => this.tipo() === 'kit');
  rango = computed(() => {
    const d = this.datos();
    if (!d || !d.total) return 'Sin resultados';
    const desde = (d.pagina - 1) * d.porPagina + 1;
    return `Mostrando ${desde}–${desde + d.productos.length - 1} de ${d.total}`;
  });
  numerosPagina = computed(() => Array.from({ length: this.datos()?.paginas || 1 }, (_, i) => i + 1));

  private espera: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.espera));
  }

  ngOnInit() {
    // Los filtros viven en la URL (así "Kits" del menú es /admin/productos?tipo=kit)
    this.route.queryParamMap.subscribe((p) => {
      this.q.set(p.get('q') || '');
      this.tipo.set(p.get('tipo') || '');
      this.estado.set(p.get('estado') || '');
      this.pagina.set(Number(p.get('pagina')) || 1);
      this.cargar();
    });
    this.cargarResumen();
  }

  cargar() {
    this.cargando.set(true);
    this.api.productos({ q: this.q(), tipo: this.tipo(), estado: this.estado(), pagina: this.pagina(), porPagina: 10 }).subscribe({
      next: (d) => { this.datos.set(d); this.error.set(null); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeDeError(e, 'No se pudieron cargar los productos.')); this.cargando.set(false); }
    });
  }

  cargarResumen() {
    this.api.resumen().subscribe({ next: (r) => this.resumen.set(r), error: () => {} });
  }

  private navegar(cambios: Record<string, string | number | null>) {
    const actuales = { q: this.q(), tipo: this.tipo(), estado: this.estado(), pagina: this.pagina() };
    const query = { ...actuales, ...cambios };
    const limpio = Object.fromEntries(Object.entries(query).filter(([k, v]) => v !== '' && v !== null && !(k === 'pagina' && v === 1)));
    this.router.navigate([], { relativeTo: this.route, queryParams: limpio });
  }

  buscar(valor: string) {
    clearTimeout(this.espera);
    this.espera = setTimeout(() => this.navegar({ q: valor.trim(), pagina: 1 }), 300);
  }
  filtrarTipo(valor: string) { this.navegar({ tipo: valor, pagina: 1 }); }
  filtrarEstado(valor: string) { this.navegar({ estado: valor, pagina: 1 }); }
  irAPagina(n: number) { this.navegar({ pagina: n }); }

  equivalencias(p: Producto): string {
    if (p.tipo === 'kit') return p.kit.length ? `Incluye ${p.kit.map((c) => c.referencia).join(', ')}` : '—';
    return p.equivalencias.length ? p.equivalencias.map((e) => `${e.marca} ${e.referencia}`).join(', ') : '—';
  }

  nuevo() { this.enEdicion.set(null); }
  editar(p: Producto) { this.enEdicion.set(p); }

  alGuardar(p: Producto) {
    this.enEdicion.set(undefined);
    this.avisos.ok(`Producto ${p.referencia} guardado${p.publicado ? ' y publicado' : ' como borrador'}.`);
    this.cargar();
    this.cargarResumen();
  }

  eliminar(p: Producto) {
    if (!confirm(`¿Eliminar el producto ${p.referencia}? Esta acción no se puede deshacer.`)) return;
    this.api.eliminarProducto(p.uid).subscribe({
      next: () => { this.avisos.ok(`Producto ${p.referencia} eliminado.`); this.cargar(); this.cargarResumen(); },
      error: (e) => this.avisos.error(mensajeDeError(e, 'No se pudo eliminar el producto.'))
    });
  }

  exportarPdf() {
    this.exportando.set(true);
    this.api.catalogoPdf().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo-filtramos.pdf';
        a.click();
        URL.revokeObjectURL(url);
        this.exportando.set(false);
      },
      error: () => { this.exportando.set(false); this.avisos.error('No se pudo generar el catálogo PDF.'); }
    });
  }
}
