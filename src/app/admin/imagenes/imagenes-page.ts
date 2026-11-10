import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { urlImagen } from '../../shared/formato';
import { Avisos } from '../../shared/ui/avisos';
import { Icono } from '../../shared/ui/icono';
import { AdminApi, mensajeDeError } from '../admin-api';
import { Imagen } from '../modelos';

const MAX_MB = 5;

@Component({
  selector: 'app-imagenes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono],
  templateUrl: './imagenes-page.html',
  styleUrl: './imagenes-page.scss'
})
export class ImagenesPage implements OnInit {
  private api = inject(AdminApi);
  private avisos = inject(Avisos);
  readonly urlImagen = urlImagen;

  imagenes = signal<Imagen[]>([]);
  archivo = signal<File | null>(null);
  vistaPrevia = signal<string | null>(null);
  nombre = signal('');
  subiendo = signal(false);
  error = signal<string | null>(null);

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.imagenes().subscribe({ next: (l) => this.imagenes.set(l), error: (e) => this.error.set(mensajeDeError(e)) });
  }

  elegir(input: HTMLInputElement) {
    const f = input.files?.[0] || null;
    this.error.set(null);
    if (f && f.size > MAX_MB * 1024 * 1024) {
      this.error.set(`La imagen supera ${MAX_MB} MB.`);
      input.value = '';
      return;
    }
    if (this.vistaPrevia()) URL.revokeObjectURL(this.vistaPrevia()!);
    this.archivo.set(f);
    this.vistaPrevia.set(f ? URL.createObjectURL(f) : null);
    if (f && !this.nombre()) this.nombre.set(f.name.replace(/\.[^.]+$/, ''));
  }

  subir(input: HTMLInputElement) {
    const f = this.archivo();
    if (!f) { this.error.set('Elija una imagen.'); return; }
    this.subiendo.set(true);
    this.api.subirImagen(f, this.nombre().trim() || f.name).subscribe({
      next: (img) => {
        this.imagenes.update((l) => [img, ...l]);
        this.subiendo.set(false);
        this.archivo.set(null);
        this.vistaPrevia.set(null);
        this.nombre.set('');
        input.value = '';
        this.avisos.ok('Imagen subida.');
      },
      error: (e) => { this.subiendo.set(false); this.error.set(mensajeDeError(e, 'No se pudo subir la imagen.')); }
    });
  }

  eliminar(img: Imagen) {
    if (!confirm(`¿Eliminar la imagen "${img.nombre}"?`)) return;
    this.api.eliminarImagen(img.uid).subscribe({
      next: () => { this.imagenes.update((l) => l.filter((i) => i.uid !== img.uid)); this.avisos.ok('Imagen eliminada.'); },
      error: (e) => this.avisos.error(mensajeDeError(e, 'No se pudo eliminar la imagen.'))
    });
  }
}
