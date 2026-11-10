import { DOCUMENT, Injectable, PLATFORM_ID, REQUEST, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

// Título, descripción, canónica, Open Graph y JSON-LD de cada página (se renderizan en el servidor).
// El dominio sale de la petición (servidor) o de la ventana (navegador): no se escribe a mano.
@Injectable({ providedIn: 'root' })
export class Seo {
  private titulo = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);
  private request = inject(REQUEST, { optional: true });
  private navegador = isPlatformBrowser(inject(PLATFORM_ID));

  origen(): string {
    if (this.navegador) return this.doc.location.origin;
    try { return this.request ? new URL(this.request.url).origin : ''; } catch { return ''; }
  }

  pagina(o: { titulo: string; descripcion: string; ruta: string; imagen?: string | null; tipo?: string; indexar?: boolean; jsonLd?: object | null }) {
    const url = `${this.origen()}${o.ruta}`;
    this.titulo.setTitle(o.titulo);
    const descripcion = o.descripcion.slice(0, 300);
    this.meta.updateTag({ name: 'description', content: descripcion });
    this.meta.updateTag({ name: 'robots', content: o.indexar === false ? 'noindex' : 'index, follow' });
    this.meta.updateTag({ property: 'og:title', content: o.titulo });
    this.meta.updateTag({ property: 'og:description', content: descripcion });
    this.meta.updateTag({ property: 'og:type', content: o.tipo || 'website' });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:locale', content: 'es_CO' });
    if (o.imagen) this.meta.updateTag({ property: 'og:image', content: o.imagen });
    else this.meta.removeTag("property='og:image'");

    let canonica = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonica) {
      canonica = this.doc.createElement('link');
      canonica.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(canonica);
    }
    canonica.setAttribute('href', url);

    this.doc.getElementById('json-ld')?.remove();
    if (o.jsonLd) {
      const s = this.doc.createElement('script');
      s.id = 'json-ld';
      s.type = 'application/ld+json';
      // "<" escapado para que un dato no pueda cerrar la etiqueta script
      s.textContent = JSON.stringify(o.jsonLd).replace(/</g, '\\u003c');
      this.doc.head.appendChild(s);
    }
  }
}
