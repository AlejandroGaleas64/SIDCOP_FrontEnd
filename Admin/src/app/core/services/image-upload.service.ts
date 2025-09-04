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
   * Valida si un archivo es una imagen válida (cualquier formato)
   * @param file Archivo a validar
   * @returns true si es una imagen válida, false en caso contrario
   */
  isValidImageFile(file: File): boolean {
    if (!file) return false;
    
    // Verificar que el tipo MIME sea de imagen
    return file.type.startsWith('image/');
  }

  /**
   * Obtiene información detallada sobre el archivo de imagen
   * @param file Archivo de imagen
   * @returns Objeto con información del archivo
   */
  getImageFileInfo(file: File): { name: string; size: number; type: string; isValid: boolean } {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      isValid: this.isValidImageFile(file)
    };
  }

  /**
   * Sube una imagen al endpoint del backend /Imagen/Subir
   * Acepta cualquier formato de imagen válido
   * @param file Archivo de imagen a subir
   * @returns Observable con la respuesta que contiene la ruta de la imagen
   */
  uploadImage(file: File): Observable<ImageUploadResponse> {
    // Validar que el archivo sea una imagen
    if (!this.isValidImageFile(file)) {
      throw new Error('El archivo seleccionado no es una imagen válida');
    }

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
   * Acepta cualquier formato de imagen válido
   * @param file Archivo de imagen a subir
   * @returns Promise con la ruta de la imagen
   */
  async uploadImageAsync(file: File): Promise<string> {
    try {
      // Validar que el archivo sea una imagen antes de subirlo
      if (!this.isValidImageFile(file)) {
        throw new Error('El archivo seleccionado no es una imagen válida');
      }

      const response = await this.uploadImage(file).toPromise();
      if (!response || !response.ruta) {    
        throw new Error('No se pudo obtener la ruta de la imagen');
      }
      return response.ruta;
    } catch (error) {
      console.error('Error al subir imagen:', error);
      if (error instanceof Error && error.message.includes('no es una imagen válida')) {
        throw error; // Re-lanzar errores de validación tal como están
      }
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
