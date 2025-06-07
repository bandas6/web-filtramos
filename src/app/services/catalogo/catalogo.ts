import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Catalogo {

  private http = inject(HttpClient);
  //https://filtramos-api.onrender.com/api
  url: string = 'http://localhost:8080/api'

  constructor() { }

  getCatalogo(): Observable<any> {
    return this.http.get(`${this.url}/productos/obtener/`);
  }

  getProductById(id: string): Observable<any> {
    return this.http.get(`${this.url}/productos/obtener/${id}/`);
  }

  addProduct(product: any): Observable<any> {
    return this.http.post(`${this.url}/productos/crear/`, product);
  }

  updateProduct(id: string, product: any): Observable<any> {
    return this.http.put(`${this.url}/productos/actualizar/${id}/`, product);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.url}/productos/remover/${id}/`);
  }

  downloadPdf(): Observable<Blob> {
    return this.http.get(`${this.url}/productos/generarPdfHtml/pdfHtml/`, { responseType: 'blob' });
  }

  addFile(imagen: File, nombre: string): Observable<any> {
    const formData = new FormData();
    formData.append('imagen', imagen);
    formData.append('nombre', nombre);
    return this.http.post(`${this.url}/productos/crear/imagen/`, formData);
  }

  getFiles(): Observable<any> {
    return this.http.get(`${this.url}/productos/obtener/imagenes/`);
  }


}
