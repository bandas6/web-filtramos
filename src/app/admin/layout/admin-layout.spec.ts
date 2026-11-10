import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../testing/providers';
import { authFalso } from '../../../testing/auth-falso';
import { AdminLayout } from './admin-layout';

async function montar(rol: 'admin' | 'bodega', faltantes: string[]) {
  await TestBed.configureTestingModule({ imports: [AdminLayout], providers: [...providersDePrueba, authFalso(rol)] }).compileComponents();
  const fixture = TestBed.createComponent(AdminLayout);
  fixture.detectChanges();
  TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/admin/ajustes/estado')).flush({ ok: true, faltantes });
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const opciones = (el: HTMLElement) => Array.from(el.querySelectorAll('nav[aria-label="Panel"] a')).map((a) => a.textContent?.trim());

describe('AdminLayout', () => {
  it('admin ve todo el menú; bodega no ve Imágenes, Usuarios ni Ajustes', async () => {
    expect(opciones(await montar('admin', []))).toEqual(['Inicio', 'Productos', 'Inventario', 'Importar Excel', 'Kits', 'Cotizaciones y pedidos', 'Imágenes', 'Usuarios y roles', 'Ajustes']);
    TestBed.resetTestingModule();
    expect(opciones(await montar('bodega', []))).toEqual(['Inicio', 'Productos', 'Inventario', 'Kits', 'Cotizaciones y pedidos']);
  });

  it('aviso visible si falta el WhatsApp de ventas', async () => {
    const el = await montar('admin', ['whatsappVentas']);
    const alerta = el.querySelector('[role=alert]');
    expect(alerta?.textContent).toContain('Falta el WhatsApp de ventas');
    expect(alerta?.querySelector('a')?.getAttribute('href')).toBe('/admin/ajustes');
  });

  it('sin faltantes no hay aviso', async () => {
    const el = await montar('admin', []);
    expect(el.querySelector('[role=alert]')).toBeNull();
  });

  it('usuario con iniciales, rol y botón Salir', async () => {
    const el = await montar('bodega', []);
    expect(el.querySelector('.lateral__avatar')?.textContent?.trim()).toBe('AP');
    expect(el.textContent).toContain('Bodega');
    expect(el.textContent).toContain('Salir');
  });
});
