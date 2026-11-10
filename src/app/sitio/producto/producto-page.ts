import { ChangeDetectionStrategy, Component, computed, inject, OnInit, RESPONSE_INIT, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icono } from '../../shared/ui/icono';
import { BadgeDisponibilidad } from '../../shared/ui/badge-disponibilidad';
import { enlaceWhatsapp, pesos, urlImagen } from '../../shared/formato';
import { TarjetaProductoComponent } from '../componentes/tarjeta-producto';
import { FormRecordatorio } from '../componentes/formularios';
import { AjustesSitio, PedidoSitio } from '../estado-sitio';
import { Seo } from '../seo';
import { FichaProducto, precioPorCantidad, SitioApi, TarjetaProducto, textoEquivalencias } from '../sitio-api';

const ETIQUETAS_FICHA: [string, string, string?][] = [
  ['diametroExterno', 'Diámetro externo', 'mm'],
  ['diametroInterno', 'Diámetro interno', 'mm'],
  ['alto', 'Alto', 'mm'],
  ['alturaPliegue', 'Altura de pliegue', 'mm'],
  ['cortePapel', 'Corte de papel', 'mm'],
  ['cantidadPliegues', 'Cantidad de pliegues'],
  ['malla', 'Malla'],
  ['longitudMallaExterna', 'Longitud malla externa'],
  ['longitudMallaInterna', 'Longitud malla interna'],
  ['poliuretano', 'Poliuretano'],
  ['anillo', 'Anillo'],
  ['tapa', 'Tapa']
];

