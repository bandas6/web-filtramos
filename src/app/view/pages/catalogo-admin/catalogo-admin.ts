import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Catalogo } from '../../../services/catalogo/catalogo';

import { NgSelectModule } from '@ng-select/ng-select';
import Swal from 'sweetalert2';

interface Product {
  uid: string;
  referencia: string;
  diametroExterno?: string;
  diametroInterno?: number;
  alturaPliegue?: number;
  cortePapel?: number;
  cantidadPliegues?: number;
  malla?: string;
  longitudMallaExterna?: string;
  longitudMallaInterna?: string;
  polibretano?: string;
  anillo?: string;
  tapa?: string;
  aplicaciones: string[];
  equivalencias: string[];
  imagesUrl: string[];
  papeles: string[];
  category?: string;
  stock: number;
  createdAt: Date;
}

@Component({
  selector: 'app-catalogo-admin',
  standalone: true,
  templateUrl: './catalogo-admin.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgSelectModule
  ],
  styleUrls: ['./catalogo-admin.scss']
})
export class CatalogoAdmin implements OnInit {

  private catalogoSvc = inject(Catalogo);
  private cd = inject(ChangeDetectorRef);

  products: Product[] = [];
  filteredProducts: Product[] = [];
  availableImageUrls: string[] = [];

  currentPage = 1;
  productsPerPage = 10;

  productForm: FormGroup;

  selectedProduct: Product | null = null;
  selectedImageUrl: string | null = null;

  isModalOpen = false;
  modeEdit = false;
  isDeleteModalOpen = false;

  searchTerm = '';
  modalTitle = 'Agregar Nuevo Producto';

  constructor(private fb: FormBuilder) {
    this.productForm = this.fb.group({
      uid: [''],
      referencia: ['', Validators.required],
      diametroExterno: [''],
      diametroInterno: [null, Validators.min(0)],
      alturaPliegue: [null, Validators.min(0)],
      cortePapel: [null, Validators.min(0)],
      cantidadPliegues: [null, Validators.min(0)],
      malla: [''],
      longitudMallaExterna: [''],
      longitudMallaInterna: [''],
      polibretano: [''],
      anillo: [''],
      tapa: [''],
      aplicaciones: [''],
      equivalencias: [''],
      papeles: [''],
      category: [''],
      stock: [0, [Validators.required, Validators.min(0)]],
      imagesUrl: ['']
    });
  }

  ngOnInit(): void {

    this.getCatalogo()
    //this.loadProducts();
    this.productForm.get('imagesUrl')?.valueChanges.subscribe((value: string[]) => {
      const last = value?.length ? value[value.length - 1] : null;
      this.selectedImageUrl = last ? `http://localhost:8080${last}` : null;
      console.log('Selected image URL:', this.selectedImageUrl);
    });

  }


  async getCatalogo() {
    const data = await firstValueFrom(this.catalogoSvc.getCatalogo());
    const { ok, products } = data;
    if (ok) {
      this.products = products.map((product: any) => ({
        ...product,
        aplicaciones: product.aplicaciones || [],
        equivalencias: product.equivalencias || [],
        imagesUrl: product.imagesUrl || [],
        papeles: product.papeles || [],
        createdAt: new Date(product.createdAt)
      }));

      this.filteredProducts = [...this.products];

      // Generar lista única de URLs de imágenes
      this.getFiles();
    } else {
      console.error('Error al cargar el catálogo');
    }
  }

  async getFiles() {
    try {
      const data = await firstValueFrom(this.catalogoSvc.getFiles());
      if (data.ok) {
        console.log('Archivos disponibles:', data.files);
        this.availableImageUrls = data.files;
      } else {
        console.error('Error al cargar las imágenes disponibles');
      }
    } catch (error) {
      console.error('Error al obtener archivos:', error);
    }
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase();
    this.currentPage = 1;
    this.filteredProducts = this.products.filter(product =>
      product.referencia.toLowerCase().includes(term) ||
      (product.malla?.toLowerCase().includes(term)) ||
      (product.category?.toLowerCase().includes(term))
    );
  }

  openAddModal(): void {
    this.modalTitle = 'Agregar Nuevo Producto';
    this.productForm.reset({ stock: 0 });
    this.selectedProduct = null;
    this.isModalOpen = true;
  }

