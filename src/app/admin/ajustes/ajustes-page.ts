import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Avisos } from '../../shared/ui/avisos';
import { AdminApi, mensajeDeError } from '../admin-api';
import { EstadoAjustes } from '../estado-ajustes';
import { CampoAjuste } from '../modelos';

// Los campos vienen definidos por la API (utils/ajustes.js): agregar uno allá lo muestra aquí.
@Component({
  selector: 'app-ajustes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './ajustes-page.html',
  styleUrl: './ajustes-page.scss'
})
export class AjustesPage implements OnInit {
  private api = inject(AdminApi);
  private avisos = inject(Avisos);
  private estado = inject(EstadoAjustes);

  campos = signal<CampoAjuste[]>([]);
  faltantes = signal<string[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  form = new FormGroup<Record<string, FormControl<string>>>({});

  ngOnInit() {
    this.api.ajustes().subscribe({
      next: (r) => {
        for (const c of r.campos) this.form.addControl(c.clave, new FormControl(r.valores[c.clave] || '', { nonNullable: true }));
        this.campos.set(r.campos);
        this.faltantes.set(r.faltantes);
        this.cargando.set(false);
      },
      error: (e) => { this.error.set(mensajeDeError(e)); this.cargando.set(false); }
    });
  }

  guardar() {
    this.guardando.set(true);
    this.error.set(null);
    this.api.guardarAjustes(this.form.getRawValue()).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.faltantes.set(r.faltantes);
        for (const c of this.campos()) this.form.controls[c.clave].setValue(r.valores[c.clave] || '');
        this.estado.refrescar();
        this.avisos.ok('Ajustes guardados.');
      },
      error: (e) => { this.guardando.set(false); this.error.set(mensajeDeError(e, 'No se pudieron guardar los ajustes.')); }
    });
  }
}
