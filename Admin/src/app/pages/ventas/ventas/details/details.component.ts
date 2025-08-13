import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Factura, VentaDetalle, DetalleItem, FacturaCompleta } from 'src/app/Modelos/ventas/Facturas.model';
import { Respuesta } from 'src/app/Modelos/apiresponse.model';

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
  @Input() facturaId: number | null = null;
  @Input() facturaData: Factura | null = null;
  @Output() onClose = new EventEmitter<void>();

  private http = inject(HttpClient);

  facturaDetalle: FacturaCompleta | null = null;
  detallesFactura: DetalleItem[] = []; // Array para los detalles
  cargando = false;
  cargandoDetalles = false;

  mostrarAlertaError = false;
  mensajeError = '';

  private readonly apiUrl = `${environment.apiBaseUrl}/Facturas`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['facturaId'] && changes['facturaId'].currentValue) {
      this.cargarDetalles(changes['facturaId'].currentValue);
    } 
    // else if (changes['facturaData'] && changes['facturaData'].currentValue) {
    //   this.cargarDetallesSimulado(changes['facturaData'].currentValue);
    // }
  }

  // Carga real desde el endpoint del encabezado
    cargarDetalles(id: number): void {
      this.cargando = true;
      this.mostrarAlertaError = false;
  
      this.http.get<ApiResponse<FacturaCompleta>>(`${this.apiUrl}/ObtenerCompleta/${id}`, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'accept': 'application/json'
        }
      }).subscribe({
        next: (response) => {
          console.log('Respuesta completa del API:', response);
          
          if (response && response.success && response.data) {
            console.log('Datos de la factura:', response.data);
            this.detallesFactura = response.data.detalleFactura;
            this.facturaDetalle = response.data;
          } else {
            console.error('Estructura de respuesta inesperada:', response);
            this.mostrarAlertaError = true;
            this.mensajeError = response?.message || 'Error: estructura de respuesta inesperada del servidor.';
          }
          
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar detalles del factura:', error);
          
          if (error.status === 401 || error.status === 403) {
            this.mensajeError = 'No tiene permisos para ver este factura o su sesión ha expirado.';
          } else {
            this.mensajeError = 'Error al cargar los detalles del factura.';
          }
          
          this.mostrarAlertaError = true;
          this.cargando = false;
        }
      });
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

    onImageError(event: any): void {
      event.target.src = 'assets/images/no-image-placeholder.png'; // Imagen por defecto
    }

    getImageUrl(imageUrl: string | undefined): string {
      if (!imageUrl) return 'assets/images/no-image-placeholder.png';
      
      // Si ya es una URL completa, devolverla tal como está
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      
      // Si es una ruta relativa, construir la URL completa
      return `${environment.apiBaseUrl}/${imageUrl}`;
    }

    trackByDetalleId(index: number, detalle: DetalleItem): any {
      return detalle.faDe_Id || index;
    }



}
