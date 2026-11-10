// Pruebas de la etapa de usabilidad: sitio (menú, tarjetas, catálogo), panel (ayuda, inicio, buscador) y login.
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { providersDePrueba } from '../testing/providers';
import { authFalso } from '../testing/auth-falso';
import { errorDeLogin } from './view/auth/login/login';
import { lineaEquivalencias } from './sitio/componentes/tarjeta-producto';
import { TarjetaProducto } from './sitio/sitio-api';
import { SitioLayout } from './sitio/layout/sitio-layout';
import { AyudaSeccion, InfoCampo } from './admin/ayuda/componentes';
import { AYUDA_SECCION } from './admin/ayuda/textos';
import { BuscadorReferencia, OpcionReferencia } from './admin/inventario/buscador-referencia';
import { InicioPanelPage } from './admin/inicio/inicio-panel';
import { Auth } from './services/auth/auth';

const tarjeta = (extra: Partial<TarjetaProducto>): TarjetaProducto => ({
  slug: 'x', referencia: 'X', tipo: 'aire-primario', tipoNombre: 'Aire primario', precio: 1, tieneVolumen: false,
  equivalencias: [], diametroExterno: null, alto: null, imagen: null, disponibilidad: { estado: 'disponible', quedan: null }, ...extra
});

describe('Login: mensajes de error', () => {
  const err = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });
  it('distingue credenciales, bloqueo con minutos y servidor', () => {
    expect(errorDeLogin(err(401)).tipo).toBe('credenciales');
    const bloqueo = errorDeLogin(err(429, { minutos: 7 }));
    expect(bloqueo.tipo).toBe('bloqueo');
    expect(bloqueo.detalle).toContain('7 minutos');
    expect(errorDeLogin(err(429, { minutos: 1 })).detalle).toContain('1 minuto ');
    expect(errorDeLogin(err(0)).tipo).toBe('servidor');
    expect(errorDeLogin(err(0)).detalle).toContain('No hay conexión');
    expect(errorDeLogin(err(503)).tipo).toBe('servidor');
  });
});

describe('Tarjeta: equivalencias en una línea', () => {
  it('muestra la primera y "+N" con el total real', () => {
    const e = lineaEquivalencias(tarjeta({ equivalencias: [{ marca: 'Donaldson', referencia: 'P1' }, { referencia: 'B' }, { referencia: 'C' }], totalEquivalencias: 5 }));
    expect(e).toEqual({ prefijo: 'Equivale a', texto: 'Donaldson P1', mas: 4 });
    expect(lineaEquivalencias(tarjeta({ equivalencias: [{ referencia: 'A' }] }))?.mas).toBe(0);
    expect(lineaEquivalencias(tarjeta({}))).toBeNull();
  });
  it('en kits muestra dos componentes y "+N"', () => {
    expect(lineaEquivalencias(tarjeta({ tipo: 'kit', kit: ['A', 'B', 'C'] }))).toEqual({ prefijo: 'Incluye', texto: 'A, B', mas: 1 });
  });
});

describe('Sitio: menú y contacto', () => {
  async function montar(ajustes: Record<string, string>) {
    await TestBed.configureTestingModule({ imports: [SitioLayout], providers: providersDePrueba }).compileComponents();
    const f = TestBed.createComponent(SitioLayout);
    f.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/public/ajustes')).flush({ ok: true, ajustes });
    await f.whenStable();
    f.detectChanges();
    return f;
  }

  it('el botón abre el menú; Escape lo cierra y devuelve el foco', async () => {
    const f = await montar({});
    const el = f.nativeElement as HTMLElement;
    const boton = el.querySelector<HTMLButtonElement>('.cabecera__menu')!;
    boton.click();
    f.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(boton.getAttribute('aria-label')).toBe('Cerrar menú');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(boton);
  });

  it('enlaces del menú y Contacto solo si hay datos en Ajustes', async () => {
    let f = await montar({});
    const textos = (x: HTMLElement) => Array.from(x.querySelectorAll('#nav-principal a')).map((a) => a.textContent?.trim());
    expect(textos(f.nativeElement)).toEqual(['Catálogo', 'Kits', 'Fabricación a medida', 'Empresas']);
    expect((f.nativeElement as HTMLElement).querySelector('.pie')?.textContent).not.toContain('Contacto');
    TestBed.resetTestingModule();
    f = await montar({ correoContacto: 'ventas@ejemplo.test' });
    expect(textos(f.nativeElement)).toContain('Contacto');
    expect((f.nativeElement as HTMLElement).querySelector('.pie')?.textContent).toContain('ventas@ejemplo.test');
  });
});

