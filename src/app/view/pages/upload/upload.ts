import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Catalogo } from '../../../services/catalogo/catalogo';


@Component({
  selector: 'app-upload',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upload.html',
  styleUrl: './upload.scss'
})

export class Upload implements OnInit, AfterViewInit {


  form: FormGroup;
  previewUrl: string | null = null;
  fileToUpload: File | null = null;
  selectedType: 'escritorio' | 'movil' | null = null;

  savedImages: any[] = [];

  constructor(private fb: FormBuilder, private catalogo: Catalogo, private router: Router, private route: ActivatedRoute) {
    this.form = this.fb.group({
      nombre: [''],
      tipo: ['']
    });



  }

  ngAfterViewInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.loadSavedImages();
      }
    });
    this.loadSavedImages();
  }

  ngOnInit(): void {
  }

  loadSavedImages() {
    this.catalogo.getFiles().subscribe({
      next: (response) => {
        console.log('Imágenes cargadas:', response);
        // Asignar las imágenes guardadas al array
        this.savedImages = response?.files || [];
      },
      error: (err) => {
        console.error('Error al cargar imágenes:', err);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileToUpload = input.files[0];
      this.previewUrl = URL.createObjectURL(this.fileToUpload);
      this.form.get('nombre')?.setValue(this.fileToUpload.name);
    }
  }

  setSelectedType(type: 'escritorio' | 'movil') {
    this.selectedType = type;
    this.form.get('tipo')?.setValue(type);
  }

  uploadImage() {
    if (!this.fileToUpload || !this.form.get('nombre')?.value) {
      alert('Selecciona una imagen y asigna un nombre.');
      return;
    }

    this.catalogo.addFile(this.fileToUpload, this.form.get('nombre')?.value).subscribe({
      next: () => {
        alert('Imagen subida exitosamente');
        this.form.reset();
        this.previewUrl = null;
        this.fileToUpload = null;
        this.selectedType = null;
        this.loadSavedImages(); // refrescar lista
      },
      error: (error) => {
        console.error('Error al subir la imagen:', error);
        alert('Error al subir la imagen');
      }
    });
  }
}
