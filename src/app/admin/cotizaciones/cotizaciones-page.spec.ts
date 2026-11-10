import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../testing/providers';
import { authFalso } from '../../../testing/auth-falso';
import { CotizacionesPage } from './cotizaciones-page';

const PEDIDOS = [
  { uid: 'p1', numero: 1, lineas: [{ referencia: 'A-1', cantidad: 2, precioUnitario: 100 }], totalEstimado: 200, nombre: 'Ana', whatsapp: '573000000000', ciudad: 'C', estado: 'nuevo', historial: [], createdAt: '2026-11-10T10:00:00Z' },
  { uid: 'p2', numero: 2, lineas: [{ referencia: 'B-1', cantidad: 1 }], totalEstimado: null, nombre: 'Luis', whatsapp: '573000000001', ciudad: 'C', estado: 'despachado', historial: [], createdAt: '2026-11-10T10:00:00Z' }
];

async function montar(rol: 'admin' | 'bodega') {
  await TestBed.configureTestingModule({ imports: [CotizacionesPage], providers: [...providersDePrueba, authFalso(rol)] }).compileComponents();
  const f = TestBed.createComponent(CotizacionesPage);
  f.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne((r) => r.url.endsWith('/admin/pedidos')).flush({ ok: true, pedidos: PEDIDOS, total: 2, pagina: 1, paginas: 1 });
  await f.whenStable();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement, http };
}

const botones = (li: Element) => Array.from(li.querySelectorAll('button')).map((b) => b.textContent?.trim());

describe('CotizacionesPage', () => {
  it('acciones según el estado; enlace de WhatsApp al cliente', async () => {
    const { el } = await montar('admin');
    const items = el.querySelectorAll('.item');
    expect(botones(items[0])).toEqual(['Confirmar (reserva stock)', 'Cancelar']);
    expect(botones(items[1])).toEqual([]);
    expect(items[0].querySelector<HTMLAnchorElement>('a[href^="https://wa.me/573000000000"]')).not.toBeNull();
  });

  it('bodega consulta sin acciones', async () => {
    const { el } = await montar('bodega');
    expect(botones(el.querySelectorAll('.item')[0])).toEqual([]);
  });

  it('confirmar actualiza el pedido en la lista', async () => {
    const { f, http } = await montar('admin');
    spyOn(window, 'confirm').and.returnValue(true);
    f.componentInstance.cambiarPedido(PEDIDOS[0] as any, 'confirmado');
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.body).toEqual({ estado: 'confirmado' });
    req.flush({ ok: true, pedido: { ...PEDIDOS[0], estado: 'confirmado' } });
    expect(f.componentInstance.pedidos()[0].estado).toBe('confirmado');
  });
});
