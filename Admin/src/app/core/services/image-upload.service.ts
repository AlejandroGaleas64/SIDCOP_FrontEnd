import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

export interface ImageUploadResponse {
  ruta: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {

  constructor(private http: HttpClient) { }

  /**
   * Sube una imagen al endpoint del backend /Imagen/Subir
   * @param file Archivo de imagen a subir
   * @returns Observable con la respuesta que contiene la ruta de la imagen
   */
  uploadImage(file: File): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('imagen', file);

    const headers = {
      'X-Api-Key': environment.apiKey,
      'accept': '*/*'
      // No incluir Content-Type para que el navegador establezca automáticamente el boundary para FormData
    };

    return this.http.post<ImageUploadResponse>(
      `${environment.apiBaseUrl}/Imagen/Subir`, 
      formData, 
      { headers }
    );
  }

  /**
   * Método async/await para subir imagen (compatible con el código existente)
   * @param file Archivo de imagen a subir
   * @returns Promise con la ruta de la imagen
   */
  async uploadImageAsync(file: File): Promise<string> {
    try {
      const response = await this.uploadImage(file).toPromise();
      if (!response || !response.ruta) {
        throw new Error('No se pudo obtener la ruta de la imagen');
      }
      return response.ruta;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      throw new Error('Error al subir la imagen al servidor');
    }
  }

  /**
   * Construye la URL completa de la imagen para mostrarla
   * @param imagePath Ruta relativa de la imagen devuelta por el backend
   * @returns URL completa de la imagen
   */
  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    
    // Si la ruta ya incluye el dominio, devolverla tal como está
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Si es una ruta relativa, construir la URL completa
    // Remover la barra inicial si existe para evitar doble barra
    const cleanPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    return `${environment.apiBaseUrl.replace('/api', '')}/${cleanPath}`;
  }
}
