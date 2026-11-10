import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LISTA_TIPOS } from '../../admin/modelos';
import { TarjetaProductoComponent } from '../componentes/tarjeta-producto';
import { Seo } from '../seo';
import { Busqueda, SitioApi, TarjetaProducto } from '../sitio-api';

@Component({
  selector: 'app-catalogo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TarjetaProductoComponent],
  template: `
    <section class="contenedor catalogo">
      <h1>{{ titulo() }}</h1>
      <form class="filtros" role="search" aria-label="Buscar en el catálogo" #f (submit)="buscar($event, f)">
        <div class="field filtros__q">
          <label for="c-q">Referencia o equivalencia</label>
          <input id="c-q" name="q" type="search" [value]="filtro().q || ''" placeholder="Ej.: P181052" />
        </div>
        <div class="field">
          <label for="c-maq">Máquina</label>
          <input id="c-maq" name="maquina" type="search" [value]="filtro().maquina || ''" />
        </div>
        <div class="field filtros__num">
          <label for="c-diam">Ø ext. (mm)</label>
          <input id="c-diam" name="diamExt" type="number" min="1" inputmode="decimal" [value]="filtro().diamExt || ''" />
        </div>
        <div class="field filtros__num">
          <label for="c-alto">Alto (mm)</label>
          <input id="c-alto" name="alto" type="number" min="1" inputmode="decimal" [value]="filtro().alto || ''" />
        </div>
        <div class="field">
          <label for="c-tipo">Tipo</label>
          <select id="c-tipo" name="tipo">
            <option value="">Todos</option>
            @for (t of tipos; track t.valor) { <option [value]="t.valor" [selected]="t.valor === filtro().tipo">{{ t.nombre }}</option> }
          </select>
        </div>
        <button type="submit" class="btn btn--verde filtros__btn">Buscar</button>
      </form>

      <p class="resultado" role="status">
        @if (cargando()) { Buscando… } @else { {{ total() }} {{ total() === 1 ? 'resultado' : 'resultados' }} }
      </p>

      <h2 class="sr-only">Resultados</h2>
      <div class="rejilla">
        @for (p of productos(); track p.slug) { <app-tarjeta-producto [p]="p" /> }
      </div>

      @if (!cargando() && !productos().length) {
        <div class="vacio">
          <h2>No encontramos coincidencias</h2>
          <p>Revise la referencia o pruebe con la máquina o las medidas. Si no aparece, lo fabricamos a la medida.</p>
          <a routerLink="/" fragment="medida" class="btn btn--oscuro">Pedir fabricación a medida</a>
        </div>
      }

      @if (paginas() > 1) {
        <nav class="paginas" aria-label="Páginas de resultados">
          @for (n of numeros(); track n) {
            <a [routerLink]="[]" [queryParams]="{ pagina: n }" queryParamsHandling="merge" [attr.aria-current]="n === pagina() ? 'page' : null">{{ n }}</a>
          }
        </nav>
      }
    </section>
  `,
  styles: `
    .catalogo { padding-top: 40px; padding-bottom: 72px; display: flex; flex-direction: column; gap: 20px; }
    h1 { font-size: 40px; }
    .filtros { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; background: #fff; border: 1px solid var(--f-line); border-radius: var(--f-radio-tarjeta); padding: 16px; }
    .filtros .field { flex: 1 1 160px; }
    .filtros__q { flex: 2 1 240px !important; }
    .filtros__num { flex: 0 1 120px !important; }
    .filtros__btn { min-height: 44px; }
    .resultado { margin: 0; color: var(--f-muted); }
    .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
    .vacio { background: #fff; border: 1px solid var(--f-line); border-radius: var(--f-radio-tarjeta); padding: 28px; h2 { font-size: 24px; } p { color: var(--f-text-2); } }
    .paginas { justify-content: center; a { min-width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--f-line); border-radius: 6px; background: #fff; color: var(--f-ink); text-decoration: none; font-weight: 600; }
      a[aria-current='page'] { background: var(--f-ink); color: #fff; } }
    @media (max-width: 760px) {
      .catalogo { padding-top: 24px; }
      h1 { font-size: 28px; }
      .rejilla { grid-template-columns: minmax(0, 1fr); gap: 12px; }
      .filtros__btn { flex: 1 1 100%; }
    }
  `
})
export class CatalogoPage implements OnInit {
  private api = inject(SitioApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(Seo);
  readonly tipos = LISTA_TIPOS;

  filtro = signal<Busqueda>({});
  productos = signal<TarjetaProducto[]>([]);
  total = signal(0);
  pagina = signal(1);
  paginas = signal(1);
  cargando = signal(true);
  numeros = computed(() => Array.from({ length: Math.min(this.paginas(), 30) }, (_, i) => i + 1));
  titulo = computed(() => {
    const f = this.filtro();
    if (f.q) return `Resultados para “${f.q}”`;
    if (f.tipo === 'kit') return 'Kits de mantenimiento';
    const t = this.tipos.find((x) => x.valor === f.tipo);
    return t ? `Filtros: ${t.nombre}` : 'Catálogo';
  });

  ngOnInit() {
    this.route.queryParamMap.subscribe((q) => {
      const f: Busqueda = {};
      for (const k of ['q', 'maquina', 'diamExt', 'alto', 'tipo'] as const) if (q.get(k)) f[k] = q.get(k)!;
      f.pagina = Number(q.get('pagina')) || 1;
      this.filtro.set(f);
      this.cargando.set(true);
      this.api.buscar(f).subscribe({
        next: (r) => { this.productos.set(r.productos); this.total.set(r.total); this.pagina.set(r.pagina); this.paginas.set(r.paginas); this.cargando.set(false); },
        error: () => { this.productos.set([]); this.total.set(0); this.cargando.set(false); }
      });
      const filtrado = Object.keys(f).some((k) => k !== 'pagina' && k !== 'tipo');
      this.seo.pagina({
        titulo: `${this.titulo()} · Filtramos`,
        descripcion: 'Catálogo de filtros de aire Filtramos: busque por referencia, equivalencia, máquina o medidas.',
        ruta: f.tipo && !filtrado ? `/catalogo?tipo=${f.tipo}` : '/catalogo',
        indexar: !filtrado
      });
    });
  }

  buscar(e: Event, form: HTMLFormElement) {
    e.preventDefault();
    const q: Record<string, string> = {};
    for (const [k, v] of new FormData(form).entries()) if (String(v).trim()) q[k] = String(v).trim();
    this.router.navigate([], { relativeTo: this.route, queryParams: q });
  }
}
