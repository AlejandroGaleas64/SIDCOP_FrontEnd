
import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoVisita } from 'src/app/Modelos/general/EstadoVisita.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})


export class DetailsComponent implements OnChanges {
  @Input() estadoVisitaData: EstadoVisita | null = null;
  @Output() onClose = new EventEmitter<void>();

  estadoVisitaDetalle: EstadoVisita | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['estadoVisitaData'] && changes['estadoVisitaData'].currentValue) {
      this.cargarDetallesSimulado(changes['estadoVisitaData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: EstadoVisita): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.estadoVisitaDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de el estado de visita:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de el estado de visita.';
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

