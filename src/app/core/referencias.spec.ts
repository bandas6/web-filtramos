import { claveDeBusqueda } from './referencias';

describe('claveDeBusqueda', () => {
  it('ignora mayúsculas, espacios, guiones y tildes', () => {
    expect(claveDeBusqueda('af-100')).toBe('AF100');
    expect(claveDeBusqueda('AF 100')).toBe('AF100');
    expect(claveDeBusqueda('Compresión')).toBe('COMPRESION');
    expect(claveDeBusqueda(null)).toBe('');
  });
});