  exportToPDF(): void {
    this.catalogoSvc.downloadPdf().subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar PDF:', err);
        Swal.fire('Error', 'No se pudo generar el PDF.', 'error');
      }
    });
  }

  openEditModal(product: Product): void {
    this.modalTitle = 'Editar Producto';
    this.selectedProduct = product;
    this.modeEdit = true;
    console.log('Selected product for edit:', product, this.modeEdit);
    this.productForm.patchValue({
      ...product,
      aplicaciones: product.aplicaciones.join(', '),
      equivalencias: product.equivalencias.join(', '),
      papeles: product.papeles.join(', '),
      imagesUrl: product.imagesUrl.join(', ')
    });
    this.isModalOpen = true;
  }

  openDeleteModal(product: Product): void {
    this.selectedProduct = product;
    this.isDeleteModalOpen = true;
  }

  closeModal(): void {
    this.modeEdit = false;
    this.isModalOpen = false;
    this.isDeleteModalOpen = false;
    this.selectedProduct = null;
    Swal.close();


  }

  onSubmit(): void {
    if (this.productForm.invalid) return;

    const formValue = this.productForm.value;
    const toArray = (value: string) => value?.split(',').map(v => v.trim()).filter(v => v) || [];

    const productData: Product = {
      uid: formValue.uid || this.generateId(),
      referencia: formValue.referencia,
      diametroExterno: formValue.diametroExterno,
      diametroInterno: Number(formValue.diametroInterno),
      alturaPliegue: Number(formValue.alturaPliegue),
      cortePapel: Number(formValue.cortePapel),
      cantidadPliegues: Number(formValue.cantidadPliegues),
      malla: formValue.malla,
      longitudMallaExterna: formValue.longitudMallaExterna,
      longitudMallaInterna: formValue.longitudMallaInterna,
      polibretano: formValue.polibretano,
      anillo: formValue.anillo,
      tapa: formValue.tapa,
      aplicaciones: toArray(formValue.aplicaciones),
      equivalencias: toArray(formValue.equivalencias),
      papeles: toArray(formValue.papeles),
      imagesUrl: formValue.imagesUrl || [],
      category: formValue.category,
      stock: Number(formValue.stock),
      createdAt: this.selectedProduct?.createdAt || new Date()
    };

    if (this.modeEdit) {
      this.catalogoSvc.updateProduct(productData.uid, productData).subscribe({
        next: (response) => {
          if (response.ok) {
            const updated = response.product;
            const index = this.products.findIndex(p => p.uid === updated.uid);
            if (index !== -1) {
              this.products[index] = {
                ...updated,
                aplicaciones: updated.aplicaciones || [],
                equivalencias: updated.equivalencias || [],
                imagesUrl: updated.imagesUrl || [],
                papeles: updated.papeles || [],
                createdAt: new Date(updated.createdAt)
              };
              this.filteredProducts = [...this.products];
            }
            Swal.fire('Éxito', 'Producto guardado correctamente.', 'success').then(() => {
              this.closeModal();
            });
          }
        },
        error: (err) => Swal.fire('Error', 'Ocurrió un problema al guardar el producto.', 'error')
      });
    } else {
      this.catalogoSvc.addProduct(productData).subscribe({
        next: (response) => {
          if (response.ok) {
            const nuevo = response.product;
            this.products.unshift({
              ...nuevo,
              aplicaciones: nuevo.aplicaciones || [],
              equivalencias: nuevo.equivalencias || [],
              imagesUrl: nuevo.imagesUrl || [],
              papeles: nuevo.papeles || [],
              createdAt: new Date(nuevo.createdAt)
            });
            this.filteredProducts = [...this.products];
            Swal.fire('Éxito', 'Producto actualizado correctamente.', 'success').then(() => {
              this.closeModal();
            });
          }
        },
        error: (err) => Swal.fire('Error', 'Ocurrió un problema al actualizar el producto.', 'error')
      });
    }
  }


  onDelete(): void {
    if (!this.selectedProduct) return;

    Swal.fire({
      title: '¿Estás seguro?',
      text: `Esto eliminará el producto: ${this.selectedProduct.referencia}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.catalogoSvc.deleteProduct(this.selectedProduct!.uid).subscribe({
          next: (response) => {
            if (response.ok) {
              this.products = this.products.filter(p => p.uid !== this.selectedProduct?.uid);
              this.filteredProducts = [...this.products];
              this.closeModal();
              this.closeModal();
              Swal.fire('¡Eliminado!', 'El producto ha sido eliminado.', 'success');
            }
          },
          error: (err) => {
            console.error('Error al eliminar producto:', err);
            Swal.fire('Error', 'No se pudo eliminar el producto.', 'error');
          }
        });
      }
    });
  }


  viewDetails(product: Product): void {
    Swal.fire({
      title: `Detalles de ${product.referencia}`,
      html: `
      <b>Diámetro Externo:</b> ${product.diametroExterno || 'N/A'}<br>
      <b>Diámetro Interno:</b> ${product.diametroInterno || 'N/A'}<br>
      <b>Malla:</b> ${product.malla || 'N/A'}<br>
      <b>Categoría:</b> ${product.category || 'N/A'}<br>
      <b>Stock:</b> ${product.stock}
    `,
      icon: 'info'
    });
  }


  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.productsPerPage);
  }

  get paginatedProducts(): Product[] {
    const start = (this.currentPage - 1) * this.productsPerPage;
    return this.filteredProducts.slice(start, start + this.productsPerPage);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  getArrayFromForm(control: string): string[] {
    const value = this.productForm.get(control)?.value;
    return value ? value.split(',').map((v: string) => v.trim()).filter((v: string) => v) : [];
  }
}
