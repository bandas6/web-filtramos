import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icono } from '../../shared/ui/icono';
import { TarjetaProductoComponent } from '../componentes/tarjeta-producto';
import { Seo } from '../seo';
import { Busqueda, ConteoTipo, PARAMS_BUSQUEDA, SitioApi, TarjetaProducto } from '../sitio-api';

const DISPONIBILIDADES = [
  { valor: 'disponible', nombre: 'Disponible' },
  { valor: 'ultimas', nombre: 'Últimas unidades' },
  { valor: 'bajo-pedido', nombre: 'Bajo pedido' }
];
const ORDENES = [
  { valor: 'referencia', nombre: 'Referencia (A–Z)' },
  { valor: 'precio-asc', nombre: 'Precio: menor a mayor' },
  { valor: 'precio-desc', nombre: 'Precio: mayor a menor' }
];
// Filtros que cuentan para "Filtros (n)" (la búsqueda de texto y el orden no)
const FILTROS = ['tipo', 'disponibilidad', 'maquina', 'diamExt', 'alto', 'diamMin', 'diamMax', 'altoMin', 'altoMax'] as const;

// Catálogo: filtros laterales (en celular, panel que se abre con "Filtros"), conteo, orden y todo en la URL.
@Component({
  selector: 'app-catalogo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icono, TarjetaProductoComponent],
  host: { '(document:keydown.escape)': 'cerrarPanel()' },
  template: `
    <section class="contenedor catalogo">
      <h1>{{ titulo() }}</h1>

      <div class="disposicion">
        <button type="button" class="btn abrir-filtros" #abrirFiltros (click)="panelAbierto.set(true)"
                aria-controls="filtros" [attr.aria-expanded]="panelAbierto()">
          Filtros@if (activos()) { <span class="cuenta">{{ activos() }}</span> }
        </button>

        <aside id="filtros" class="filtros" [class.abierto]="panelAbierto()" aria-labelledby="filtros-t"
               [attr.role]="panelAbierto() ? 'dialog' : null" [attr.aria-modal]="panelAbierto() ? 'true' : null">
          <div class="filtros__cab">
            <h2 id="filtros-t">Filtros</h2>
            <button type="button" class="btn-icono filtros__cerrar" (click)="cerrarPanel()" aria-label="Cerrar filtros"><f-icono nombre="cerrar" /></button>
          </div>

          <form #f (submit)="aplicar($event, f)" class="filtros__form">
            <div class="field">
              <label for="c-q">Referencia o equivalencia</label>
              <input id="c-q" name="q" type="search" [value]="filtro().q || ''" placeholder="Ej.: P181052" autocomplete="off" />
            </div>

            <fieldset>
              <legend>Tipo</legend>
              <label class="opcion"><input type="radio" name="tipo" value="" [checked]="!filtro().tipo" (change)="aplicarYa(f)" /> Todos</label>
              @for (t of tipos(); track t.valor) {
                <label class="opcion">
                  <input type="radio" name="tipo" [value]="t.valor" [checked]="t.valor === filtro().tipo" (change)="aplicarYa(f)" />
                  {{ t.valor === 'kit' ? 'Kits' : t.nombre }} <span class="opcion__n">{{ t.total }}</span>
                </label>
              }
            </fieldset>

            <fieldset>
              <legend>Disponibilidad</legend>
              @for (d of disponibilidades; track d.valor) {
                <label class="opcion"><input type="checkbox" name="disponibilidad" [value]="d.valor" [checked]="marcada(d.valor)" (change)="aplicarYa(f)" /> {{ d.nombre }}</label>
              }
            </fieldset>

            <fieldset>
              <legend>Diámetro externo (mm)</legend>
              <div class="rango">
                <label class="sr-only" for="c-dmin">Diámetro externo mínimo</label>
                <input id="c-dmin" name="diamMin" type="number" min="0" inputmode="decimal" class="control" placeholder="Mín." [value]="filtro().diamMin || ''" />
                <span aria-hidden="true">–</span>
                <label class="sr-only" for="c-dmax">Diámetro externo máximo</label>
                <input id="c-dmax" name="diamMax" type="number" min="0" inputmode="decimal" class="control" placeholder="Máx." [value]="filtro().diamMax || ''" />
              </div>
            </fieldset>

            <fieldset>
              <legend>Alto (mm)</legend>
              <div class="rango">
                <label class="sr-only" for="c-amin">Alto mínimo</label>
                <input id="c-amin" name="altoMin" type="number" min="0" inputmode="decimal" class="control" placeholder="Mín." [value]="filtro().altoMin || ''" />
                <span aria-hidden="true">–</span>
                <label class="sr-only" for="c-amax">Alto máximo</label>
                <input id="c-amax" name="altoMax" type="number" min="0" inputmode="decimal" class="control" placeholder="Máx." [value]="filtro().altoMax || ''" />
              </div>
            </fieldset>

            <!-- Búsquedas que llegan desde el inicio (máquina, medidas aproximadas) se conservan -->
            @for (k of ocultos; track k) { @if (filtro()[k]) { <input type="hidden" [name]="k" [value]="filtro()[k]" /> } }
            @if (filtro().orden) { <input type="hidden" name="orden" [value]="filtro().orden" /> }

            <div class="filtros__acciones">
              <button type="submit" class="btn btn--verde">{{ panelAbierto() ? 'Ver ' + total() + ' ' + (total() === 1 ? 'resultado' : 'resultados') : 'Aplicar' }}</button>
              @if (activos() || filtro().q) { <a [routerLink]="[]" class="btn btn--enlace limpiar" (click)="panelAbierto.set(false)">Limpiar filtros</a> }
            </div>
          </form>
        </aside>
        @if (panelAbierto()) { <div class="velo" (click)="cerrarPanel()" aria-hidden="true"></div> }

        <div class="resultados">
          <div class="barra-res">
            <p class="conteo" role="status">
              @if (cargando()) { Buscando… } @else { <b>{{ total() }}</b> {{ total() === 1 ? 'resultado' : 'resultados' }} }
            </p>
            <div class="orden">
              <label for="c-orden">Ordenar por</label>
              <select id="c-orden" class="control" (change)="ordenar($any($event.target).value)">
                @for (o of ordenes; track o.valor) { <option [value]="o.valor" [selected]="o.valor === (filtro().orden || 'referencia')">{{ o.nombre }}</option> }
              </select>
            </div>
          </div>

          @if (chips().length) {
            <ul class="chips" aria-label="Búsqueda aplicada">
              @for (c of chips(); track c.clave) {
                <li><a [routerLink]="[]" [queryParams]="sinParam(c.clave)" class="chip">{{ c.texto }} <span aria-hidden="true">✕</span><span class="sr-only"> (quitar)</span></a></li>
              }
            </ul>
          }

          <h2 class="sr-only">Resultados</h2>
          <div class="rejilla">
            @for (p of productos(); track p.slug) { <app-tarjeta-producto [p]="p" /> }
          </div>

          @if (!cargando() && !productos().length) {
            <div class="vacio">
              <h2>No encontramos coincidencias</h2>
              <p>Quite algún filtro, revise la referencia o pruebe con la máquina o las medidas. Si no aparece, lo fabricamos a la medida.</p>
              <div class="vacio__acciones">
                @if (activos() || filtro().q) { <a [routerLink]="[]" class="btn">Limpiar filtros</a> }
                <a routerLink="/a-medida" class="btn btn--oscuro">Pedir fabricación a medida</a>
              </div>
            </div>
          }

          @if (paginas() > 1) {
            <nav class="paginas" aria-label="Páginas de resultados">
              @for (n of numeros(); track n) {
                <a [routerLink]="[]" [queryParams]="{ pagina: n }" queryParamsHandling="merge" [attr.aria-current]="n === pagina() ? 'page' : null">{{ n }}</a>
              }
            </nav>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .catalogo { padding-top: 36px; padding-bottom: 72px; }
    h1 { font-size: 36px; margin-bottom: 20px; }
    .disposicion { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 28px; align-items: start; }
    .abrir-filtros { display: none; }
    .filtros { background: #fff; border: 1px solid var(--f-line); border-radius: var(--f-radio-tarjeta); padding: 18px; position: sticky; top: 16px; }
    .filtros__cab { display: flex; justify-content: space-between; align-items: center; h2 { font-size: 18px; } }
    .filtros__cerrar { display: none; }
    .filtros__form { display: flex; flex-direction: column; gap: 18px; margin-top: 12px; }
    fieldset { border: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    legend { font-weight: 700; font-size: 14px; margin-bottom: 6px; padding: 0; }
    .opcion { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: 15px; cursor: pointer;
      input { width: 18px; height: 18px; accent-color: var(--f-green); margin: 0; } }
    .opcion__n { margin-left: auto; font-size: 13px; color: var(--f-muted); }
    .rango { display: flex; align-items: center; gap: 8px; input { flex: 1 1 0; width: 0; min-width: 0; height: 40px; } span { color: var(--f-muted); } }
    .filtros__acciones { display: flex; flex-direction: column; gap: 6px; }
    .limpiar { text-align: center; }
    .velo { display: none; }

    .barra-res { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
    .conteo { margin: 0; color: var(--f-text-2); }
    .orden { display: flex; align-items: center; gap: 8px; font-size: 14px; select { height: 40px; } }
    .chips { list-style: none; margin: 0 0 14px; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { display: inline-flex; gap: 6px; align-items: center; min-height: 34px; padding: 0 12px; border-radius: 999px; background: var(--f-green-tint); color: var(--f-green-dark); text-decoration: none; font-size: 14px; font-weight: 600; }
    .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .vacio { background: #fff; border: 1px solid var(--f-line); border-radius: var(--f-radio-tarjeta); padding: 28px; h2 { font-size: 22px; } p { color: var(--f-text-2); } }
    .vacio__acciones { display: flex; flex-wrap: wrap; gap: 10px; }
    .paginas { justify-content: center; margin-top: 24px; a { min-width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--f-line); border-radius: 6px; background: #fff; color: var(--f-ink); text-decoration: none; font-weight: 600; }
      a[aria-current='page'] { background: var(--f-ink); color: #fff; } }

    @media (max-width: 900px) {
      .catalogo { padding-top: 20px; }
      h1 { font-size: 26px; margin-bottom: 14px; }
      .disposicion { grid-template-columns: minmax(0, 1fr); gap: 12px; }
      .abrir-filtros { display: inline-flex; justify-self: start; gap: 8px; }
      .cuenta { min-width: 22px; height: 22px; border-radius: 11px; background: var(--f-green); color: #fff; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
      .filtros { display: none; }
      .filtros.abierto {
        display: block; position: fixed; inset: auto 0 0 0; top: auto; max-height: 88vh; overflow-y: auto; z-index: 70;
        border-radius: 16px 16px 0 0; padding: 18px 16px calc(16px + env(safe-area-inset-bottom));
      }
      .filtros__cerrar { display: inline-flex; }
      .velo { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, .45); z-index: 60; }
      .filtros__acciones { position: sticky; bottom: -16px; background: #fff; padding: 10px 0 4px; }
      .rejilla { grid-template-columns: minmax(0, 1fr); gap: 10px; }
      .orden label { display: none; }
    }
  `
})
export class CatalogoPage implements OnInit {
  private api = inject(SitioApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(Seo);
  private abrirFiltros = viewChild<ElementRef<HTMLButtonElement>>('abrirFiltros');

  readonly disponibilidades = DISPONIBILIDADES;
  readonly ordenes = ORDENES;
  readonly ocultos = ['maquina', 'diamExt', 'alto'] as const;

  filtro = signal<Busqueda>({});
  tipos = signal<ConteoTipo[]>([]);
  productos = signal<TarjetaProducto[]>([]);
  total = signal(0);
  pagina = signal(1);
  paginas = signal(1);
  cargando = signal(true);
  panelAbierto = signal(false);

  numeros = computed(() => Array.from({ length: Math.min(this.paginas(), 30) }, (_, i) => i + 1));
  activos = computed(() => FILTROS.filter((k) => this.filtro()[k]).length);
  titulo = computed(() => {
    const f = this.filtro();
    if (f.q) return `Resultados para “${f.q}”`;
    if (f.tipo === 'kit') return 'Kits de mantenimiento';
    const t = this.tipos().find((x) => x.valor === f.tipo);
    return t ? `Filtros: ${t.nombre}` : 'Catálogo';
  });
  // Lo que vino del buscador del inicio (máquina y medidas aproximadas) se muestra como chip que se puede quitar
  chips = computed(() => {
    const f = this.filtro();
    return [
      f.maquina ? { clave: 'maquina', texto: `Máquina: ${f.maquina}` } : null,
      f.diamExt ? { clave: 'diamExt', texto: `Ø ext ≈ ${f.diamExt} mm` } : null,
      f.alto ? { clave: 'alto', texto: `Alto ≈ ${f.alto} mm` } : null
    ].filter((c): c is { clave: string; texto: string } => !!c);
  });

  ngOnInit() {
    this.api.tipos().subscribe({ next: (t) => this.tipos.set(t.filter((x) => x.total > 0)), error: () => {} });
    this.route.queryParamMap.subscribe((q) => {
      const f: Busqueda = {};
      for (const k of PARAMS_BUSQUEDA) if (q.get(k)) f[k] = q.get(k)!;
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

  marcada(valor: string) {
    return (this.filtro().disponibilidad || '').split(',').includes(valor);
  }

  private paramsDe(form: HTMLFormElement) {
    const datos = new FormData(form);
    const q: Record<string, string> = {};
    for (const k of PARAMS_BUSQUEDA) {
      const valores = datos.getAll(k).map((v) => String(v).trim()).filter(Boolean);
      if (valores.length) q[k] = valores.join(',');
    }
    // Todas las disponibilidades marcadas = sin filtro
    if (q['disponibilidad']?.split(',').length === DISPONIBILIDADES.length) delete q['disponibilidad'];
    return q;
  }

  // Botón Aplicar (o "Ver N resultados" en celular): aplica y cierra el panel
  aplicar(e: Event, form: HTMLFormElement) {
    e.preventDefault();
    this.router.navigate([], { relativeTo: this.route, queryParams: this.paramsDe(form) });
    this.cerrarPanel();
  }

  // Tipo y disponibilidad se aplican al instante (el panel sigue abierto en celular para ver el conteo)
  aplicarYa(form: HTMLFormElement) {
    this.router.navigate([], { relativeTo: this.route, queryParams: this.paramsDe(form), replaceUrl: true });
  }

  ordenar(orden: string) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { orden: orden === 'referencia' ? null : orden, pagina: null }, queryParamsHandling: 'merge' });
  }

  sinParam(clave: string) {
    const { pagina, ...resto } = this.filtro();
    return { ...resto, [clave]: null };
  }

  cerrarPanel() {
    if (!this.panelAbierto()) return;
    this.panelAbierto.set(false);
    this.abrirFiltros()?.nativeElement.focus();
  }
}
