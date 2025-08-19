import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Devoluciones } from 'src/app/Modelos/ventas/Devoluciones.Model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { DevolucionesDetalle } from 'src/app/Modelos/ventas/DevolucionesDetalle.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() DevolucionesData: Devoluciones | null = null;
  @Input() productosDevolucion: DevolucionesDetalle[]= [];
  @Output() onClose = new EventEmitter<void>();

  devolucionesDetalle: Devoluciones | null = null;
  cargando = false;
  mostrarAlertaError = false;
  mensajeError = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['DevolucionesData'] && changes['DevolucionesData'].currentValue) {
      this.cargarDetallesSimulado(changes['DevolucionesData'].currentValue);
    }
  }

  private cargardatos(state: boolean): void {
    this.cargando = state;
    this.http.get<DevolucionesDetalle[]>(`${environment.apiBaseUrl}/Devoluciones/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: data => {
                
        setTimeout(() => {
          this.cargando = false;
          this.productosDevolucion = data;
        }, 500);

        // Asignar numeración de filas
        
      },
      error: error => {
        console.error('Error al cargar productos:', error);
        setTimeout(() => {
          this.cargando = false;
          this.productosDevolucion = [];
        }, 500);
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
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return String(fecha);
    }
  }

  trackByDetalleeId(index: number, detalle: DevolucionesDetalle): any {
    return detalle.devD_Id || index;
  }
}