describe('Panel: cuadro de ayuda', () => {
  @Component({ imports: [AyudaSeccion], template: `<f-ayuda [seccion]="seccion()" />` })
  class Anfitrion { seccion = signal<'inventario' | 'inicio'>('inventario'); }

  async function montar(rol: 'admin' | 'bodega' | 'ventas', cerradas: string[] = []) {
    await TestBed.configureTestingModule({ imports: [Anfitrion], providers: [...providersDePrueba, authFalso(rol, 'yo', { ayudaCerrada: cerradas })] }).compileComponents();
    const f = TestBed.createComponent(Anfitrion);
    f.detectChanges();
    return f;
  }

  it('se cierra, guarda la preferencia y se reabre con "Ayuda"', async () => {
    const f = await montar('admin');
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.ayuda h2')?.textContent).toContain(AYUDA_SECCION.inventario.titulo);
    el.querySelector<HTMLButtonElement>('.ayuda__cerrar')!.click();
    f.detectChanges();
    const auth = TestBed.inject(Auth) as unknown as { guardarPreferencias: jasmine.Spy };
    expect(auth.guardarPreferencias).toHaveBeenCalledWith({ ayudaCerrada: ['inventario'] });
    expect(el.querySelector('.ayuda')).toBeNull();
    el.querySelector<HTMLButtonElement>('.ayuda__abrir')!.click();
    f.detectChanges();
    expect(auth.guardarPreferencias).toHaveBeenCalledWith({ ayudaCerrada: [] });
    expect(el.querySelector('.ayuda')).not.toBeNull();
  });

  it('respeta la preferencia guardada y adapta el texto al rol', async () => {
    let f = await montar('admin', ['inventario']);
    expect((f.nativeElement as HTMLElement).querySelector('.ayuda')).toBeNull();
    TestBed.resetTestingModule();
    f = await montar('ventas');
    f.componentInstance.seccion.set('inicio');
    f.detectChanges();
    const texto = (f.nativeElement as HTMLElement).querySelector('.ayuda')?.textContent || '';
    expect(texto).toContain('Cotizaciones y pedidos');
    expect(texto).not.toContain('Primeros pasos');
  });
});

