import { environment } from '../../environments/environment';

const formatoPesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const pesos = (n: number | null | undefined) => (n || n === 0 ? formatoPesos.format(n) : '—');

// Imágenes: rutas propias (/uploads/...) se sirven desde la API; las https van tal cual.
// En Cloudinary, con ancho se pide una versión reducida en el mejor formato del navegador.
const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
export const urlImagen = (ruta: string | null | undefined, ancho?: number) => {
  if (!ruta) return null;
  if (!/^https:\/\//.test(ruta)) return `${environment.publicUrl}${ruta}`;
  const m = ancho ? CLOUDINARY.exec(ruta) : null;
  return m ? `${m[1]}f_auto,q_auto,c_limit,w_${Math.round(ancho!)}/${m[2]}` : ruta;
};

// Enlace de WhatsApp con mensaje. Sin número configurado devuelve null (el botón se oculta).
export const enlaceWhatsapp = (numero: string | null | undefined, mensaje: string) =>
  numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null;

// "573001234567" -> "+57 300 123 4567"
export const whatsappLegible = (n: string | null | undefined) => {
  if (!n) return '';
  const m = /^(57)(\d{3})(\d{3})(\d{4})$/.exec(n);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${n}`;
};
