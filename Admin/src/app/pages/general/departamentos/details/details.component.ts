import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Departamento } from 'src/app/Modelos/general/Departamentos.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() departamentoData: Departamento | null = null;
  @Output() onClose = new EventEmitter<void>();

  departamentoDetalle: Departamento | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  // Formatear fecha para mostrar con manejo de errores
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departamentoData'] && changes['departamentoData'].currentValue) {
      this.cargarDetallesSimulado(changes['departamentoData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Departamento): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.departamentoDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del departamento:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del departamento.';
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


}
