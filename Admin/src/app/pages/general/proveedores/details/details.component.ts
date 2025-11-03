import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Proveedor } from 'src/app/Modelos/general/Proveedor.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() proveedorData: Proveedor | null = null;
  @Output() onClose = new EventEmitter<void>();

  proveedorDetalle: Proveedor | null = null;
  cargando = false;
  mostrarAlertaError = false;
  mensajeError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proveedorData'] && changes['proveedorData'].currentValue) {
      this.cargarDetallesSimulado(changes['proveedorData'].currentValue);
    }
  }

  // Simula la carga de detalles del proveedor como si viniera de la API pero en realidad usa el input
  cargarDetallesSimulado(data: Proveedor): void {
    this.cargando = true;
    this.mostrarAlertaError = false;
    setTimeout(() => {
      try {
        this.proveedorDetalle = { ...data };
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

  // Cierra la alerta de error
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }


  // Formatea fechas a formato legible o muestra 'N/A' si es inválida
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
