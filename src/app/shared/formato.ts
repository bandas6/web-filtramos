import { environment } from '../../environments/environment';

const formatoPesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export const pesos = (n: number | null | undefined) => (n || n === 0 ? formatoPesos.format(n) : '—');

// Imágenes: rutas propias (/uploads/...) se sirven desde la API; las https (Cloudinary, etapa E) van tal cual
export const urlImagen = (ruta: string | null | undefined) =>
  !ruta ? null : /^https:\/\//.test(ruta) ? ruta : `${environment.publicUrl}${ruta}`;

// Enlace de WhatsApp con mensaje. Sin número configurado devuelve null (el botón se oculta).
export const enlaceWhatsapp = (numero: string | null | undefined, mensaje: string) =>
  numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null;

// "573001234567" -> "+57 300 123 4567"
export const whatsappLegible = (n: string | null | undefined) => {
  if (!n) return '';
  const m = /^(57)(\d{3})(\d{3})(\d{4})$/.exec(n);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${n}`;
};