describe('Panel: "?" de un campo', () => {
  it('describe el campo al lector de pantalla, abre con clic y cierra con Escape', async () => {
    @Component({ imports: [InfoCampo], template: `<f-info campo="reservado" etiqueta="reservado" />` })
    class Anfitrion {}
    await TestBed.configureTestingModule({ imports: [Anfitrion], providers: providersDePrueba }).compileComponents();
    const f = TestBed.createComponent(Anfitrion);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const boton = el.querySelector('button')!;
    const globo = el.querySelector(`#${boton.getAttribute('aria-describedby')}`)!;
    expect(globo.textContent).toContain('apartadas');
    expect(boton.getAttribute('aria-label')).toBe('Qué es reservado');
    boton.click();
    f.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    boton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('Inventario: buscador de referencias', () => {
  const OPCIONES: OpcionReferencia[] = [
    { referencia: 'FT-AP-1021', tipo: 'Aire primario', disponible: 4 },
    { referencia: 'FT-AS-1022', tipo: 'Aire seguridad', disponible: 0 },
    { referencia: 'XX-AP-9', tipo: 'Aire primario', disponible: 1 }
  ];
  @Component({ imports: [BuscadorReferencia, ReactiveFormsModule], template: `<f-buscador-referencia [formControl]="ctrl" [opciones]="opciones" />` })
  class Anfitrion { ctrl = new FormControl(''); opciones = OPCIONES; }

  async function montar() {
    await TestBed.configureTestingModule({ imports: [Anfitrion], providers: providersDePrueba }).compileComponents();
    const f = TestBed.createComponent(Anfitrion);
    f.detectChanges();
    const input = (f.nativeElement as HTMLElement).querySelector('input')!;
    const escribir = (v: string) => { input.value = v; input.dispatchEvent(new Event('input')); f.detectChanges(); };
    const tecla = (key: string) => { input.dispatchEvent(new KeyboardEvent('keydown', { key })); f.detectChanges(); };
    return { f, input, escribir, tecla, el: f.nativeElement as HTMLElement };
  }

  it('sugiere primero las que empiezan igual y elige con flechas y Enter', async () => {
    const { f, input, escribir, tecla, el } = await montar();
    escribir('ap');
    const opciones = () => Array.from(el.querySelectorAll('[role=option] .combo__ref')).map((o) => o.textContent);
    expect(opciones()).toEqual(['FT-AP-1021', 'XX-AP-9']);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(f.componentInstance.ctrl.value).toBe('', 'texto parcial no llega al formulario');
    tecla('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toContain('-op-1');
    tecla('Enter');
    expect(f.componentInstance.ctrl.value).toBe('XX-AP-9');
    expect(input.value).toBe('XX-AP-9');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('acepta la referencia exacta escrita sin guiones y rechaza una que no existe', async () => {
    const { f, input, escribir, el } = await montar();
    escribir('ftas1022');
    expect(f.componentInstance.ctrl.value).toBe('FT-AS-1022');
    input.dispatchEvent(new Event('blur'));
    f.detectChanges();
    expect(input.value).toBe('FT-AS-1022');
    escribir('NO-EXISTE');
    input.dispatchEvent(new Event('blur'));
    f.detectChanges();
    expect(f.componentInstance.ctrl.value).toBe('');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(el.textContent).toContain('No existe esa referencia');
  });
});

describe('Panel: inicio', () => {
  const RESPUESTA = {
    ok: true,
    pasos: [
      { clave: 'whatsapp', hecho: false, noAplica: false }, { clave: 'usuarios', hecho: true, noAplica: false },
      { clave: 'importar', hecho: true, noAplica: false }, { clave: 'fotos', hecho: false, noAplica: false },
      { clave: 'borradores', hecho: true, noAplica: false }
    ],
    avisos: {
      stockBajo: { total: 1, items: [{ uid: 'p1', referencia: 'FT-1', disponible: 2, minimo: 5 }] },
      pedidosNuevos: 2, medidaNuevas: 1,
      borradores: { total: 1, items: [{ uid: 'p2', referencia: 'FT-2', motivos: [{ clave: 'sin-precio', texto: 'sin precio' }] }] }
    }
  };

  async function montar(rol: 'admin' | 'bodega' | 'ventas', noAplica: string[] = []) {
    await TestBed.configureTestingModule({ imports: [InicioPanelPage], providers: [...providersDePrueba, authFalso(rol, 'yo', { pasosNoAplica: noAplica })] }).compileComponents();
    const f = TestBed.createComponent(InicioPanelPage);
    f.detectChanges();
    TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/admin/inicio')).flush(RESPUESTA);
    await f.whenStable();
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('admin: avance de primeros pasos, "no aplica" y enlace al siguiente paso del borrador', async () => {
    const { f, el } = await montar('admin');
    expect(el.querySelector('.pasos__avance')?.textContent?.trim()).toBe('3 de 5');
    const botonNA = el.querySelector<HTMLButtonElement>('.paso button[aria-label="No aplica: Suba las fotos"]')!;
    botonNA.click();
    f.detectChanges();
    expect(el.querySelector('.pasos__avance')?.textContent?.trim()).toBe('4 de 5');
    const enlace = Array.from(el.querySelectorAll('a')).find((a) => a.textContent?.includes('Agregar precio'))!;
    expect(enlace.getAttribute('href')).toContain('editar=p2');
    expect(enlace.getAttribute('href')).toContain('campo=pf-precio');
  });

  it('el bloque se oculta cuando todo está hecho o marcado', async () => {
    const { el } = await montar('admin', ['whatsapp', 'fotos']);
    expect(el.querySelector('.pasos')).toBeNull();
  });

  it('bodega ve stock bajo; ventas ve cotizaciones; ninguno ve primeros pasos ni borradores', async () => {
    let { el } = await montar('bodega');
    expect(el.querySelector('.pasos')).toBeNull();
    expect(el.textContent).toContain('Stock bajo el mínimo');
    expect(el.textContent).not.toContain('Cotizaciones nuevas');
    expect(el.textContent).not.toContain('No se ven en la web');
    TestBed.resetTestingModule();
    ({ el } = await montar('ventas'));
    expect(el.textContent).toContain('Cotizaciones nuevas');
    expect(el.querySelector('.aviso-dia__num')?.textContent?.trim()).toBe('3');
    expect(el.textContent).not.toContain('Stock bajo el mínimo');
  });
});
