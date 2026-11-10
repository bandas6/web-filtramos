// Pruebas de punta a punta en el navegador (Chrome instalado) contra la API EN MEMORIA.
// Requiere: `npm run dev:memoria` en filtramos-api y `npm start` aquí. Nunca contra una base real.
// Uso: npm run e2e -- [carpeta-fallos]   Variable: E2E_URL (por defecto http://localhost:4200)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.E2E_URL || 'http://localhost:4200';
const API = process.env.E2E_API || 'http://localhost:8080';
const SALIDA = process.argv[2] || 'e2e-fallos';
const CLAVES = { admin: 'demo-admin-12345', bodega: 'demo-bodega-12345', ventas: 'demo-ventas-12345' };
const T = 8000;

// Seguridad: la API debe ser la de memoria (solo tiene productos DEMO-)
const salud = await fetch(`${API}/api/public/productos?limite=50`).then((r) => r.json()).catch(() => null);
if (!salud?.productos?.length || salud.productos.some((p) => !p.referencia.startsWith('DEMO-'))) {
  console.error('La API no parece ser la de memoria (hay productos que no son DEMO-). Se detiene.');
  process.exit(2);
}

mkdirSync(SALIDA, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const resultados = [];
const erroresPagina = [];
// Respuestas de error que los pasos provocan a propósito (clave incorrecta, salida sin stock, borrador)
const esperados = ['status of 401', 'status of 400', 'status of 404'];
// Sufijo único: se puede repetir sin reiniciar la API en memoria
const ID = Date.now().toString(36).toUpperCase().slice(-5);
const REF = `DEMO-E2E-${ID}`;
const TALLER = `Taller E2E ${ID}`;
const VENDEDOR = `Vendedor E2E ${ID}`;
const CORREO = `vendedor.e2e.${ID.toLowerCase()}@demo.local`;

async function nuevaPagina(nombre, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.setDefaultTimeout(T);
  page.on('pageerror', (e) => erroresPagina.push(`${nombre}: ${e.message}`));
  // Los confirm() de la app se aceptan, como lo haría el usuario
  page.on('dialog', (d) => d.accept());
  page.on('console', (m) => { if (m.type() === 'error' && !esperados.some((e) => m.text().includes(e))) erroresPagina.push(`${nombre} consola: ${m.text().slice(0, 200)}`); });
  page.on('response', (r) => { if (r.status() >= 500) erroresPagina.push(`${nombre}: HTTP ${r.status()} ${r.url()}`); });
  return page;
}

async function paso(nombre, page, fn) {
  const t0 = Date.now();
  try {
    await fn();
    resultados.push({ nombre, ok: true, ms: Date.now() - t0 });
    console.log(`✔ ${nombre}`);
  } catch (e) {
    const archivo = join(SALIDA, `${nombre.replace(/[^\w-]+/g, '_').slice(0, 60)}.png`);
    await page.screenshot({ path: archivo, fullPage: true }).catch(() => {});
    resultados.push({ nombre, ok: false, error: e.message.split('\n')[0], archivo });
    console.log(`✘ ${nombre}\n    ${e.message.split('\n')[0]}`);
  }
}

function esperar(cond, msg) { if (!cond) throw new Error(msg); }

async function entrar(page, rol, clave = CLAVES[rol], email = `${rol}@demo.local`) {
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(clave);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/admin/productos**');
}

async function filaStock(page, ref) {
  await page.goto(`${BASE}/admin/inventario`);
  await page.locator('#inv-q').fill(ref);
  const fila = page.locator('tr', { has: page.locator('.ref__codigo', { hasText: new RegExp(`^${ref}$`) }) });
  await fila.waitFor();
  await page.waitForTimeout(400);
  const num = async (etq) => Number((await fila.locator(`td[data-etiqueta="${etq}"]`).innerText()).trim());
  return { disponible: await num('Disponible'), reservado: await num('Reservado') };
}

// ---------------------------------------------------------------- Admin
const admin = await nuevaPagina('admin');

await paso('Login: contraseña incorrecta muestra error y no entra', admin, async () => {
  await admin.goto(`${BASE}/admin/login`);
  await admin.getByLabel('Correo').fill('admin@demo.local');
  await admin.getByLabel('Contraseña').fill('equivocada-123');
  await admin.getByRole('button', { name: 'Entrar' }).click();
  await admin.getByRole('alert').waitFor();
  esperar(admin.url().includes('/admin/login'), 'salió de la pantalla de login');
});

await paso('Ruta protegida sin sesión redirige al login', admin, async () => {
  await admin.goto(`${BASE}/admin/inventario`);
  await admin.waitForURL('**/admin/login**');
});

await paso('Login admin', admin, () => entrar(admin, 'admin'));

await paso('Ajustes: guardar WhatsApp de ventas quita el aviso', admin, async () => {
  await admin.goto(`${BASE}/admin/ajustes`);
  await admin.locator('#aj-whatsappVentas').fill('573001234567');
  await admin.getByRole('button', { name: 'Guardar ajustes' }).click();
  await admin.waitForTimeout(800);
  await admin.reload();
  await admin.locator('#aj-whatsappVentas').waitFor();
  const v = await admin.locator('#aj-whatsappVentas').inputValue();
  esperar(v.replace(/\D/g, '') === '573001234567', `valor guardado: "${v}"`);
  esperar(!(await admin.getByText('Falta el WhatsApp de ventas.').isVisible()), 'el aviso sigue visible');
});

await paso(`Productos: crear ${REF} publicado con foto y precio`, admin, async () => {
  await admin.goto(`${BASE}/admin/productos`);
  await admin.getByRole('button', { name: 'Nuevo producto' }).click();
  await admin.locator('#pf-ref').fill(REF);
  await admin.locator('#pf-tipo').selectOption('aire-primario');
  await admin.locator('#pf-precio').fill('77000');
  await admin.getByRole('button', { name: 'Agregar desde la biblioteca' }).click();
  await admin.locator('.biblioteca__item').first().click();
  const publicar = admin.locator('input[formcontrolname="publicar"]');
  if (!(await publicar.isChecked())) await publicar.check();
  await admin.getByRole('button', { name: 'Guardar', exact: true }).click();
  await admin.getByRole('dialog').waitFor({ state: 'detached' });
  await admin.locator('#p-q').fill(REF);
  await admin.locator('.producto__ref', { hasText: REF }).waitFor();
});

await paso('Productos: referencia vacía muestra error de validación', admin, async () => {
  await admin.getByRole('button', { name: 'Nuevo producto' }).click();
  await admin.getByRole('button', { name: 'Guardar', exact: true }).click();
  await admin.getByText('Escriba la referencia.').waitFor();
  await admin.getByRole('button', { name: 'Cancelar' }).click();
});

await paso('Inventario: entrada de 5 a DEMO-AP-002 sube el disponible', admin, async () => {
  const antes = await filaStock(admin, 'DEMO-AP-002');
  await admin.getByRole('radio', { name: 'Entrada' }).click();
  await admin.locator('#mv-ref').fill('DEMO-AP-002');
  await admin.locator('#mv-cant').fill('5');
  await admin.getByRole('button', { name: 'Guardar movimiento' }).click();
  await admin.waitForTimeout(800);
  const despues = await filaStock(admin, 'DEMO-AP-002');
  esperar(despues.disponible === antes.disponible + 5, `antes ${antes.disponible}, después ${despues.disponible}`);
});

await paso('Inventario: salida mayor al stock se rechaza', admin, async () => {
  await admin.getByRole('radio', { name: 'Salida' }).click();
  await admin.locator('#mv-ref').fill('DEMO-CO-001');
  await admin.locator('#mv-cant').fill('999');
  await admin.getByRole('button', { name: 'Guardar movimiento' }).click();
  await admin.locator('form.mov-form [role=alert]').waitFor();
});

// ---------------------------------------------------------------- Sitio público
const cliente = await nuevaPagina('cliente');
let numeroPedido = null;

await paso('Sitio: buscar por equivalencia A-001 encuentra DEMO-AP-001', cliente, async () => {
  await cliente.goto(BASE);
  await cliente.locator('#b-q').fill('A-001');
  await cliente.locator('#b-q').press('Enter');
  await cliente.waitForURL('**/catalogo**');
  await cliente.getByText('DEMO-AP-001').first().waitFor();
});

await paso(`Sitio: producto nuevo ${REF} aparece publicado`, cliente, async () => {
  await cliente.goto(`${BASE}/filtro/${REF.toLowerCase()}`);
  await cliente.getByRole('heading', { name: REF }).waitFor();
});

await paso('Sitio: producto en borrador (DEMO-CA-001) no se muestra', cliente, async () => {
  const r = await cliente.goto(`${BASE}/filtro/demo-ca-001`);
  esperar(r.status() === 404, `HTTP ${r.status()}`);
});

await paso('Sitio: agregar 3 × DEMO-AP-001 al pedido', cliente, async () => {
  await cliente.goto(`${BASE}/filtro/demo-ap-001`);
  await cliente.getByRole('button', { name: 'Más' }).click();
  await cliente.getByRole('button', { name: 'Más' }).click();
  await cliente.locator('.comprar__btn').click();
  await cliente.goto(`${BASE}/pedido`);
  await cliente.locator('.linea__ref', { hasText: 'DEMO-AP-001' }).waitFor();
  const cant = await cliente.getByLabel('Cantidad de DEMO-AP-001').inputValue();
  esperar(cant === '3', `cantidad ${cant}`);
});

await paso('Sitio: el pedido persiste al recargar', cliente, async () => {
  await cliente.reload();
  await cliente.locator('.linea__ref', { hasText: 'DEMO-AP-001' }).waitFor();
});

await paso('Sitio: enviar pedido vacío de datos muestra errores', cliente, async () => {
  await cliente.getByRole('button', { name: 'Enviar pedido de cotización' }).click();
  await cliente.getByText('Escriba su nombre.').waitFor();
  await cliente.getByText('Para enviar, acepte el tratamiento de datos.').waitFor();
});

await paso('Sitio: enviar pedido completo', cliente, async () => {
  await cliente.locator('#p-nombre').fill('Cliente Prueba E2E');
  await cliente.locator('#p-wa').fill('573009998877');
  await cliente.locator('#p-ciudad').fill('Medellín');
  await cliente.locator('#p-nota').fill('Pedido de prueba automática');
  await cliente.locator('.consentimiento input').check();
  await cliente.getByRole('button', { name: 'Enviar pedido de cotización' }).click();
  const titulo = cliente.getByRole('heading', { name: /Recibimos su pedido #/ });
  await titulo.waitFor();
  numeroPedido = (await titulo.innerText()).match(/#(\S+)/)[1];
  await cliente.getByRole('link', { name: /WhatsApp/ }).first().waitFor();
});

await paso('Sitio: solicitud de fabricación a medida', cliente, async () => {
  await cliente.goto(`${BASE}/#medida`);
  const f = cliente.locator('app-form-medida');
  await f.locator('#fm-nombre').fill(TALLER);
  await f.locator('#fm-wa').fill('573005556677');
  await f.locator('#fm-medidas').fill('Ø ext 310 mm, alto 420 mm, tapa cerrada');
  await f.locator('.consentimiento input').check();
  await f.getByRole('button', { name: 'Enviar solicitud' }).click();
  await f.getByRole('button', { name: 'Enviar otra' }).waitFor();
});

// ---------------------------------------------------------------- Gestión del pedido
await paso('Cotizaciones: el pedido llega con sus datos', admin, async () => {
  esperar(numeroPedido, 'no hubo número de pedido');
  await admin.goto(`${BASE}/admin/cotizaciones`);
  const item = admin.locator('li.item', { hasText: `#${numeroPedido}` });
  await item.waitFor();
  const txt = await item.innerText();
  esperar(txt.includes('Cliente Prueba E2E') && txt.includes('3 × DEMO-AP-001'), txt.slice(0, 200));
});

let antesPedido;
await paso('Cotizaciones: confirmar reserva 3 unidades', admin, async () => {
  antesPedido = await filaStock(admin, 'DEMO-AP-001');
  await admin.goto(`${BASE}/admin/cotizaciones`);
  await admin.locator('li.item', { hasText: `#${numeroPedido}` }).getByRole('button', { name: 'Confirmar (reserva stock)' }).click();
  await admin.locator('li.item', { hasText: `#${numeroPedido}` }).getByRole('button', { name: 'Marcar despachado' }).waitFor();
  const d = await filaStock(admin, 'DEMO-AP-001');
  esperar(d.reservado === antesPedido.reservado + 3, `reservado ${antesPedido.reservado} → ${d.reservado}`);
});

await paso('Cotizaciones: despachar descuenta el stock y libera la reserva', admin, async () => {
  await admin.goto(`${BASE}/admin/cotizaciones`);
  const item = admin.locator('li.item', { hasText: `#${numeroPedido}` });
  await item.getByRole('button', { name: 'Marcar despachado' }).click();
  await item.getByRole('button', { name: 'Marcar despachado' }).waitFor({ state: 'detached' });
  const d = await filaStock(admin, 'DEMO-AP-001');
  esperar(d.reservado === antesPedido.reservado, `reservado quedó en ${d.reservado}`);
  esperar(d.disponible === antesPedido.disponible - 3 || d.disponible + d.reservado === antesPedido.disponible + antesPedido.reservado - 3,
    `disponible ${antesPedido.disponible} → ${d.disponible}`);
});

await paso('Cotizaciones: la solicitud a medida aparece', admin, async () => {
  await admin.goto(`${BASE}/admin/cotizaciones`);
  await admin.getByRole('tab', { name: 'Fabricación a medida' }).click();
  await admin.locator('li.item', { hasText: TALLER }).waitFor();
});

// ---------------------------------------------------------------- Usuarios y roles
await paso('Usuarios: crear usuario de ventas', admin, async () => {
  await admin.goto(`${BASE}/admin/usuarios`);
  await admin.getByRole('button', { name: /Nuevo usuario/ }).click();
  await admin.locator('#u-nombre').fill(VENDEDOR);
  await admin.locator('#u-email').fill(CORREO);
  await admin.locator('#u-rol').selectOption('ventas');
  await admin.locator('#u-clave').fill('clave-e2e-12345');
  await admin.getByRole('button', { name: 'Crear usuario' }).click();
  await admin.getByText(VENDEDOR).first().waitFor();
});

await paso('Salir cierra la sesión', admin, async () => {
  await admin.getByRole('button', { name: 'Salir' }).click();
  await admin.waitForURL('**/admin/login**');
  await admin.goto(`${BASE}/admin/productos`);
  await admin.waitForURL('**/admin/login**');
});

const bodega = await nuevaPagina('bodega');
await paso('Rol bodega: sin Usuarios/Ajustes/Importar ni botón Nuevo producto', bodega, async () => {
  await entrar(bodega, 'bodega');
  const nav = await bodega.getByRole('navigation', { name: 'Panel' }).innerText();
  for (const t of ['Usuarios', 'Ajustes', 'Importar']) esperar(!nav.includes(t), `ve "${t}" en el menú`);
  esperar(!(await bodega.getByRole('button', { name: 'Nuevo producto' }).count()), 've Nuevo producto');
  await bodega.goto(`${BASE}/admin/usuarios`);
  await bodega.waitForTimeout(500);
  esperar(!bodega.url().includes('/admin/usuarios'), 'entró a /admin/usuarios');
});

await paso('Rol bodega: puede registrar movimientos', bodega, async () => {
  await bodega.goto(`${BASE}/admin/inventario`);
  await bodega.getByRole('button', { name: 'Guardar movimiento' }).waitFor();
});

const ventas = await nuevaPagina('ventas');
await paso('Usuario nuevo de ventas entra y ve cotizaciones', ventas, async () => {
  await entrar(ventas, 'ventas', 'clave-e2e-12345', CORREO);
  await ventas.goto(`${BASE}/admin/cotizaciones`);
  await ventas.locator('li.item', { hasText: `#${numeroPedido}` }).waitFor();
});

// ---------------------------------------------------------------- Móvil
const movil = await nuevaPagina('movil', { width: 390, height: 844 });
await paso('Móvil: agregar desde la barra inferior y ver el pedido sin desborde', movil, async () => {
  await movil.goto(`${BASE}/filtro/demo-as-001`);
  await movil.locator('.barra-movil__btn').click();
  await movil.goto(`${BASE}/pedido`);
  await movil.locator('.linea__ref', { hasText: 'DEMO-AS-001' }).waitFor();
  const ancho = await movil.evaluate(() => document.documentElement.scrollWidth);
  esperar(ancho <= 390, `desborda: ${ancho}px`);
});

await paso('Móvil: menú del panel abre y navega', movil, async () => {
  await entrar(movil, 'admin');
  await movil.getByRole('button', { name: 'Menú' }).click();
  await movil.getByRole('navigation', { name: 'Panel' }).getByRole('link', { name: 'Inventario' }).click();
  await movil.waitForURL('**/admin/inventario');
});

await browser.close();

const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} pasos correctos`);
const unicos = [...new Set(erroresPagina)];
if (unicos.length) { console.log('Errores en las páginas:'); unicos.forEach((e) => console.log(' -', e)); }
if (fallos.length || unicos.length) process.exitCode = 1;
