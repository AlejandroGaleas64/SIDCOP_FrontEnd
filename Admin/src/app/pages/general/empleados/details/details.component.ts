import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Empleado } from 'src/app/Modelos/general/Empleado.Model';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';


@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl:'./details.component.html',
  styleUrl: './details.component.scss'
})


export class DetailsComponent implements OnChanges{
  @Input() empleadoData: Empleado | null = null;
  @Output() onClose = new EventEmitter<void>();
  
  empleadoDetalle: Empleado | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  constructor(private imageUploadService: ImageUploadService) {}
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['empleadoData'] && changes['empleadoData'].currentValue) {
      this.cargarDetallesSimulado(changes['empleadoData'].currentValue);
    }
  }
  
  // Simulación de carga
  cargarDetallesSimulado(data: Empleado): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.empleadoDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del estado civil:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del estado civil.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }
  
  // Método para cerrar el modal
  cerrar(): void {
    this.onClose.emit();
  }

  // Método para cerrar alertas
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  // Método para formatear fechas
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

  // Método para obtener la URL completa de la imagen para mostrarla
  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
  }

}
