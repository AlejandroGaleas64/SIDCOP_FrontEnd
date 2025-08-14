import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Marcas } from 'src/app/Modelos/general/Marcas.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() marcaData: Marcas | null = null;
  @Output() onClose = new EventEmitter<void>();

  marcaDetalle: Marcas | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['marcaData'] && changes['marcaData'].currentValue) {
      this.cargarDetallesSimulado(changes['marcaData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Marcas): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.marcaDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la marca:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la marca.';
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
