import { TestBed } from '@angular/core/testing';
import { providersDePrueba } from '../../../testing/providers';
import { Catalogo } from './catalogo';

describe('Catalogo', () => {
  it('se crea', () => {
    TestBed.configureTestingModule({ providers: providersDePrueba });
    expect(TestBed.inject(Catalogo)).toBeTruthy();
  });
});
