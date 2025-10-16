/**
 * Componente para mostrar los detalles de una marca de vehículo
 * Muestra información detallada de una marca seleccionada y permite cerrar la vista
 */

import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarcasVehiculos } from 'src/app/Modelos/general/MarcasVehiculos.model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  // Propiedades de entrada y salida para comunicación con componentes padre
  /** Datos de la marca de vehículo recibidos desde el componente padre */
  @Input() marcasVehiculosData: MarcasVehiculos | null = null;
  /** Evento emitido cuando el usuario cierra la vista de detalles */
  @Output() onClose = new EventEmitter<void>();

  // Propiedades para gestionar el estado del componente
  /** Almacena los detalles de la marca de vehículo a mostrar */
  marcasVehiculosDetalle: MarcasVehiculos | null = null;
  /** Indica si los datos están siendo cargados */
  cargando = false;

  // Propiedades para controlar alertas de error
  /** Controla la visibilidad de la alerta de error */
  mostrarAlertaError = false;
  /** Mensaje que se muestra en la alerta de error */
  mensajeError = '';

  /**
   * Detecta cambios en las propiedades de entrada del componente
   * Se ejecuta cuando marcasVehiculosData cambia y carga los detalles de la marca
   * @param changes Objeto que contiene los cambios detectados en las propiedades
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['marcasVehiculosData'] && changes['marcasVehiculosData'].currentValue) {
      this.cargarDetallesSimulado(changes['marcasVehiculosData'].currentValue);
    }
  }

  /**
   * Simula la carga de detalles de una marca de vehículo
   * Copia los datos recibidos y maneja posibles errores durante el proceso
   * @param data Objeto con los datos de la marca de vehículo a cargar
   */
  // Simulación de carga
  cargarDetallesSimulado(data: MarcasVehiculos): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    // Simula un retraso en la carga de datos
    setTimeout(() => {
      try {
        // Crea una copia de los datos recibidos
        this.marcasVehiculosDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la marca:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la marca.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  /**
   * Cierra la vista de detalles
   * Emite el evento onClose para notificar al componente padre
   */
  cerrar(): void {
    this.onClose.emit();
  }

  /**
   * Cierra la alerta de error activa
   * Oculta la alerta y limpia el mensaje de error
   */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

 /**
   * Formatea una fecha al formato local de Honduras
   * Convierte fechas en formato string o Date a un formato legible
   * @param fecha Fecha a formatear (puede ser string, Date o null)
   * @returns Fecha formateada en formato 'dd/mm/yyyy hh:mm' o 'N/A' si la fecha es inválida
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
