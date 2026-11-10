import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../../testing/providers';
import { Auth } from '../../../services/auth/auth';
import { CatalogoAdmin } from './catalogo-admin';

const PRODUCTOS = [
  { uid: '1', referencia: 'AF-100', equivalencias: ['Fleetguard P-181'], aplicaciones: [], papeles: [], imagesUrl: [], stock: 1 },
  { uid: '2', referencia: 'BX-7', equivalencias: [], aplicaciones: [], papeles: [], imagesUrl: [], stock: 0 },
  { uid: '3', equivalencias: [], aplicaciones: [], papeles: [], imagesUrl: [], stock: 0 } // sin referencia
];

async function montar(admin: boolean) {
  await TestBed.configureTestingModule({
    imports: [CatalogoAdmin],
    providers: [...providersDePrueba, { provide: Auth, useValue: { esAdmin: signal(admin), usuario: signal(null) } }]
  }).compileComponents();
  const fixture = TestBed.createComponent(CatalogoAdmin);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne((r) => /\/productos\/obtener\/?$/.test(r.url)).flush({ ok: true, products: PRODUCTOS });
  await fixture.whenStable();
  http.match(() => true).forEach((r) => r.flush({ ok: true, files: [] }));
  await fixture.whenStable();
  return fixture;
}

describe('CatalogoAdmin', () => {
  it('buscador: ignora guiones y mayúsculas, busca en equivalencias y no falla sin referencia', async () => {
    const c = (await montar(true)).componentInstance;
    const buscar = (q: string) => { c.searchTerm = q; c.onSearch(); return c.filteredProducts.map((p) => p.referencia); };
    expect(buscar('af100')).toEqual(['AF-100']);
    expect(buscar('p 181')).toEqual(['AF-100']);
    expect(buscar('bx-7')).toEqual(['BX-7']);
    expect(buscar('').length).toBe(3);
  });

  it('admin ve Agregar, Editar y Eliminar', async () => {
    const el = (await montar(true)).nativeElement as HTMLElement;
    const textos = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(textos).toContain('Agregar Producto');
    expect(textos).toContain('Editar');
    expect(textos).toContain('Eliminar');
  });

  it('bodega o ventas no ven acciones de admin', async () => {
    const el = (await montar(false)).nativeElement as HTMLElement;
    const textos = Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(textos).not.toContain('Agregar Producto');
    expect(textos).not.toContain('Editar');
    expect(textos).not.toContain('Eliminar');
    expect(textos).toContain('Detalles');
  });
});
