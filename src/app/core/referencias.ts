// Igual que utils/referencias.js de la API: solo letras y números, en mayúsculas y sin tildes.
// "af100" encuentra "AF-100".
export const claveDeBusqueda = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
