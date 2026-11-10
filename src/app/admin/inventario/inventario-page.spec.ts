import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../testing/providers';
import { authFalso } from '../../../testing/auth-falso';
import { InventarioPage } from './inventario-page';

const FILAS = [
  { uid: '1', referencia: 'A-1', tipo: 'aire-primario', esKit: false, stock: 30, reservado: 3, stockMinimo: 10, disponible: 27, estado: 'disponible', quedan: null, nivel: 1 },
  { uid: '2', referencia: 'B-1', tipo: 'compresor', esKit: false, stock: 4, reservado: 0, stockMinimo: 10, disponible: 4, estado: 'ultimas', quedan: 4, nivel: 0.2 },
  { uid: '3', referencia: 'K-1', tipo: 'kit', esKit: true, stock: null, reservado: null, stockMinimo: null, disponible: 0, estado: 'bajo-pedido', quedan: null, nivel: 0 }
];
const MOVS = [
  { uid: 'm1', referencia: 'A-1', tipo: 'entrada', cantidad: 30, motivo: 'produccion', origen: 'manual', usuarioNombre: 'Ana', fecha: '2026-11-10T10:00:00Z' },
  { uid: 'm2', referencia: 'A-1', tipo: 'reserva', cantidad: 3, motivo: 'pedido-web', origen: 'web', referenciaExterna: 'P-9', fecha: '2026-11-10T11:00:00Z' },
  { uid: 'm3', referencia: 'B-1', tipo: 'ajuste', cantidad: -2, motivo: 'conteo-fisico', origen: 'manual', usuarioNombre: 'Ana', fecha: '2026-11-10T12:00:00Z' }
];

async function montar(rol: 'admin' | 'bodega' | 'ventas') {
  await TestBed.configureTestingModule({ imports: [InventarioPage], providers: [...providersDePrueba, authFalso(rol)] }).compileComponents();
  const fixture = TestBed.createComponent(InventarioPage);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  // Dos lecturas: la tabla y la lista completa para el buscador de referencias
  http.match((r) => r.url.endsWith('/admin/inventario')).forEach((r) => r.flush({ ok: true, productos: FILAS, indicadores: { referenciasActivas: 2, bajoMinimo: 1, enCero: 0, unidadesReservadas: 3 } }));
  http.expectOne((r) => r.url.endsWith('/admin/movimientos')).flush({ ok: true, movimientos: MOVS });
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, http, c: fixture.componentInstance };
}

describe('InventarioPage', () => {
  it('tabla con disponibilidad que ve el cliente; nunca "agotado"', async () => {
    const { el } = await montar('bodega');
    const filas = Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.textContent?.replace(/\s+/g, ' ') || '');
    expect(filas[0]).toContain('Disponible');
    expect(filas[1]).toContain('Últimas unidades');
    expect(filas[2]).toContain('Bajo pedido');
    expect(filas[2]).toContain('Kit (según componentes)');
    expect(el.textContent?.toLowerCase()).not.toContain('agotado');
  });

  it('movimientos recientes con signo: +30, reserva sin signo, −2', async () => {
    const { el } = await montar('bodega');
    const cant = Array.from(el.querySelectorAll('.mov__cant')).map((s) => s.textContent?.trim());
    expect(cant).toEqual(['+30', '3', '−2']);
    expect(el.textContent).toContain('Sitio web');
  });

  it('ventas no ve el formulario de movimiento', async () => {
    const { el } = await montar('ventas');
    expect(el.textContent).not.toContain('Registrar movimiento');
  });

  it('ajuste envía el stock contado; entrada envía la cantidad', async () => {
    const { c, http } = await montar('bodega');
    c.form.patchValue({ referencia: 'B-1', cantidad: 6 });
    c.elegirTipo('ajuste');
    c.form.patchValue({ cantidad: 6 });
    c.guardar();
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body).toEqual(jasmine.objectContaining({ referencia: 'B-1', tipo: 'ajuste', stockContado: 6, motivo: 'conteo-fisico' }));
    expect(req.request.body.cantidad).toBeUndefined();
    req.flush({ ok: true, movimiento: { ...MOVS[2], cantidad: 2, stockResultante: 6 } });
    http.match(() => true).forEach((r) => r.flush({ ok: true, productos: FILAS, indicadores: {}, movimientos: [] }));

    c.elegirTipo('entrada');
    c.form.patchValue({ referencia: 'A-1', cantidad: 5 });
    c.guardar();
    const req2 = http.expectOne((r) => r.method === 'POST');
    expect(req2.request.body).toEqual(jasmine.objectContaining({ tipo: 'entrada', cantidad: 5, motivo: 'produccion' }));
  });

  it('cantidad inválida no se envía y muestra el motivo', async () => {
    const { c, http } = await montar('admin');
    c.form.patchValue({ referencia: 'A-1', cantidad: 0 });
    c.guardar();
    http.expectNone((r) => r.method === 'POST');
    expect(c.errorForm()).toContain('mayor que 0');
  });

  it('el error de la API (stock insuficiente) aparece en el formulario', async () => {
    const { c, http, fixture } = await montar('admin');
    c.elegirTipo('salida');
    c.form.patchValue({ referencia: 'B-1', cantidad: 50 });
    c.guardar();
    http.expectOne((r) => r.method === 'POST').flush({ ok: false, error: 'Stock insuficiente: hay 4 en stock' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.mov-form [role=alert]')?.textContent).toContain('Stock insuficiente');
  });

  it('el tipo de movimiento es un grupo de radio accesible', async () => {
    const { el } = await montar('admin');
    const radios = Array.from(el.querySelectorAll('[role=radiogroup] [role=radio]'));
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });
});
