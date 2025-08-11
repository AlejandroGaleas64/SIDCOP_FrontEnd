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
  cargando = false;
  cargandoDetalles = false;

  mostrarAlertaError = false;
  mensajeError = '';

  private readonly apiUrl = `${environment.apiBaseUrl}/Traslado`;

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

  // Carga real desde el endpoint del encabezado
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
        console.log('Respuesta completa del API:', response);
        
        if (response && response.success && response.data) {
          console.log('Datos del traslado:', response.data);
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

  // Nuevo método para cargar los detalles del traslado
  cargarDetallesTraslado(id: number): void {
    this.cargandoDetalles = true;
    
    this.http.get<ApiResponse<TrasladoDetalle[]>>(`${this.apiUrl}/BuscarDetalle/${id}`, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        console.log('Respuesta detalles del traslado:', response);
        
        if (response && response.success && response.data) {
          this.detallesTraslado = response.data;
          console.log('Detalles cargados:', this.detallesTraslado);
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

  // Simulación de carga (para cuando ya tienes los datos)
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

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

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

  // Método para manejar errores de imagen
  onImageError(event: any): void {
    event.target.src = 'assets/images/no-image-placeholder.png'; // Imagen por defecto
  }

  // Método para obtener la URL completa de la imagen si es necesario
  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) return 'assets/images/no-image-placeholder.png';
    
    // Si ya es una URL completa, devolverla tal como está
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // Si es una ruta relativa, construir la URL completa
    return `${environment.apiBaseUrl}/${imageUrl}`;
  }

  // TrackBy function para optimizar el rendimiento del ngFor
  trackByDetalleId(index: number, detalle: TrasladoDetalle): any {
    return detalle.trDe_Id || index;
  }
}