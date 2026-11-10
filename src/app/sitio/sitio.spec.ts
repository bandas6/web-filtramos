import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { providersDePrueba } from '../../testing/providers';
import { AjustesSitio, PedidoSitio } from './estado-sitio';
import { precioPorCantidad } from './sitio-api';
import { Seo } from './seo';
import { ProductoPage } from './producto/producto-page';
import { PedidoPage } from './pedido/pedido-page';
import { FormMedida } from './componentes/formularios';

const FICHA = {
  slug: 'ft-1', referencia: 'FT-1', tipo: 'aire-primario', tipoNombre: 'Aire primario', precio: 100, tieneVolumen: true,
  equivalencias: [{ marca: 'Marca', referencia: 'M-1' }], diametroExterno: 300, alto: 400, imagen: null,
  disponibilidad: { estado: 'ultimas', quedan: 3 }, descripcion: null,
  precios: { publico: 100, volumen: [{ desde: 10, precio: 90 }, { desde: 50, precio: 80 }] },
  aplicaciones: ['Máquina X'], papeles: [], intervaloCambio: '500 horas', imagenes: [], ficha: { alto: 400 }, componentes: [], actualizado: ''
};

describe('Sitio público', () => {
  beforeEach(() => { try { localStorage.removeItem('filtramos_pedido'); } catch { /* */ } });

  it('precio por cantidad según tramos', () => {
    const v = [{ desde: 10, precio: 90 }, { desde: 50, precio: 80 }];
    expect(precioPorCantidad(100, v, 1)).toBe(100);
    expect(precioPorCantidad(100, v, 10)).toBe(90);
    expect(precioPorCantidad(100, v, 49)).toBe(90);
    expect(precioPorCantidad(100, v, 500)).toBe(80);
    expect(precioPorCantidad(null, [], 3)).toBeNull();
  });

  it('pedido: suma la misma referencia, limita cantidades y se guarda en el navegador', () => {
    TestBed.configureTestingModule({ providers: providersDePrueba });
    const p = TestBed.inject(PedidoSitio);
    const linea = { slug: 'a', referencia: 'A', tipoNombre: '', imagen: null, cantidad: 2, precio: 10, volumen: [] };
    p.agregar(linea);
    p.agregar({ ...linea, cantidad: 3 });
    expect(p.lineas().length).toBe(1);
    expect(p.unidades()).toBe(5);
    p.cambiarCantidad('a', 0);
    expect(p.lineas()[0].cantidad).toBe(1);
    expect(JSON.parse(localStorage.getItem('filtramos_pedido')!)[0].cantidad).toBe(1);
    p.vaciar();
    expect(p.unidades()).toBe(0);
  });

  it('SEO: título, canónica y JSON-LD sin poder cerrar la etiqueta script', () => {
    TestBed.configureTestingModule({ providers: providersDePrueba });
    const seo = TestBed.inject(Seo);
    const doc = TestBed.inject(DOCUMENT);
    seo.pagina({ titulo: 'T', descripcion: 'D', ruta: '/filtro/x', jsonLd: { name: '</script><script>alert(1)</script>' } });
    expect(doc.title).toBe('T');
    expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe(`${location.origin}/filtro/x`);
    const ld = doc.getElementById('json-ld')!.textContent!;
    expect(ld).not.toContain('</script>');
    expect(JSON.parse(ld).name).toContain('alert');
  });

  describe('Ficha de producto', () => {
    async function montar(whatsapp?: string) {
      await TestBed.configureTestingModule({
        imports: [ProductoPage],
        providers: [...providersDePrueba, { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'ft-1' })) } }]
      }).compileComponents();
      TestBed.inject(AjustesSitio).valores.set(whatsapp ? { whatsappVentas: whatsapp, tiempoDespacho: '24 h' } : {});
      const f = TestBed.createComponent(ProductoPage);
      f.detectChanges();
      TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/public/productos/ft-1')).flush({ ok: true, producto: FICHA, relacionados: [] });
      await f.whenStable();
      f.detectChanges();
      return { f, el: f.nativeElement as HTMLElement };
    }

    it('muestra tramos, equivalencias, disponibilidad y texto armado con datos reales', async () => {
      const { el } = await montar('573000000000');
      expect(Array.from(el.querySelectorAll('.tramo')).map((t) => Array.from(t.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()).join(' '))).toEqual(['1 – 9 und. $ 100', '10 – 49 und. $ 90', '50+ und. $ 80']);
      expect(el.querySelector('.compra__desc')?.textContent).toContain('Elemento filtrante de aire primario para Máquina X.');
      expect(el.textContent).toContain('Últimas unidades');
      expect(el.textContent).toContain('Quedan 3 · despacho en 24 h');
    });

    it('WhatsApp con la referencia en el mensaje; sin número no hay botón', async () => {
      const { el } = await montar('573000000000');
      const a = el.querySelector<HTMLAnchorElement>('a.wa')!;
      expect(a.href).toContain('https://wa.me/573000000000?text=');
      expect(decodeURIComponent(a.href)).toContain('FT-1');
      TestBed.resetTestingModule();
      const sin = await montar();
      expect(sin.el.querySelector('a.wa')).toBeNull();
    });

    it('agregar al pedido con la cantidad elegida; el precio sigue el tramo', async () => {
      const { f } = await montar();
      const c = f.componentInstance;
      c.cambiarCantidad(12);
      expect(c.precioActual()).toBe(90);
      c.agregar();
      expect(TestBed.inject(PedidoSitio).lineas()[0]).toEqual(jasmine.objectContaining({ slug: 'ft-1', cantidad: 12 }));
    });
  });

  describe('Pedido', () => {
    async function montar() {
      await TestBed.configureTestingModule({ imports: [PedidoPage], providers: providersDePrueba }).compileComponents();
      TestBed.inject(AjustesSitio).valores.set({ whatsappVentas: '573000000000' });
      TestBed.inject(PedidoSitio).agregar({ slug: 'ft-1', referencia: 'FT-1', tipoNombre: 'Aire primario', imagen: null, cantidad: 12, precio: 100, volumen: [{ desde: 10, precio: 90 }] });
      const f = TestBed.createComponent(PedidoPage);
      f.detectChanges();
      return { f, c: f.componentInstance, http: TestBed.inject(HttpTestingController) };
    }

    it('total estimado con tramos; sin consentimiento no se envía', async () => {
      const { c, http } = await montar();
      expect(c.total()).toBe(1080);
      c.form.patchValue({ nombre: 'Ana', whatsapp: '57 300 000 0000', ciudad: 'C' });
      c.enviar();
      http.expectNone(() => true);
      expect(c.mal('consentimiento')).toBeTrue();
    });

    it('envía líneas y datos; abre WhatsApp con el resumen y vacía el pedido', async () => {
      const { c, http } = await montar();
      c.form.patchValue({ nombre: 'Ana', whatsapp: '57 300 000 0000', ciudad: 'C', consentimiento: true });
      c.enviar();
      const req = http.expectOne((r) => r.url.endsWith('/public/pedidos'));
      expect(req.request.body.lineas).toEqual([{ slug: 'ft-1', cantidad: 12 }]);
      expect(req.request.body.consentimiento).toBeTrue();
      req.flush({ numero: 7, lineas: [{ referencia: 'FT-1', cantidad: 12, precioUnitario: 90, subtotal: 1080 }], totalEstimado: 1080 });
      expect(c.confirmado()?.numero).toBe(7);
      expect(decodeURIComponent(c.confirmado()!.enlace!)).toContain('#7');
      expect(TestBed.inject(PedidoSitio).lineas().length).toBe(0);
    });
  });

  it('formulario a medida: exige consentimiento y envía multipart', async () => {
    await TestBed.configureTestingModule({ imports: [FormMedida], providers: providersDePrueba }).compileComponents();
    const f = TestBed.createComponent(FormMedida);
    f.detectChanges();
    const c = f.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    c.form.patchValue({ nombre: 'Ana', whatsapp: '573000000000', medidas: 'Ø 300' });
    c.enviar();
    http.expectNone(() => true);
    c.form.patchValue({ consentimiento: true });
    c.enviar();
    const req = http.expectOne((r) => r.url.endsWith('/public/solicitudes-medida'));
    expect((req.request.body as FormData).get('consentimiento')).toBe('true');
    req.flush({ ok: true });
    expect(c.enviado()).toBeTrue();
  });
});
