import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

// Proveedores comunes de las pruebas: la app no usa zone.js y nunca llama a la API real.
export const providersDePrueba = [
  provideZonelessChangeDetection(),
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([])
];
