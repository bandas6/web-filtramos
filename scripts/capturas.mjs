// Capturas del panel a 1440 px y 390 px con el Chrome instalado (no descarga navegadores).
// Uso: CAPTURA_EMAIL=... CAPTURA_PASSWORD=... npm run capturas -- [carpeta-salida]
// Requiere el panel en http://localhost:4200 y la API corriendo.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.CAPTURA_URL || 'http://localhost:4200';
const SALIDA = process.argv[2] || 'capturas';
const { CAPTURA_EMAIL: email, CAPTURA_PASSWORD: password } = process.env;

const ANCHOS = [
  { nombre: 'escritorio', width: 1440, height: 900 },
  { nombre: 'movil', width: 390, height: 844 }
];

// [nombre, ruta, requiere sesión]
const PANTALLAS = [
  ['login', '/login', false],
  ['productos', '/pages/catalogo-admin', true]
];

mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errores = [];

for (const ancho of ANCHOS) {
  const page = await browser.newPage({ viewport: { width: ancho.width, height: ancho.height } });
  page.on('pageerror', (e) => errores.push(`${ancho.nombre}: ${e.message}`));
  let conSesion = false;

  for (const [nombre, ruta, requiereSesion] of PANTALLAS) {
    if (requiereSesion && !conSesion) {
      if (!email || !password) { console.log(`(omitida ${nombre}: faltan CAPTURA_EMAIL/CAPTURA_PASSWORD)`); continue; }
      await page.goto(`${BASE}/login`);
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contraseña').fill(password);
      await page.getByRole('button', { name: 'Entrar' }).click();
      await page.waitForURL('**/pages/**');
      conSesion = true;
    }
    await page.goto(`${BASE}${ruta}`);
    await page.waitForLoadState('networkidle');
    const archivo = join(SALIDA, `${nombre}-${ancho.width}.png`);
    await page.screenshot({ path: archivo, fullPage: true });
    // Desbordamiento horizontal: la página no debe ser más ancha que la ventana
    const anchoPagina = await page.evaluate(() => document.documentElement.scrollWidth);
    console.log(`${archivo}${anchoPagina > ancho.width ? `  ⚠ desborda: ${anchoPagina}px` : ''}`);
  }
  await page.close();
}

await browser.close();
if (errores.length) {
  console.log('Errores de JavaScript en la página:');
  errores.forEach((e) => console.log(' -', e));
  process.exitCode = 1;
}
