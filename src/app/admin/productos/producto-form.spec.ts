import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../testing/providers';
import { ProductoForm } from './producto-form';
import { Producto } from '../modelos';

async function montar(producto: Partial<Producto> | null = null, soloLectura = false) {
  await TestBed.configureTestingModule({ imports: [ProductoForm], providers: providersDePrueba }).compileComponents();
  const fixture = TestBed.createComponent(ProductoForm);
  fixture.componentRef.setInput('producto', producto);
  fixture.componentRef.setInput('soloLectura', soloLectura);
  fixture.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.match(() => true).forEach((r) => r.flush(r.request.url.includes('opciones') ? { productos: [] } : { imagenes: [] }));
  await fixture.whenStable();
  return { fixture, c: fixture.componentInstance, http };
}

describe('ProductoForm', () => {
  it('nuevo: motivos de borrador en vivo hasta completar tipo, precio y foto', async () => {
    const { c } = await montar();
    expect(c.motivos()).toEqual(['sin-tipo', 'sin-precio', 'sin-foto']);
    c.form.patchValue({ referencia: 'X-1', tipo: 'compresor', precioPublico: 5000, imagesUrl: ['/uploads/a.png'] });
    expect(c.motivos()).toEqual([]);
    c.form.patchValue({ publicar: false });
    expect(c.motivos()).toEqual(['oculto']);
  });

  it('armar: vacíos como null, listas limpias y kit solo si el tipo es kit', async () => {
    const { c } = await montar();
    c.form.patchValue({ referencia: ' X-1 ', tipo: 'aire-primario', alto: '', diametroInterno: '50', aplicaciones: 'Uno\n\n Dos ', malla: '  ' });
    c.agregarEquivalencia('Marca', 'R-1');
    c.agregarEquivalencia('', '');
    c.agregarComponente('abc', 2);
    const d = c.armar() as any;
    expect(d.referencia).toBe('X-1');
    expect(d.alto).toBeNull();
    expect(d.diametroInterno).toBe(50);
    expect(d.malla).toBeNull();
    expect(d.aplicaciones).toEqual(['Uno', 'Dos']);
    expect(d.equivalencias).toEqual([{ marca: 'Marca', referencia: 'R-1' }]);
    expect(d.kit).toEqual([]);
    c.form.patchValue({ tipo: 'kit' });
    expect((c.armar() as any).kit).toEqual([{ producto: 'abc', cantidad: 2 }]);
  });

  it('editar: carga los datos y envía PUT con precio vacío como null', async () => {
    const p: Partial<Producto> = {
      uid: 'p1', referencia: 'AF-1', tipo: 'cabina', precios: { publico: 10, volumen: [{ desde: 10, precio: 9 }] },
      equivalencias: [{ marca: 'M', referencia: 'R' }], aplicaciones: ['A'], papeles: [], imagesUrl: ['/uploads/x.png'], kit: [], publicar: true, stockMinimo: 2
    };
    const { c, http } = await montar(p);
    expect(c.volumen.length).toBe(1);
    expect(c.equivalencias.length).toBe(1);
    c.form.patchValue({ precioPublico: '' });
    let guardado: any;
    c.guardado.subscribe((x) => (guardado = x));
    c.guardar();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/admin/productos/p1'));
    expect(req.request.body.precios.publico).toBeNull();
    expect(req.request.body.precios.volumen).toEqual([{ desde: 10, precio: 9 }]);
    req.flush({ ok: true, producto: { ...p, referencia: 'AF-1' } });
    expect(guardado.referencia).toBe('AF-1');
  });

  it('error de la API se muestra en el formulario', async () => {
    const { c, http, fixture } = await montar();
    c.form.patchValue({ referencia: 'DUP-1' });
    c.guardar();
    http.expectOne((r) => r.method === 'POST').flush({ ok: false, error: 'Ya existe un producto con la referencia DUP-1' }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=alert]')?.textContent).toContain('Ya existe');
  });

  it('sin referencia no envía nada', async () => {
    const { c, http } = await montar();
    c.guardar();
    http.expectNone((r) => r.method === 'POST');
    expect(c.error()).toContain('Revise');
  });

  it('solo lectura: campos deshabilitados y sin botón Guardar', async () => {
    const { fixture, c } = await montar({ uid: 'p', referencia: 'R', equivalencias: [], aplicaciones: [], papeles: [], imagesUrl: [], kit: [] }, true);
    fixture.detectChanges();
    expect(c.form.disabled).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Guardar');
  });
});
