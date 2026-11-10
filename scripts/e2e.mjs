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
  await page.waitForURL((u) => new URL(u).pathname === '/admin');
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
  const txt = await admin.getByRole('alert').innerText();
  esperar(txt.includes('Correo o contraseña incorrectos'), `mensaje: ${txt}`);
});

await paso('Login: usuarios de demostración (solo API en memoria) llenan el formulario', admin, async () => {
  await admin.getByRole('heading', { name: 'Usuarios de demostración' }).waitFor();
  await admin.locator('.demo__usuario', { hasText: 'bodega@demo.local' }).click();
  esperar(await admin.getByLabel('Correo').inputValue() === 'bodega@demo.local', 'no llenó el correo');
});

await paso('Ruta protegida sin sesión redirige al login', admin, async () => {
  await admin.goto(`${BASE}/admin/inventario`);
  await admin.waitForURL('**/admin/login**');
});

await paso('Login admin', admin, () => entrar(admin, 'admin'));

await paso('Inicio del panel: "No aplica" cuenta en el avance y se guarda por usuario', admin, async () => {
  const avance = () => admin.locator('.pasos__avance').innerText();
  const limpiarNoAplica = () => admin.evaluate(async (api) => {
    await fetch(`${api}/api/auth/preferencias`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('filtramos_token')}` },
      body: JSON.stringify({ pasosNoAplica: [] })
    });
  }, API);
  // Parte de cero aunque una corrida anterior haya dejado pasos marcados
  await limpiarNoAplica();
  await admin.reload();
  await admin.getByRole('heading', { name: 'Avisos de hoy' }).waitFor();
  if (!(await admin.locator('section.pasos').count())) return; // todos los pasos ya están hechos con los datos
  const antes = await avance();
  // Toma el primer paso pendiente (depende de los datos del momento)
  const boton = admin.locator('.paso button[aria-label^="No aplica: "]').first();
  await boton.waitFor();
  const titulo = (await boton.getAttribute('aria-label')).replace('No aplica: ', '');
  await boton.click();
  await admin.waitForTimeout(500);
  const [hechos, total] = antes.split(' de ').map(Number);
  if (hechos + 1 === total) {
    // Era el último pendiente: el bloque se oculta y sigue oculto al recargar
    esperar(!(await admin.locator('section.pasos').count()), 'el bloque no se ocultó al completarse');
    await admin.reload();
    await admin.getByRole('heading', { name: 'Avisos de hoy' }).waitFor();
    esperar(!(await admin.locator('section.pasos').count()), 'el bloque reapareció al recargar');
    await limpiarNoAplica(); // se deja como estaba
    return;
  }
  const despues = await avance();
  esperar(parseInt(despues) === hechos + 1, `${antes} → ${despues}`);
  await admin.reload();
  await admin.locator('.pasos__avance').waitFor();
  esperar(await avance() === despues, 'no se guardó al recargar');
  await admin.getByRole('button', { name: `Deshacer: ${titulo}` }).click();
  await admin.waitForTimeout(500);
  esperar(await avance() === antes, 'no se deshizo');
});

await paso('Ayuda: el cuadro se cierra, sigue cerrado al recargar y se reabre', admin, async () => {
  await admin.goto(`${BASE}/admin/productos`);
  await admin.getByRole('button', { name: 'Cerrar la ayuda' }).click();
  await admin.reload();
  await admin.locator('.ayuda__abrir').waitFor();
  esperar(!(await admin.locator('section.ayuda').count()), 'el cuadro sigue visible');
  await admin.locator('.ayuda__abrir').click();
  await admin.locator('section.ayuda').waitFor();
});

await paso('Productos: "Agregar precio" abre el borrador con el foco en el precio', admin, async () => {
  await admin.getByRole('button', { name: 'Agregar precio a DEMO-AP-002' }).click();
  await admin.getByRole('dialog').waitFor();
  await admin.waitForTimeout(300);
  const foco = await admin.evaluate(() => document.activeElement?.id);
  esperar(foco === 'pf-precio', `foco en ${foco}`);
  await admin.getByRole('button', { name: 'Cancelar' }).click();
});

await paso('Inventario: el buscador sugiere referencias y se elige con el teclado', admin, async () => {
  await admin.goto(`${BASE}/admin/inventario`);
  const combo = admin.getByRole('combobox', { name: 'Referencia', exact: true });
  await combo.fill('demo-ap');
  const lista = admin.getByRole('listbox', { name: 'Referencias' });
  await lista.getByRole('option').first().waitFor();
  const n = await lista.getByRole('option').count();
  esperar(n === 2, `${n} sugerencias`);
  await combo.press('ArrowDown');
  await admin.waitForFunction(() => document.querySelector('[role=combobox]')?.getAttribute('aria-activedescendant')?.endsWith('-op-1'));
  await combo.press('Enter');
  await admin.waitForFunction(() => document.querySelector('[role=combobox]')?.getAttribute('aria-expanded') === 'false');
  esperar(await combo.inputValue() === 'DEMO-AP-002', `quedó "${await combo.inputValue()}"`);
  await combo.fill('NO-EXISTE');
  await admin.locator('#mv-cant').click();
  await admin.getByText('No existe esa referencia').waitFor();
});

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

await paso('Sitio: el inicio no tiene buscador en el encabezado; el catálogo sí', cliente, async () => {
  await cliente.goto(BASE);
  esperar(!(await cliente.locator('#cab-q').count()), 'hay buscador de encabezado en el inicio');
  await cliente.goto(`${BASE}/catalogo`);
  await cliente.locator('#cab-q').fill('A-101');
  await cliente.locator('#cab-q').press('Enter');
  await cliente.waitForURL('**/catalogo?q=A-101');
  await cliente.locator('.tarjeta-p__ref', { hasText: 'DEMO-AS-001' }).waitFor();
});

await paso('Catálogo: filtro de disponibilidad en la URL y coincide con los badges', cliente, async () => {
  await cliente.goto(`${BASE}/catalogo`);
  await cliente.getByLabel('Bajo pedido').check();
  await cliente.waitForURL('**disponibilidad=bajo-pedido**');
  await cliente.waitForLoadState('networkidle');
  const badges = await cliente.locator('app-tarjeta-producto f-disponibilidad').allInnerTexts();
  esperar(badges.length > 0 && badges.every((b) => b.includes('Bajo pedido')), `badges: ${badges.join(', ')}`);
  const conteo = await cliente.locator('.conteo b').innerText();
  esperar(Number(conteo) === badges.length, `conteo ${conteo} vs ${badges.length} tarjetas`);
});

await paso('Catálogo: orden por precio de mayor a menor', cliente, async () => {
  await cliente.goto(`${BASE}/catalogo`);
  await cliente.locator('#c-orden').selectOption('precio-desc');
  await cliente.waitForURL('**orden=precio-desc**');
  await cliente.waitForLoadState('networkidle');
  const precios = (await cliente.locator('.tarjeta-p__valor').allInnerTexts()).map((t) => Number(t.replace(/\D/g, ''))).filter(Boolean);
  esperar(precios.every((p, i) => i === 0 || precios[i - 1] >= p), `orden: ${precios.join(' > ')}`);
});

await paso('Catálogo: rango de diámetro externo', cliente, async () => {
  await cliente.goto(`${BASE}/catalogo`);
  await cliente.locator('#c-dmin').fill('250');
  await cliente.locator('#c-dmax').fill('310');
  await cliente.getByRole('button', { name: 'Aplicar' }).click();
  await cliente.waitForURL('**diamMax=310**');
  await cliente.waitForLoadState('networkidle');
  const refs = await cliente.locator('.tarjeta-p__ref').allInnerTexts();
  esperar(refs.length && refs.every((r) => ['DEMO-AP-001', 'DEMO-AP-002'].includes(r.trim()) || r.startsWith('DEMO-E2E')), `refs: ${refs.join(', ')}`);
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
  await cliente.goto(`${BASE}/a-medida`);
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

await paso('Móvil: menú del sitio abre, Escape lo cierra y el foco vuelve al botón', movil, async () => {
  await movil.goto(`${BASE}/catalogo`);
  const boton = movil.getByRole('button', { name: 'Abrir menú' });
  await boton.click();
  await movil.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Fabricación a medida' }).waitFor();
  await movil.keyboard.press('Escape');
  await movil.getByRole('button', { name: 'Abrir menú' }).waitFor();
  const foco = await movil.evaluate(() => document.activeElement?.getAttribute('aria-controls'));
  esperar(foco === 'nav-principal', `foco en ${foco}`);
  esperar(!(await movil.getByRole('navigation', { name: 'Principal' }).isVisible()), 'el menú sigue visible');
});

await paso('Móvil: filtros del catálogo en panel; "Ver N resultados" aplica y cierra', movil, async () => {
  await movil.goto(`${BASE}/catalogo`);
  await movil.getByRole('button', { name: /^Filtros/ }).click();
  const panel = movil.getByRole('dialog', { name: 'Filtros' });
  await panel.waitFor();
  await panel.getByLabel('Disponible', { exact: true }).check();
  await movil.waitForURL('**disponibilidad=disponible**');
  await panel.getByRole('button', { name: /^Ver \d+ resultado/ }).click();
  await panel.waitFor({ state: 'hidden' });
  const cuenta = await movil.locator('.abrir-filtros .cuenta').innerText();
  esperar(cuenta === '1', `cuenta de filtros ${cuenta}`);
});

await paso('Móvil: el inicio ronda los 2.500 px (guía) y no desborda', movil, async () => {
  await movil.goto(BASE);
  await movil.waitForLoadState('networkidle');
  const [alto, ancho] = await movil.evaluate(() => [document.documentElement.scrollHeight, document.documentElement.scrollWidth]);
  // Guía, no límite estricto: con WhatsApp configurado se suma el botón flotante y la franja de asesoría
  console.log(`    alto del inicio en celular: ${alto}px`);
  esperar(alto <= 2700 && ancho <= 390, `alto ${alto}px, ancho ${ancho}px`);
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
