import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Devoluciones } from 'src/app/Modelos/ventas/Devoluciones.Model';
import { DevolucionesDetalle } from 'src/app/Modelos/ventas/DevolucionesDetalle.Model';

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
  styleUrl: './details.component.scss',
})
export class DetailsComponent implements OnChanges {
  @Input() DevolucionId: number | null = null;
  @Input() DevolucionesData: Devoluciones | null = null;
  @Output() onClose = new EventEmitter<void>();

  devolucionesDetalle: Devoluciones | null = null;
  productosDevolucion: DevolucionesDetalle[] = []; // Array para los detalles
  cargando = false;
  cargandoDetalles = false;
  mostrarAlertaError = false;
  mensajeError = '';

  private http = inject(HttpClient);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['DevolucionId'] && changes['DevolucionId'].currentValue) {
      this.cargarDetalles();
      this.cargarProductos(changes['DevolucionId'].currentValue);
    } else if (changes['DevolucionesData'] && changes['DevolucionesData'].currentValue) {
      this.cargarDetallesSimulado(changes['DevolucionesData'].currentValue);
      // Si tienes el ID en DevolucionesData, también cargar los detalles
      if (changes['DevolucionesData'].currentValue.devo_Id) {
        this.cargarProductos(changes['DevolucionesData'].currentValue.devo_Id);
      }
    }
  }

  cargarDetalles(): void {
    this.cargando = true;
    this.mostrarAlertaError = false;
    this.http.get<ApiResponse<Devoluciones>>(`${environment.apiBaseUrl}/Devoluciones/Listar`, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.devolucionesDetalle = response.data;
        } else {
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
      },
    });
  }

  // Nuevo método para cargar los detalles del traslado
  cargarProductos(id: number): void {
    this.cargandoDetalles = true;

    this.http.get<ApiResponse<DevolucionesDetalle[]>>(`${environment.apiBaseUrl}/DevolucionesDetalles/Buscar/${id}`, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        //console.log('Respuesta detalles del traslado:', response);
        
        if (Array.isArray(response)) {
          // La API devuelve directamente un array
          this.productosDevolucion = response;
        } else if (response && response.success && response.data) {
          // La API devuelve estructura ApiResponse
          this.productosDevolucion = response.data;
        } else {
          console.error('Formato de respuesta inesperado:', response);
          this.productosDevolucion = [];
        }
        
        this.cargandoDetalles = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del traslado:', error);
        this.productosDevolucion = [];
        this.cargandoDetalles = false;
        
        // Opcional: mostrar alerta de error para los detalles
        if (error.status === 401 || error.status === 403) {
          console.warn('Sin permisos para ver los detalles del traslado');
        }
      }
    });
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

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/no-image-placeholder.png'; // o la ruta que uses como imagen por defecto
  }

  cargarDetallesSimulado(data: Devoluciones): void {
    this.cargando = true;
    this.mostrarAlertaError = false;
    setTimeout(() => {
      try {
        this.devolucionesDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del proveedor.';
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
      minute: '2-digit',
    });
  }

  trackByDetalleId(index: number, detalle: DevolucionesDetalle): any {
    return detalle.devD_Id || index;
  }
}
