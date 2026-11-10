import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { providersDePrueba } from '../../../testing/providers';
import { authFalso } from '../../../testing/auth-falso';
import { UsuariosPage } from './usuarios-page';

async function montar(usuarios: any[]) {
  await TestBed.configureTestingModule({ imports: [UsuariosPage], providers: [...providersDePrueba, authFalso('admin', 'yo')] }).compileComponents();
  const fixture = TestBed.createComponent(UsuariosPage);
  fixture.detectChanges();
  TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/admin/usuarios')).flush({ ok: true, usuarios });
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const botonDesactivar = (fila: Element) =>
  Array.from(fila.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Desactivar') as HTMLButtonElement;

describe('UsuariosPage', () => {
  it('no deja desactivarse a sí mismo ni quitar el último admin', async () => {
    const el = await montar([
      { uid: 'yo', nombre: 'Yo', email: 'yo@x.test', rol: 'admin', estado: true },
      { uid: 'b', nombre: 'Bodega', email: 'b@x.test', rol: 'bodega', estado: true }
    ]);
    const filas = el.querySelectorAll('tbody tr');
    expect(botonDesactivar(filas[0]).disabled).toBeTrue();
    expect((filas[0].querySelector('select') as HTMLSelectElement).disabled).toBeTrue(); // último admin
    expect(botonDesactivar(filas[1]).disabled).toBeFalse();
    expect(filas[0].textContent).toContain('Usted');
  });

  it('con dos admins activos, el otro admin sí se puede cambiar', async () => {
    const el = await montar([
      { uid: 'yo', nombre: 'Yo', email: 'yo@x.test', rol: 'admin', estado: true },
      { uid: 'a2', nombre: 'Otra', email: 'a2@x.test', rol: 'admin', estado: true }
    ]);
    const filas = el.querySelectorAll('tbody tr');
    expect((filas[1].querySelector('select') as HTMLSelectElement).disabled).toBeFalse();
    expect(botonDesactivar(filas[1]).disabled).toBeFalse();
  });
});
