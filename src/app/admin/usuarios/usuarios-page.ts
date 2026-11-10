import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SlicePipe } from '@angular/common';
import { Auth } from '../../services/auth/auth';
import { Avisos } from '../../shared/ui/avisos';
import { Icono } from '../../shared/ui/icono';
import { AdminApi, mensajeDeError } from '../admin-api';
import { ROLES, UsuarioAdmin } from '../modelos';

const MIN = 10;

// Contraseña temporal aleatoria (se muestra una sola vez al admin para que la entregue)
function generarClave(): string {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

@Component({
  selector: 'app-usuarios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Icono, SlicePipe],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss'
})
export class UsuariosPage implements OnInit {
  private api = inject(AdminApi);
  private fb = inject(FormBuilder);
  private avisos = inject(Avisos);
  auth = inject(Auth);

  readonly roles = Object.entries(ROLES).map(([valor, nombre]) => ({ valor, nombre }));
  readonly nombreRol = ROLES;
  readonly min = MIN;

  usuarios = signal<UsuarioAdmin[]>([]);
  cargando = signal(true);
  creando = signal(false);
  error = signal<string | null>(null);
  restableciendo = signal<UsuarioAdmin | null>(null);
  claveMostrada = signal<{ email: string; clave: string } | null>(null);

  activosAdmin = computed(() => this.usuarios().filter((u) => u.rol === 'admin' && u.estado).length);

  nuevo = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    rol: ['bodega', Validators.required],
    password: ['', [Validators.required, Validators.minLength(MIN)]]
  });
  clave = this.fb.nonNullable.control('', [Validators.required, Validators.minLength(MIN)]);

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.usuarios().subscribe({
      next: (u) => { this.usuarios.set(u); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeDeError(e)); this.cargando.set(false); }
    });
  }

  esYo(u: UsuarioAdmin) { return u.uid === this.auth.usuario()?.uid; }
  // Último admin activo: no se le puede quitar el rol ni desactivar
  esUltimoAdmin(u: UsuarioAdmin) { return u.rol === 'admin' && u.estado && this.activosAdmin() <= 1; }

  generarParaNuevo() { this.nuevo.patchValue({ password: generarClave() }); }

  crear() {
    if (this.nuevo.invalid) { this.nuevo.markAllAsTouched(); return; }
    const datos = this.nuevo.getRawValue();
    this.api.crearUsuario(datos).subscribe({
      next: (u) => {
        this.usuarios.update((l) => [...l, u]);
        this.claveMostrada.set({ email: u.email, clave: datos.password });
        this.nuevo.reset({ nombre: '', email: '', rol: 'bodega', password: '' });
        this.creando.set(false);
        this.avisos.ok(`Usuario ${u.email} creado.`);
      },
      error: (e) => this.avisos.error(mensajeDeError(e, 'No se pudo crear el usuario.'))
    });
  }

  cambiar(u: UsuarioAdmin, cambios: Partial<UsuarioAdmin>, revertir: () => void) {
    this.api.actualizarUsuario(u.uid, cambios).subscribe({
      next: (act) => {
        this.usuarios.update((l) => l.map((x) => (x.uid === act.uid ? act : x)));
        this.avisos.ok(`Usuario ${act.email} actualizado.`);
      },
      error: (e) => { revertir(); this.avisos.error(mensajeDeError(e, 'No se pudo actualizar el usuario.')); }
    });
  }

  cambiarRol(u: UsuarioAdmin, select: HTMLSelectElement) {
    const anterior = u.rol;
    this.cambiar(u, { rol: select.value as UsuarioAdmin['rol'] }, () => (select.value = anterior));
  }

  alternarEstado(u: UsuarioAdmin) {
    const accion = u.estado ? 'desactivar' : 'activar';
    if (u.estado && !confirm(`¿Desactivar a ${u.nombre}? Se cerrarán sus sesiones y no podrá entrar al panel.`)) return;
    this.cambiar(u, { estado: !u.estado }, () => this.avisos.error(`No se pudo ${accion}.`));
  }

  abrirRestablecer(u: UsuarioAdmin) {
    this.claveMostrada.set(null);
    this.clave.reset('');
    this.restableciendo.set(u);
  }
  generarParaRestablecer() { this.clave.setValue(generarClave()); }

  restablecer() {
    const u = this.restableciendo();
    if (!u || this.clave.invalid) { this.clave.markAsTouched(); return; }
    const nueva = this.clave.value;
    this.api.restablecerPassword(u.uid, nueva).subscribe({
      next: (r) => {
        this.restableciendo.set(null);
        if (r.cerroSesion) { this.auth.logout(); return; }
        this.claveMostrada.set({ email: u.email, clave: nueva });
        this.avisos.ok(`Contraseña de ${u.email} restablecida. Sus sesiones abiertas se cerraron.`);
      },
      error: (e) => this.avisos.error(mensajeDeError(e, 'No se pudo restablecer la contraseña.'))
    });
  }
}
