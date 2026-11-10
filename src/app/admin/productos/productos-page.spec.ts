import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../testing/providers';
import { authFalso } from '../../../testing/auth-falso';
import { ProductosPage } from './productos-page';
import { Producto } from '../modelos';

const base = { equivalencias: [], aplicaciones: [], papeles: [], imagesUrl: [], kit: [], publicar: true, stock: 0, reservado: 0, stockMinimo: 0 };
const PRODUCTOS: Partial<Producto>[] = [
  { ...base, uid: '1', referencia: 'AF-100', tipo: 'aire-primario', precios: { publico: 100000 }, publicado: true, motivosBorrador: [],
    equivalencias: [{ marca: 'Marca A', referencia: 'A-1' }], stock: 7 },
  { ...base, uid: '2', referencia: 'AF-200', tipo: 'aire-primario', publicado: false, motivosBorrador: ['sin-precio'] },
  { ...base, uid: '3', referencia: 'KIT-1', tipo: 'kit', publicado: true, motivosBorrador: [],
    kit: [{ producto: '1', referencia: 'AF-100', cantidad: 1 }, { producto: '9', referencia: 'AS-9', cantidad: 1 }] }
];

async function montar(rol: 'admin' | 'bodega') {
  await TestBed.configureTestingModule({ imports: [ProductosPage], providers: [...providersDePrueba, authFalso(rol)] }).compileComponents();
  const fixture = TestBed.createComponent(ProductosPage);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne((r) => r.url.endsWith('/admin/productos')).flush({ ok: true, productos: PRODUCTOS, total: 3, pagina: 1, paginas: 1, porPagina: 10 });
  http.expectOne((r) => r.url.endsWith('/admin/resumen')).flush({ ok: true, resumen: { publicados: 2, borradores: 1, sinFoto: 0, sinPrecio: 1, stockBajo: 0 } });
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ProductosPage', () => {
  it('muestra filas con estado, precio en pesos, equivalencias y kit', async () => {
    const el = await montar('admin');
    const filas = Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.textContent?.replace(/\s+/g, ' ') || '');
    expect(filas.length).toBe(3);
    expect(filas[0]).toContain('AF-100');
    expect(filas[0]).toContain('Marca A A-1');
    expect(filas[0]).toMatch(/\$\s?100\.000/);
    expect(filas[0]).toContain('Publicado');
    expect(filas[1]).toContain('Borrador · sin precio');
    expect(filas[2]).toContain('Incluye AF-100, AS-9');
    expect(el.textContent).toContain('Mostrando 1–3 de 3');
  });

  it('indicadores con valores reales', async () => {
    const el = await montar('admin');
    const valores = Array.from(el.querySelectorAll('.indicador__valor')).map((v) => v.textContent?.trim());
    expect(valores).toEqual(['2', '0', '1', '0']);
  });

  it('admin ve Nuevo producto y Eliminar; bodega solo Ver', async () => {
    const admin = await montar('admin');
    expect(admin.textContent).toContain('Nuevo producto');
    expect(admin.querySelectorAll('[aria-label^="Eliminar"]').length).toBe(3);
    TestBed.resetTestingModule();
    const bodega = await montar('bodega');
    expect(bodega.textContent).not.toContain('Nuevo producto');
    expect(bodega.querySelectorAll('[aria-label^="Eliminar"]').length).toBe(0);
    expect(bodega.querySelectorAll('[aria-label^="Ver"]').length).toBe(3);
  });

  it('botones de solo ícono tienen nombre accesible', async () => {
    const el = await montar('admin');
    const sinNombre = Array.from(el.querySelectorAll('button.btn-icono')).filter((b) => !b.getAttribute('aria-label'));
    expect(sinNombre.length).toBe(0);
  });
});
