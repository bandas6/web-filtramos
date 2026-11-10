import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../testing/providers';
import { authFalso } from '../../../testing/auth-falso';
import { ImportarPage } from './importar-page';

const CAMPOS = [
  { clave: 'referencia', etiqueta: 'Referencia', tipo: 'texto', requerido: true },
  { clave: 'precioPublico', etiqueta: 'Precio público', tipo: 'precio' },
  { clave: 'stock', etiqueta: 'Stock inicial', tipo: 'stock' }
];
const ANALISIS = {
  nombreArchivo: 'lista.xlsx', hojas: [{ nombre: 'Hoja1', filas: 4 }], hoja: 'Hoja1', filaEncabezados: 1,
  columnas: [{ indice: 1, encabezado: 'Ref.', ejemplo: 'FT-1' }, { indice: 2, encabezado: 'Precio', ejemplo: 1000 }],
  campos: CAMPOS, asociacion: {}, origen: {}
};
const PREVIA = { ...ANALISIS, asociacion: { 1: 'referencia' },
  resumen: { total: 3, nuevos: 2, actualizan: 0, conErrores: 1 },
  errores: [{ fila: 4, referencia: null, errores: ['Falta la referencia'] }], avisos: [],
  muestra: [{ fila: 2, accion: 'crear', referencia: 'FT-1', campos: ['Precio público'], stock: null }] };

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function montar() {
  await TestBed.configureTestingModule({ imports: [ImportarPage], providers: [...providersDePrueba, authFalso('admin')] }).compileComponents();
  const fixture = TestBed.createComponent(ImportarPage);
  fixture.detectChanges();
  return { fixture, c: fixture.componentInstance, http: TestBed.inject(HttpTestingController), el: fixture.nativeElement as HTMLElement };
}

function elegir(c: ImportarPage, nombre = 'lista.xlsx') {
  const input = document.createElement('input');
  input.type = 'file';
  const dt = new DataTransfer();
  dt.items.add(new File(['PK'], nombre));
  input.files = dt.files;
  c.elegirArchivo(input);
}

describe('ImportarPage', () => {
  it('rechaza archivos que no son .xlsx sin llamar a la API', async () => {
    const { c, http } = await montar();
    elegir(c, 'viejo.xls');
    http.expectNone(() => true);
    expect(c.error()).toContain('.xlsx');
    expect(c.paso()).toBe(1);
  });

  it('paso 2: sin sugerencias automáticas; pide asociar la referencia', async () => {
    const { c, http, fixture, el } = await montar();
    elegir(c);
    http.expectOne((r) => r.url.endsWith('/importar/analizar')).flush(ANALISIS);
    fixture.detectChanges();
    expect(c.paso()).toBe(2);
    const selects = Array.from(el.querySelectorAll('.asociar select')) as HTMLSelectElement[];
    expect(selects.map((s) => s.value)).toEqual(['', '']);
    expect(el.textContent).toContain('Asocie una columna a Referencia');
    expect(c.puedeContinuar()).toBeFalse();
  });

  it('al asociar calcula la vista previa; con errores exige "omitir"', async () => {
    const { c, http, fixture, el } = await montar();
    elegir(c);
    http.expectOne(() => true).flush(ANALISIS);
    c.asociar(1, 'referencia');
    await esperar(400);
    const req = http.expectOne(() => true);
    const cuerpo = req.request.body as FormData;
    expect(JSON.parse(cuerpo.get('asociacion') as string)).toEqual({ 1: 'referencia' });
    req.flush(PREVIA);
    fixture.detectChanges();
    expect(Array.from(el.querySelectorAll('.conteo b')).map((b) => b.textContent)).toEqual(['2', '0', '1']);
    expect(el.textContent).toContain('Falta la referencia');
    expect(c.puedeContinuar()).toBeTrue();
    c.omitirErrores.set(false);
    expect(c.puedeContinuar()).toBeFalse();
  });

  it('un campo solo queda en una columna', async () => {
    const { c, http } = await montar();
    elegir(c);
    http.expectOne(() => true).flush(ANALISIS);
    c.asociar(1, 'referencia');
    c.asociar(2, 'referencia');
    expect(c.asociacion()).toEqual({ 2: 'referencia' });
  });

  it('confirmar envía la asociación y "omitir"; muestra el resultado', async () => {
    const { c, http, fixture, el } = await montar();
    elegir(c);
    http.expectOne(() => true).flush(ANALISIS);
    c.asociar(1, 'referencia');
    await esperar(400);
    http.expectOne(() => true).flush(PREVIA);
    c.irARevisar();
    expect(c.paso()).toBe(3);
    c.confirmar();
    const req = http.expectOne((r) => r.url.endsWith('/importar/confirmar'));
    const f = req.request.body as FormData;
    expect(f.get('omitirErrores')).toBe('true');
    expect(f.get('hoja')).toBe('Hoja1');
    req.flush({ idImportacion: 'IMP-1', creados: 2, actualizados: 0, omitidas: 1, movimientos: 2 });
    fixture.detectChanges();
    expect(c.paso()).toBe(4);
    expect(el.textContent).toContain('2 productos nuevos');
  });

  it('si la confirmación falla, avisa que no se guardó nada', async () => {
    const { c, http } = await montar();
    elegir(c);
    http.expectOne(() => true).flush(ANALISIS);
    c.asociar(1, 'referencia');
    await esperar(400);
    http.expectOne(() => true).flush(PREVIA);
    c.irARevisar();
    c.confirmar();
    http.expectOne(() => true).flush({ ok: false }, { status: 500, statusText: 'Error' });
    expect(c.error()).toContain('No se guardó nada');
  });
});
