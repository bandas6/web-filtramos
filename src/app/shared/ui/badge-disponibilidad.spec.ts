import { TestBed } from '@angular/core/testing';
import { providersDePrueba } from '../../../testing/providers';
import { BadgeDisponibilidad, Disponibilidad } from './badge-disponibilidad';

function texto(estado: Disponibilidad, extra: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ imports: [BadgeDisponibilidad], providers: providersDePrueba });
  const f = TestBed.createComponent(BadgeDisponibilidad);
  f.componentRef.setInput('estado', estado);
  f.componentRef.setInput('variante', 'bloque');
  for (const [k, v] of Object.entries(extra)) f.componentRef.setInput(k, v);
  f.detectChanges();
  const t = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.disp > div')).map((d) => d.textContent?.trim()).join(' ');
  TestBed.resetTestingModule();
  return t;
}

describe('BadgeDisponibilidad', () => {
  it('con los tiempos de Ajustes', () => {
    expect(texto('disponible', { tiempoDespacho: '24–48 h' })).toBe('Disponible Despacho en 24–48 h');
    expect(texto('ultimas', { quedan: 3, tiempoDespacho: '24–48 h' })).toBe('Últimas unidades Quedan 3 · despacho en 24–48 h');
    expect(texto('bajo-pedido', { tiempoFabricacion: '8 días hábiles' })).toBe('Bajo pedido Lo fabricamos en 8 días hábiles');
  });

  it('sin ajustes no inventa tiempos', () => {
    expect(texto('disponible')).toBe('Disponible');
    expect(texto('ultimas')).toBe('Últimas unidades');
    expect(texto('bajo-pedido')).toBe('Bajo pedido Lo fabricamos para usted');
  });
});
