import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Recargas } from 'src/app/Modelos/logistica/Recargas.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() recargaData: Recargas | null = null;
  @Output() onClose = new EventEmitter<void>();

  recargaDetalle: Recargas | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recargaData'] && changes['recargaData'].currentValue) {
      this.cargarDetallesSimulado(changes['recargaData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Recargas): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.recargaDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la recarga:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la recarga.';
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
}
