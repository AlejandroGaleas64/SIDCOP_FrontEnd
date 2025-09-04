import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() metaData: any = null;
  @Output() onClose = new EventEmitter<void>();

  metaDetalle: any = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  vendedoresParsed: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metaData'] && changes['metaData'].currentValue) {
      this.cargarDetallesSimulado(changes['metaData'].currentValue);
    }
  }

  cargarDetallesSimulado(data: any): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.metaDetalle = { ...data };
        this.cargando = false;
        // Parse vendedoresJson if present
        if (typeof this.metaDetalle.vendedoresJson === 'string') {
          this.vendedoresParsed = JSON.parse(this.metaDetalle.vendedoresJson);
        } else if (Array.isArray(this.metaDetalle.vendedoresJson)) {
          this.vendedoresParsed = this.metaDetalle.vendedoresJson;
        } else {
          this.vendedoresParsed = [];
        }
      } catch (error) {
        console.error('Error al cargar detalles de la meta:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la meta.';
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