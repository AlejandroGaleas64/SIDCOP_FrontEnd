import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Modelo } from 'src/app/Modelos/general/Modelo.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() modeloData: Modelo | null = null;
  @Output() onClose = new EventEmitter<void>();

  modeloDetalle: Modelo | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  /**
   * Detecta cambios en las propiedades de entrada del componente
   * @param changes - Objeto con los cambios detectados
   * - Carga los detalles cuando se reciben nuevos datos del modelo
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloData'] && changes['modeloData'].currentValue) {
      this.cargarDetallesSimulado(changes['modeloData'].currentValue);
    }
  }

  /**
   * Simula la carga de detalles del modelo
   * @param data - Datos del modelo a mostrar
   * - Muestra indicador de carga
   * - Crea una copia de los datos para visualización
   * - Maneja errores durante la carga
   * - Simula tiempo de respuesta del servidor
   */
  cargarDetallesSimulado(data: Modelo): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.modeloDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del modelo:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del modelo.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  /**
   * Cierra la vista de detalles del modelo
   * - Emite evento para cerrar el componente de detalles
   */
  cerrar(): void {
    this.onClose.emit();
  }

  /**
   * Cierra las alertas de error
   * - Oculta la alerta de error
   * - Limpia el mensaje de error
   */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Formatea una fecha para mostrar en la interfaz
   * @param fecha - Fecha a formatear (string, Date o null)
   * @returns Fecha formateada en español hondureño o 'N/A' si es inválida
   * - Maneja diferentes tipos de entrada (string, Date, null)
   * - Valida que la fecha sea válida
   * - Aplica formato local hondureño (es-HN)
   */
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