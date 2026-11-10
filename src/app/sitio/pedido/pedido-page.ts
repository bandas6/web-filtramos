import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icono } from '../../shared/ui/icono';
import { enlaceWhatsapp, pesos, urlImagen } from '../../shared/formato';
import { AjustesSitio, LineaPedido, PedidoSitio } from '../estado-sitio';
import { Seo } from '../seo';
import { mensajeError, precioPorCantidad, SitioApi } from '../sitio-api';

// Pedido como cotización: se guarda en la API y se abre WhatsApp con el resumen. Sin pagos en línea.
@Component({
  selector: 'app-pedido-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icono],
  templateUrl: './pedido-page.html',
  styleUrl: './pedido-page.scss'
})
export class PedidoPage implements OnInit {
  pedido = inject(PedidoSitio);
  ajustes = inject(AjustesSitio);
  private api = inject(SitioApi);
  private fb = inject(FormBuilder);
  private seo = inject(Seo);
  readonly pesos = pesos;
  readonly urlImagen = urlImagen;

  enviando = signal(false);
  error = signal<string | null>(null);
  intentado = signal(false);
  confirmado = signal<{ numero: number; enlace: string | null } | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    whatsapp: ['', [Validators.required, Validators.pattern(/^\+?[\d\s()-]{10,20}$/)]],
    empresa: [''],
    ciudad: ['', Validators.required],
    nota: [''],
    sitioWeb: [''],
    consentimiento: [false, Validators.requiredTrue]
  });

  unitario = (l: LineaPedido) => precioPorCantidad(l.precio, l.volumen, l.cantidad);
  subtotal = (l: LineaPedido) => { const u = this.unitario(l); return u === null ? null : u * l.cantidad; };
  total = computed(() => {
    const subs = this.pedido.lineas().map((l) => this.subtotal(l));
    return subs.some((s) => s === null) ? null : subs.reduce((a, b) => a! + b!, 0);
  });

  ngOnInit() {
    this.seo.pagina({ titulo: 'Pedido de cotización · Filtramos', descripcion: 'Revise su pedido y envíelo para recibir la cotización.', ruta: '/pedido', indexar: false });
  }

  mal(c: keyof typeof this.form.controls) { return this.intentado() && this.form.controls[c].invalid; }

  enviar() {
    this.intentado.set(true);
    if (this.form.invalid || !this.pedido.lineas().length) return;
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);
    const lineas = this.pedido.lineas().map((l) => ({ slug: l.slug, cantidad: l.cantidad }));
    this.api.pedido({ ...v, lineas }).subscribe({
      next: (r) => {
        this.enviando.set(false);
        const resumen = [
          `Hola, envié el pedido de cotización #${r.numero}:`,
          ...r.lineas.map((l) => `• ${l.cantidad} × ${l.referencia}${l.precioUnitario ? ` (${pesos(l.precioUnitario)} c/u)` : ''}`),
          r.totalEstimado ? `Total estimado: ${pesos(r.totalEstimado)}` : '',
          `Nombre: ${v.nombre}${v.empresa ? ` · ${v.empresa}` : ''} · ${v.ciudad}`
        ].filter(Boolean).join('\n');
        this.confirmado.set({ numero: r.numero, enlace: enlaceWhatsapp(this.ajustes.whatsapp(), resumen) });
        this.pedido.vaciar();
        this.form.reset();
        this.intentado.set(false);
      },
      error: (e) => { this.enviando.set(false); this.error.set(mensajeError(e)); }
    });
  }
}
