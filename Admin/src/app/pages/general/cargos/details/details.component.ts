import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cargos } from 'src/app/Modelos/general/Cargos.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  // Recibe el registro cuyos detalles se mostrarán
  @Input() cargoData: Cargos | null = null;
  // Emite evento para cerrar el panel de detalles
  @Output() onClose = new EventEmitter<void>();

  // Estado local para presentar la información
  cargoDetalle: Cargos | null = null;
  cargando = false;

  // Manejo de errores visuales
  mostrarAlertaError = false;
  mensajeError = '';

  // Sincroniza input y simula la carga de detalles al cambiar el dato
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cargoData'] && changes['cargoData'].currentValue) {
      this.cargarDetallesSimulado(changes['cargoData'].currentValue);
    }
  }

  // Simulación de carga de detalles
  cargarDetallesSimulado(data: Cargos): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.cargoDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        // Falla controlada en la carga de la vista de detalles
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del cargo.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  // Notifica al contenedor para cerrar detalles
  cerrar(): void {
    this.onClose.emit();
  }

  // Oculta cualquier alerta activa
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  // Helper para formatear fechas en locale es-HN
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
