import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracionFactura } from 'src/app/Modelos/ventas/ConfiguracionFactura.Model';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() configuracionFacturaData: ConfiguracionFactura | null = null;
  @Output() onClose = new EventEmitter<void>();

  configuracionFacturaDetalle: ConfiguracionFactura | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  constructor(private imageUploadService: ImageUploadService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['configuracionFacturaData'] && changes['configuracionFacturaData'].currentValue) {
      this.cargarDetallesSimulado(changes['configuracionFacturaData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: ConfiguracionFactura): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.configuracionFacturaDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la configuracion de factura:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la configuracion de factura.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Obtiene la URL completa para mostrar la imagen
   */
  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
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
}
