import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Detrás del proxy del hosting: protocolo y dominio reales para las URL absolutas
app.set('trust proxy', 1);

const origen = (req: express.Request) => `${req.protocol}://${req.get('host')}`;
const escaparXml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

// sitemap.xml con todas las fichas publicadas (los datos vienen de la API)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const r = await fetch(`${environment.apiUrl}/public/sitemap`);
    const { productos = [] } = (await r.json()) as { productos?: { slug: string; actualizado?: string }[] };
    const base = origen(req);
    const urls = [
      `<url><loc>${base}/</loc></url>`,
      `<url><loc>${base}/catalogo</loc></url>`,
      `<url><loc>${base}/a-medida</loc></url>`,
      ...productos.map((p) => `<url><loc>${escaparXml(`${base}/filtro/${p.slug}`)}</loc>${p.actualizado ? `<lastmod>${p.actualizado.slice(0, 10)}</lastmod>` : ''}</url>`)
    ];
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600')
      .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
  } catch {
    res.status(503).type('text/plain').send('Sitemap no disponible');
  }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /pedido\nSitemap: ${origen(req)}/sitemap.xml\n`);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
