import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icono } from '../../shared/ui/icono';
import { pesos } from '../../shared/formato';
import { TarjetaProductoComponent } from '../componentes/tarjeta-producto';
import { FormMedida, FormRecordatorio } from '../componentes/formularios';
import { AjustesSitio } from '../estado-sitio';
import { Seo } from '../seo';
import { SitioApi, TarjetaProducto } from '../sitio-api';

type Modo = 'referencia' | 'maquina' | 'medidas';

const SECTORES = [
  { n: '01', titulo: 'Transporte', texto: 'Camiones, buses y flotas' },
  { n: '02', titulo: 'Agro', texto: 'Tractores y cosechadoras' },
  { n: '03', titulo: 'Minería', texto: 'Equipo pesado en ambientes con polvo' },
  { n: '04', titulo: 'Construcción', texto: 'Maquinaria amarilla' },
  { n: '05', titulo: 'Industria', texto: 'Compresores y plantas' }
];

@Component({
  selector: 'app-inicio-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icono, TarjetaProductoComponent, FormMedida, FormRecordatorio],
  templateUrl: './inicio-page.html',
  styleUrl: './inicio-page.scss'
})
export class InicioPage implements OnInit {
  private api = inject(SitioApi);
  private router = inject(Router);
  private seo = inject(Seo);
  ajustes = inject(AjustesSitio);

  readonly sectores = SECTORES;
  readonly pesos = pesos;
  readonly modos: { valor: Modo; texto: string; corto: string }[] = [
    { valor: 'referencia', texto: 'Referencia o equivalencia', corto: 'Referencia' },
    { valor: 'maquina', texto: 'Por máquina', corto: 'Máquina' },
    { valor: 'medidas', texto: 'Por medidas', corto: 'Medidas' }
  ];

  modo = signal<Modo>('referencia');
  destacados = signal<TarjetaProducto[]>([]);
  criterio = signal<'ventas' | 'recientes'>('recientes');
  kits = signal<TarjetaProducto[]>([]);

  tituloDestacados = computed(() => (this.criterio() === 'ventas' ? 'Referencias más vendidas' : 'Referencias del catálogo'));

  constructor() {
    // JSON-LD de la organización con el WhatsApp de ventas cuando esté configurado
    effect(() => this.ponerSeo(this.ajustes.whatsapp()));
  }

  ngOnInit() {
    this.api.destacados().subscribe({ next: (r) => { this.destacados.set(r.productos); this.criterio.set(r.criterio); }, error: () => {} });
    this.api.kits().subscribe({ next: (k) => this.kits.set(k.slice(0, 3)), error: () => {} });
  }

  private ponerSeo(whatsapp: string | null) {
    const origen = this.seo.origen();
    this.seo.pagina({
      titulo: 'Filtros de aire industriales y automotrices · Filtramos',
      descripcion: 'Fabricantes de filtros de aire en Colombia. Busque por la referencia de cualquier marca, su máquina o las medidas y encuentre el equivalente Filtramos, con precio y despacho a todo el país.',
      ruta: '/',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Filtramos SAS',
        url: origen || undefined,
        logo: origen ? `${origen}/logo.png` : undefined,
        ...(whatsapp ? { contactPoint: { '@type': 'ContactPoint', telephone: `+${whatsapp}`, contactType: 'sales', areaServed: 'CO', availableLanguage: 'es' } } : {})
      }
    });
  }

  // Flechas entre pestañas (patrón de tablist)
  teclaModo(e: KeyboardEvent, i: number) {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const n = this.modos.length;
    const sig = this.modos[(i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n];
    this.modo.set(sig.valor);
    (e.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role=tab]')[this.modos.indexOf(sig)]?.focus();
  }

  buscar(evento: Event, form: HTMLFormElement) {
    evento.preventDefault();
    const datos = new FormData(form);
    const q: Record<string, string> = {};
    for (const [k, v] of datos.entries()) if (String(v).trim()) q[k] = String(v).trim();
    this.router.navigate(['/catalogo'], { queryParams: q });
  }

  equivalenciasKit(k: TarjetaProducto) { return k.kit || []; }
}
