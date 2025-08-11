import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Canal } from 'src/app/Modelos/general/Canal.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnChanges {
  @Input() canalDetalle: Canal | null = null;
  @Output() onClose = new EventEmitter<void>();

  canalDetalleCopia: Canal | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['canalDetalle'] && changes['canalDetalle'].currentValue) {
      this.cargarDetallesSimulado(changes['canalDetalle'].currentValue);
    }
  }

  cargarDetallesSimulado(data: Canal): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.canalDetalleCopia = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del canal:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del canal.';
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