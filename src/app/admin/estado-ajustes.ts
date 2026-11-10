import { Injectable, inject, signal } from '@angular/core';
import { AdminApi } from './admin-api';

// Ajustes obligatorios que faltan (hoy: el WhatsApp de ventas). Lo usa el aviso del menú.
@Injectable({ providedIn: 'root' })
export class EstadoAjustes {
  private api = inject(AdminApi);
  readonly faltantes = signal<string[]>([]);

  refrescar() {
    this.api.estadoAjustes().subscribe({ next: (f) => this.faltantes.set(f), error: () => {} });
  }
}
