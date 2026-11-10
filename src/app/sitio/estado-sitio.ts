import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AjustesPublicos, SitioApi } from './sitio-api';

// Ajustes públicos del negocio (WhatsApp, tiempos, garantía…). Se cargan una vez.
@Injectable({ providedIn: 'root' })
export class AjustesSitio {
  private api = inject(SitioApi);
  readonly valores = signal<AjustesPublicos>({});
  readonly whatsapp = computed(() => this.valores().whatsappVentas || null);
  private cargado = false;

  cargar() {
    if (this.cargado) return;
    this.cargado = true;
    this.api.ajustes().subscribe({ next: (a) => this.valores.set(a), error: () => { this.cargado = false; } });
  }
}

export interface LineaPedido {
  slug: string;
  referencia: string;
  tipoNombre: string;
  imagen: string | null;
  cantidad: number;
  precio: number | null;
  volumen: { desde: number; precio: number }[];
}

const CLAVE = 'filtramos_pedido';

// Pedido (cotización) del visitante. Vive en el navegador; en el servidor está vacío.
@Injectable({ providedIn: 'root' })
export class PedidoSitio {
  private navegador = isPlatformBrowser(inject(PLATFORM_ID));
  readonly lineas = signal<LineaPedido[]>(this.leer());
  readonly unidades = computed(() => this.lineas().reduce((s, l) => s + l.cantidad, 0));

  private leer(): LineaPedido[] {
    if (!this.navegador) return [];
    try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; }
  }
  private guardar(l: LineaPedido[]) {
    this.lineas.set(l);
    if (this.navegador) try { localStorage.setItem(CLAVE, JSON.stringify(l)); } catch { /* almacenamiento no disponible */ }
  }

  agregar(linea: LineaPedido) {
    const actual = this.lineas();
    const i = actual.findIndex((l) => l.slug === linea.slug);
    if (i >= 0) this.guardar(actual.map((l, j) => (j === i ? { ...l, ...linea, cantidad: l.cantidad + linea.cantidad } : l)));
    else this.guardar([...actual, linea]);
  }
  cambiarCantidad(slug: string, cantidad: number) {
    const n = Math.max(1, Math.min(100000, Math.floor(cantidad) || 1));
    this.guardar(this.lineas().map((l) => (l.slug === slug ? { ...l, cantidad: n } : l)));
  }
  quitar(slug: string) { this.guardar(this.lineas().filter((l) => l.slug !== slug)); }
  vaciar() { this.guardar([]); }
}
