import { environment } from '../../environments/environment';
import { urlImagen } from './formato';

describe('urlImagen', () => {
  const C = 'https://res.cloudinary.com/nube/image/upload/v1/filtramos-dev/productos/a.png';

  it('rutas locales van a la API; sin ruta, null', () => {
    expect(urlImagen('/uploads/a.png')).toBe(`${environment.publicUrl}/uploads/a.png`);
    expect(urlImagen(null)).toBeNull();
  });

  it('Cloudinary con ancho pide versión reducida y en formato automático', () => {
    expect(urlImagen(C, 480)).toBe('https://res.cloudinary.com/nube/image/upload/f_auto,q_auto,c_limit,w_480/v1/filtramos-dev/productos/a.png');
    expect(urlImagen(C)).toBe(C);
  });

  it('otras URL https quedan igual', () => {
    expect(urlImagen('https://ejemplo.com/a.png', 480)).toBe('https://ejemplo.com/a.png');
  });
});
