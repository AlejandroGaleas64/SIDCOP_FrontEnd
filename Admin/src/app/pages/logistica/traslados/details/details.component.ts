import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Traslado } from 'src/app/Modelos/logistica/TrasladoModel';
import { TrasladoDetalle } from 'src/app/Modelos/logistica/TrasladoDetalleModel'; // Asegúrate de importar el modelo
import { environment } from 'src/environments/environment';

// Interfaz para la respuesta del API
interface ApiResponse<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() trasladoId: number | null = null;
  @Input() trasladoData: Traslado | null = null;
  @Output() onClose = new EventEmitter<void>();

  private http = inject(HttpClient);

  trasladoDetalle: Traslado | null = null;
  detallesTraslado: TrasladoDetalle[] = []; // Array para los detalles

  /**
   * Indica si se está cargando el componente
   */
  cargando = false;

  /**
   * Indica si se están cargando los detalles del traslado
   */
  cargandoDetalles = false;

  /**
   * Indica si se debe mostrar una alerta de error
   */
  mostrarAlertaError = false;

  /**
   * Mensaje de error a mostrar
   */
  mensajeError = '';

  /**
   * URL base de la API
   */
  private readonly apiUrl = `${environment.apiBaseUrl}/Traslado`;

  /**
   * Detecta cambios en las propiedades de entrada y carga los datos correspondientes
   * @param changes - Cambios detectados en las propiedades
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['trasladoId'] && changes['trasladoId'].currentValue) {
      this.cargarDetalles(changes['trasladoId'].currentValue);
      this.cargarDetallesTraslado(changes['trasladoId'].currentValue);
    } else if (changes['trasladoData'] && changes['trasladoData'].currentValue) {
      this.cargarDetallesSimulado(changes['trasladoData'].currentValue);
      // Si tienes el ID en trasladoData, también cargar los detalles
      if (changes['trasladoData'].currentValue.tras_Id) {
        this.cargarDetallesTraslado(changes['trasladoData'].currentValue.tras_Id);
      }
    }
  }

  /**
   * Carga los detalles del encabezado del traslado desde el API
   * @param id - ID del traslado a cargar
   */
  cargarDetalles(id: number): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    this.http.get<ApiResponse<Traslado>>(`${this.apiUrl}/Buscar/${id}`, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.trasladoDetalle = response.data;
        } else {
          console.error('Estructura de respuesta inesperada:', response);
          this.mostrarAlertaError = true;
          this.mensajeError = response?.message || 'Error: estructura de respuesta inesperada del servidor.';
        }
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del traslado:', error);
        
        if (error.status === 401 || error.status === 403) {
          this.mensajeError = 'No tiene permisos para ver este traslado o su sesión ha expirado.';
        } else {
          this.mensajeError = 'Error al cargar los detalles del traslado.';
        }
        
        this.mostrarAlertaError = true;
        this.cargando = false;
      }
    });
  }

  /**
   * Carga los detalles de productos del traslado desde el API
   * @param id - ID del traslado para cargar sus detalles
   */
  cargarDetallesTraslado(id: number): void {
    this.cargandoDetalles = true;
    
    this.http.get<ApiResponse<TrasladoDetalle[]>>(`${this.apiUrl}/BuscarDetalle/${id}`, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.detallesTraslado = response.data;
        } else {
          console.error('Error en la respuesta de detalles:', response);
          this.detallesTraslado = [];
        }
        
        this.cargandoDetalles = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del traslado:', error);
        this.detallesTraslado = [];
        this.cargandoDetalles = false;
        
        // Opcional: mostrar alerta de error para los detalles
        if (error.status === 401 || error.status === 403) {
          console.warn('Sin permisos para ver los detalles del traslado');
        }
      }
    });
  }

  /**
   * Carga los detalles del traslado de forma simulada cuando ya se tienen los datos
   * @param data - Datos del traslado a mostrar
   */
  cargarDetallesSimulado(data: Traslado): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.trasladoDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del traslado:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del traslado.';
        this.cargando = false;
      }
    }, 500);
  }

  /**
   * Cierra el componente de detalles y emite el evento correspondiente
   */
  cerrar(): void {
    this.onClose.emit();
  }

  /**
   * Cierra la alerta de error activa
   */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Formatea una fecha para mostrarla en formato legible
   * @param fecha - Fecha a formatear (string, Date o null)
   * @returns Fecha formateada o 'N/A' si es inválida
   */
  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Maneja errores de carga de imágenes estableciendo una imagen por defecto
   * @param event - Evento de error de la imagen
   */
  onImageError(event: any): void {
    event.target.src = 'assets/images/no-image-placeholder.png'; // Imagen por defecto
  }

  /**
   * Construye la URL completa de una imagen
   * @param imageUrl - URL de la imagen (puede ser relativa o absoluta)
   * @returns URL completa de la imagen o imagen por defecto
   */
  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) return 'assets/images/no-image-placeholder.png';
    
    // Si ya es una URL completa, devolverla tal como está
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // Si es una ruta relativa, construir la URL completa
    return `${environment.apiBaseUrl}/${imageUrl}`;
  }

  /**
   * Función trackBy para optimizar el rendimiento del ngFor en la lista de detalles
   * @param index - Índice del elemento
   * @param detalle - Objeto detalle del traslado
   * @returns Identificador único del detalle
   */
  trackByDetalleId(index: number, detalle: TrasladoDetalle): any {
    return detalle.trDe_Id || index;
  }
}