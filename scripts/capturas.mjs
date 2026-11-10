// Capturas del panel a 1440 px y 390 px con el Chrome instalado (no descarga navegadores).
// Uso: npm run capturas -- [carpeta-salida] [pantalla1,pantalla2,...]
// Por defecto usa la API en memoria (npm run dev:memoria en filtramos-api) y su usuario demo.
// Variables: CAPTURA_URL, CAPTURA_EMAIL, CAPTURA_PASSWORD.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.CAPTURA_URL || 'http://localhost:4200';
const SALIDA = process.argv[2] || 'capturas';
const SOLO = process.argv[3] ? process.argv[3].split(',') : null;
const email = process.env.CAPTURA_EMAIL || 'admin@demo.local';
const password = process.env.CAPTURA_PASSWORD || 'demo-admin-12345';

const ANCHOS = [
  { nombre: 'escritorio', width: 1440, height: 900 },
  { nombre: 'movil', width: 390, height: 844 }
];

// nombre, ruta, requiere sesión, acción opcional antes de capturar
const PANTALLAS = [
  ['login', '/admin/login', false],
  ['productos', '/admin/productos', true],
  ['producto-nuevo', '/admin/productos', true, async (p) => { await p.getByRole('button', { name: 'Nuevo producto' }).click(); await p.waitForTimeout(400); }],
  ['producto-editar', '/admin/productos', true, async (p) => { await p.getByRole('button', { name: 'Editar DEMO-AP-001' }).click(); await p.waitForTimeout(600); }],
  ['kits', '/admin/productos?tipo=kit', true],
  ['imagenes', '/admin/imagenes', true],
  ['usuarios', '/admin/usuarios', true],
  ['ajustes', '/admin/ajustes', true],
  ['menu-movil', '/admin/productos', true, async (p, ancho) => { if (ancho < 900) { await p.getByRole('button', { name: 'Menú' }).click(); await p.waitForTimeout(200); } }]
];

mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const errores = [];

for (const ancho of ANCHOS) {
  const page = await browser.newPage({ viewport: { width: ancho.width, height: ancho.height } });
  page.on('pageerror', (e) => errores.push(`${ancho.nombre}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(`${ancho.nombre} consola: ${m.text().slice(0, 200)}`); });
  let conSesion = false;

  for (const [nombre, ruta, requiereSesion, accion] of PANTALLAS) {
    if (SOLO && !SOLO.includes(nombre)) continue;
    if (requiereSesion && !conSesion) {
      await page.goto(`${BASE}/admin/login`);
      await page.getByLabel('Correo').fill(email);
      await page.getByLabel('Contraseña').fill(password);
      await page.getByRole('button', { name: 'Entrar' }).click();
      await page.waitForURL('**/admin/productos**');
      conSesion = true;
    }
    await page.goto(`${BASE}${ruta}`);
    await page.waitForLoadState('networkidle');
    if (accion) await accion(page, ancho.width);
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
  console.log('Errores en la página:');
  [...new Set(errores)].forEach((e) => console.log(' -', e));
  process.exitCode = 1;
}