@Component({
  selector: 'app-producto-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icono, BadgeDisponibilidad, TarjetaProductoComponent, FormRecordatorio],
  templateUrl: './producto-page.html',
  styleUrl: './producto-page.scss'
})
export class ProductoPage implements OnInit {
  private api = inject(SitioApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(Seo);
  private respuesta = inject(RESPONSE_INIT, { optional: true });
  ajustes = inject(AjustesSitio);
  private pedido = inject(PedidoSitio);

  readonly pesos = pesos;
  p = signal<FichaProducto | null>(null);
  relacionados = signal<TarjetaProducto[]>([]);
  noEncontrado = signal(false);
  fotoActual = signal(0);
  cantidad = signal(1);
  agregado = signal<string | null>(null);
  mostrarRecordatorio = signal(false);

  imagenes = computed(() => (this.p()?.imagenes || []).map((i) => urlImagen(i, 1240)!));
  miniaturas = computed(() => (this.p()?.imagenes || []).map((i) => urlImagen(i, 280)!));
  equivale = computed(() => textoEquivalencias(this.p()?.equivalencias || []));
  descripcion = computed(() => {
    const p = this.p();
    if (!p) return '';
    if (p.descripcion) return p.descripcion;
    // Texto armado solo con datos del producto (sin inventar)
    const base = p.tipo === 'kit' ? 'Kit de mantenimiento' : `Elemento filtrante de ${p.tipoNombre.toLowerCase()}`;
    const uso = p.aplicaciones[0] ? ` para ${p.aplicaciones[0]}` : '';
    const reemplazo = p.equivalencias.length ? ' Reemplaza directamente a las referencias equivalentes indicadas abajo.' : '';
    return `${base}${uso}.${reemplazo}`;
  });
  tramos = computed(() => {
    const p = this.p();
    if (!p?.precios.volumen.length || !p.precios.publico) return [];
    const v = [...p.precios.volumen].sort((a, b) => a.desde - b.desde);
    const filas = [{ rango: `1 – ${v[0].desde - 1} und.`, precio: p.precios.publico }];
    v.forEach((t, i) => filas.push({ rango: v[i + 1] ? `${t.desde} – ${v[i + 1].desde - 1} und.` : `${t.desde}+ und.`, precio: t.precio }));
    return filas;
  });
  precioActual = computed(() => {
    const p = this.p();
    return p ? precioPorCantidad(p.precios.publico, p.precios.volumen, this.cantidad()) : null;
  });
  tramoActivo = computed(() => {
    const p = this.p();
    if (!p) return -1;
    const v = [...p.precios.volumen].sort((a, b) => a.desde - b.desde);
    let i = 0;
    v.forEach((t, j) => { if (this.cantidad() >= t.desde) i = j + 1; });
    return i;
  });
  ficha = computed(() => {
    const f = this.p()?.ficha || {};
    return ETIQUETAS_FICHA.filter(([k]) => f[k] !== undefined).map(([k, etiqueta, unidad]) => ({ etiqueta, valor: unidad ? `${f[k]} ${unidad}` : String(f[k]) }));
  });
  whatsapp = computed(() => {
    const p = this.p();
    return p ? enlaceWhatsapp(this.ajustes.whatsapp(), `Hola, quiero información sobre la referencia ${p.referencia}${this.cantidad() > 1 ? ` (${this.cantidad()} unidades)` : ''}.`) : null;
  });

  ngOnInit() {
    this.route.paramMap.subscribe((pm) => {
      const slug = pm.get('slug') || '';
      this.noEncontrado.set(false);
      this.fotoActual.set(0);
      this.cantidad.set(1);
      this.agregado.set(null);
      this.api.producto(slug).subscribe({
        next: (r) => { this.p.set(r.producto); this.relacionados.set(r.relacionados); this.ponerSeo(r.producto); },
        error: () => {
          this.p.set(null);
          this.noEncontrado.set(true);
          if (this.respuesta) this.respuesta.status = 404;
          this.seo.pagina({ titulo: 'Producto no encontrado · Filtramos', descripcion: 'La referencia no está en el catálogo.', ruta: `/filtro/${slug}`, indexar: false });
        }
      });
    });
  }

  private ponerSeo(p: FichaProducto) {
    const eq = textoEquivalencias(p.equivalencias);
    const ruta = `/filtro/${p.slug}`;
    const imagen = p.imagenes[0] ? urlImagen(p.imagenes[0]) : null;
    const disponible = p.disponibilidad.estado === 'bajo-pedido' ? 'https://schema.org/BackOrder' : 'https://schema.org/InStock';
    this.seo.pagina({
      titulo: `${p.referencia}${p.tipoNombre ? ` · ${p.tipoNombre}` : ''}${eq ? ` · Equivale a ${eq}` : ''} | Filtramos`.slice(0, 160),
      descripcion: `${p.tipoNombre ? `Filtro ${p.tipoNombre.toLowerCase()} ` : ''}${p.referencia}.${eq ? ` Equivale a ${eq}.` : ''}${p.aplicaciones.length ? ` Aplicaciones: ${p.aplicaciones.slice(0, 3).join(', ')}.` : ''} Fabricante nacional, despacho a todo el país.`,
      ruta,
      imagen,
      tipo: 'product',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: `${p.referencia}${p.tipoNombre ? ` – ${p.tipoNombre}` : ''}`,
        sku: p.referencia,
        mpn: p.referencia,
        description: this.descripcion() + (eq ? ` Equivale a: ${eq}.` : ''),
        category: p.tipoNombre || undefined,
        brand: { '@type': 'Brand', name: 'Filtramos' },
        image: p.imagenes.map((i) => urlImagen(i)),
        ...(p.precios.publico ? { offers: { '@type': 'Offer', priceCurrency: 'COP', price: p.precios.publico, availability: disponible, url: `${this.seo.origen()}${ruta}` } } : {})
      }
    });
  }

  cambiarCantidad(n: number) {
    this.cantidad.set(Math.max(1, Math.min(100000, Math.floor(Number(n)) || 1)));
  }

  agregar() {
    const p = this.p();
    if (!p) return;
    this.pedido.agregar({
      slug: p.slug, referencia: p.referencia, tipoNombre: p.tipoNombre, imagen: p.imagenes[0] || null,
      cantidad: this.cantidad(), precio: p.precios.publico, volumen: p.precios.volumen
    });
    this.agregado.set(`${this.cantidad()} × ${p.referencia} agregado al pedido.`);
  }

  irAlPedido() { this.router.navigate(['/pedido']); }
}
