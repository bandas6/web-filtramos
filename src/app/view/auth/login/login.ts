import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth } from '../../../services/auth/auth';
import { environment } from '../../../../environments/environment';

export type TipoErrorLogin = 'credenciales' | 'bloqueo' | 'servidor';
export interface ErrorLogin { tipo: TipoErrorLogin; titulo: string; detalle: string; }

// Traduce la respuesta de la API a un mensaje claro: credenciales, bloqueo por intentos o servidor caído
export function errorDeLogin(err: HttpErrorResponse): ErrorLogin {
  if (err.status === 401 || err.status === 400) {
    return { tipo: 'credenciales', titulo: 'Correo o contraseña incorrectos.', detalle: 'Revise que el correo esté bien escrito y que no tenga activadas las mayúsculas.' };
  }
  if (err.status === 429) {
    const minutos = Number(err.error?.minutos) || 15;
    return {
      tipo: 'bloqueo', titulo: 'Demasiados intentos fallidos.',
      detalle: `Por seguridad, espere ${minutos} minuto${minutos === 1 ? '' : 's'} antes de intentarlo de nuevo. Si olvidó la contraseña, pida al administrador que la restablezca.`
    };
  }
  return {
    tipo: 'servidor', titulo: 'El servidor no está disponible.',
    detalle: err.status === 0 ? 'No hay conexión con el servidor. Revise su internet o intente en unos minutos.' : 'Ocurrió un error en el servidor. Intente en unos minutos.'
  };
}

interface UsuarioDemo { rol: string; email: string; password: string; }

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);
  private http = inject(HttpClient);

  cargando = signal(false);
  error = signal<ErrorLogin | null>(null);
  // Solo existe con la API en memoria (npm run dev:memoria); en cualquier otro caso la API responde 404
  demo = signal<UsuarioDemo[]>([]);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  ngOnInit() {
    this.http.get<{ usuarios: UsuarioDemo[] }>(`${environment.apiUrl}/auth/demo`).subscribe({
      next: (r) => this.demo.set(r.usuarios || []),
      error: () => {}
    });
  }

  usarDemo(u: UsuarioDemo) {
    this.form.setValue({ email: u.email, password: u.password });
    this.error.set(null);
  }

  entrar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl('/admin'),
      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(errorDeLogin(err));
      }
    });
  }
}
