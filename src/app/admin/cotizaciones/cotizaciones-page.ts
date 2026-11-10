import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { Avisos } from '../../shared/ui/avisos';
import { Icono } from '../../shared/ui/icono';
import { enlaceWhatsapp, pesos, urlImagen, whatsappLegible } from '../../shared/formato';
import { AdminApi, mensajeDeError } from '../admin-api';
import { PedidoAdmin, RecordatorioAdmin, SIGUIENTES_ESTADOS, SolicitudMedidaAdmin } from '../modelos';

type Pestana = 'pedidos' | 'medida' | 'recordatorios';

const NOMBRE_ESTADO: Record<string, string> = {
  nuevo: 'Nuevo', confirmado: 'Confirmado', despachado: 'Despachado', cancelado: 'Cancelado',
  cotizado: 'Cotizado', cerrado: 'Cerrado', activo: 'Activo', inactivo: 'Inactivo'
};

import { AyudaSeccion, Vacio } from '../ayuda/componentes';
import { VACIOS } from '../ayuda/textos';
@Component({
  selector: 'app-cotizaciones-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AyudaSeccion, Vacio, Icono],
  templateUrl: './cotizaciones-page.html',
  styleUrl: './cotizaciones-page.scss'
})
export class CotizacionesPage implements OnInit {
  private api = inject(AdminApi);
  private avisos = inject(Avisos);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  auth = inject(Auth);

  readonly pesos = pesos;
  readonly urlImagen = urlImagen;
  readonly whatsappLegible = whatsappLegible;
  readonly nombreEstado = NOMBRE_ESTADO;
  readonly siguientes = SIGUIENTES_ESTADOS;
  readonly vacios = VACIOS;
  readonly pestanas: { valor: Pestana; texto: string }[] = [
    { valor: 'pedidos', texto: 'Pedidos' }, { valor: 'medida', texto: 'Fabricación a medida' }, { valor: 'recordatorios', texto: 'Recordatorios' }
  ];

  pestana = signal<Pestana>('pedidos');
  estado = signal('');
  pedidos = signal<PedidoAdmin[]>([]);
  medida = signal<SolicitudMedidaAdmin[]>([]);
  recordatorios = signal<RecordatorioAdmin[]>([]);
  cargando = signal(true);
  ocupado = signal<string | null>(null);
  error = signal<string | null>(null);

  puedeGestionar = computed(() => ['admin', 'ventas'].includes(this.auth.usuario()?.rol || ''));
  opcionesEstado = computed(() => ({
    pedidos: ['nuevo', 'confirmado', 'despachado', 'cancelado'],
    medida: ['nuevo', 'cotizado', 'cerrado'],
    recordatorios: ['activo', 'inactivo']
  })[this.pestana()]);

  ngOnInit() {
    this.route.queryParamMap.subscribe((q) => {
      const p = q.get('ver') as Pestana;
      this.pestana.set(['pedidos', 'medida', 'recordatorios'].includes(p) ? p : 'pedidos');
      this.estado.set(q.get('estado') || '');
      this.cargar();
    });
  }

  ir(p: Pestana) { this.router.navigate([], { queryParams: { ver: p === 'pedidos' ? null : p } }); }
  filtrar(estado: string) { this.router.navigate([], { queryParams: { estado: estado || null }, queryParamsHandling: 'merge' }); }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    const fin = () => this.cargando.set(false);
    const fallo = (e: unknown) => { this.error.set(mensajeDeError(e)); fin(); };
    if (this.pestana() === 'pedidos') this.api.pedidos(this.estado()).subscribe({ next: (r) => { this.pedidos.set(r.pedidos); fin(); }, error: fallo });
    if (this.pestana() === 'medida') this.api.solicitudesMedida(this.estado()).subscribe({ next: (r) => { this.medida.set(r.solicitudes); fin(); }, error: fallo });
    if (this.pestana() === 'recordatorios') this.api.recordatorios(this.estado()).subscribe({ next: (r) => { this.recordatorios.set(r.recordatorios); fin(); }, error: fallo });
  }

  fecha(f?: string) {
    return f ? new Date(f).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  }

  contactar(numero: string, mensaje: string) { return enlaceWhatsapp(numero, mensaje); }

  // ---- Pedidos
  cambiarPedido(p: PedidoAdmin, estado: PedidoAdmin['estado']) {
    const texto = { confirmado: `¿Confirmar el pedido #${p.numero}? Se reservará el stock.`, despachado: `¿Marcar el pedido #${p.numero} como despachado? Se descontará del stock.`, cancelado: `¿Cancelar el pedido #${p.numero}?` }[estado as 'confirmado'];
    if (texto && !confirm(texto)) return;
    this.ocupado.set(p.uid);
    this.api.cambiarEstadoPedido(p.uid, estado).subscribe({
      next: (act) => { this.ocupado.set(null); this.pedidos.update((l) => l.map((x) => (x.uid === act.uid ? act : x))); this.avisos.ok(`Pedido #${act.numero}: ${NOMBRE_ESTADO[act.estado].toLowerCase()}.`); },
      error: (e) => { this.ocupado.set(null); this.avisos.error(mensajeDeError(e)); }
    });
  }

  // ---- A medida
  cambiarMedida(s: SolicitudMedidaAdmin, cambios: Partial<SolicitudMedidaAdmin>) {
    this.api.actualizarSolicitudMedida(s.uid, cambios).subscribe({
      next: (act) => { this.medida.update((l) => l.map((x) => (x.uid === act.uid ? act : x))); this.avisos.ok('Solicitud actualizada.'); },
      error: (e) => this.avisos.error(mensajeDeError(e))
    });
  }

  // ---- Recordatorios
  cambiarRecordatorio(r: RecordatorioAdmin, cambios: { estado?: string; proximaFecha?: string | null }) {
    this.api.actualizarRecordatorio(r.uid, cambios).subscribe({
      next: (act) => { this.recordatorios.update((l) => l.map((x) => (x.uid === act.uid ? act : x))); this.avisos.ok('Recordatorio actualizado.'); },
      error: (e) => this.avisos.error(mensajeDeError(e))
    });
  }
}
