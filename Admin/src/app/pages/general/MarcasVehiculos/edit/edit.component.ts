/**
 * Componente para editar marcas de vehículos existentes
 * Permite modificar la información de una marca, valida cambios y muestra confirmaciones antes de guardar
 */

import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MarcasVehiculos } from 'src/app/Modelos/general/MarcasVehiculos.model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnChanges {
  /**
   * Obtiene la lista de cambios realizados en el formulario
   * Compara los valores actuales con los originales para detectar modificaciones
   * @returns Array de objetos con los cambios detectados (label, valor anterior y nuevo)
   */
  // Devuelve la lista de cambios detectados para el modal de confirmación
  obtenerListaCambios() {
    const cambios = [];
    if (this.marcasVehiculos.maVe_Marca?.trim() !== this.marcasVehiculosOriginal?.trim()) {
      cambios.push({
        label: 'Marca',
        anterior: this.marcasVehiculosOriginal,
        nuevo: this.marcasVehiculos.maVe_Marca
      });
    }
    return cambios;
  }

  // Propiedades de entrada y salida para comunicación con componentes padre
  /** Datos de la marca de vehículo recibidos desde el componente padre para editar */
  @Input() marcasVehiculosData: MarcasVehiculos | null = null;
  /** Evento emitido cuando el usuario cancela la operación de edición */
  @Output() onCancel = new EventEmitter<void>();
  /** Evento emitido cuando se guarda exitosamente la marca de vehículo editada */
  @Output() onSave = new EventEmitter<MarcasVehiculos>();

 /**
   * Objeto que contiene los datos actuales de la marca de vehículo en edición
   * Se actualiza con los valores del formulario
   */
 marcasVehiculos: MarcasVehiculos = {
    maVe_Id: 0,
    maVe_Marca: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    maVe_Estado: true,
    maVe_FechaCreacion: new Date(),
    maVe_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
  };

  // Propiedades para control de estado y validación
  /** Almacena el valor original de la marca para detectar cambios */
  marcasVehiculosOriginal = '';
  /** Controla si se muestran los mensajes de error de validación en el formulario */
  mostrarErrores = false;
  /** Controla la visibilidad de la alerta de éxito */
  mostrarAlertaExito = false;
  /** Mensaje que se muestra en la alerta de éxito */
  mensajeExito = '';
  /** Controla la visibilidad de la alerta de error */
  mostrarAlertaError = false;
  /** Mensaje que se muestra en la alerta de error */
  mensajeError = '';
  /** Controla la visibilidad de la alerta de advertencia */
  mostrarAlertaWarning = false;
  /** Mensaje que se muestra en la alerta de advertencia */
  mensajeWarning = '';
  /** Controla la visibilidad del modal de confirmación de edición */
  mostrarConfirmacionEditar = false;

  /**
   * Constructor del componente
   * @param http Cliente HTTP para realizar peticiones al API
   */
  constructor(private http: HttpClient) {}

  /**
   * Detecta cambios en las propiedades de entrada del componente
   * Inicializa el formulario con los datos recibidos y guarda una copia del valor original
   * @param changes Objeto que contiene los cambios detectados en las propiedades
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['marcasVehiculosData'] && changes['marcasVehiculosData'].currentValue) {
      this.marcasVehiculos = { ...changes['marcasVehiculosData'].currentValue };
      this.marcasVehiculosOriginal = this.marcasVehiculos.maVe_Marca || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
    }
  }

  /**
   * Cancela la operación de edición
   * Cierra todas las alertas y emite el evento onCancel para notificar al componente padre
   */
  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  /**
   * Cierra todas las alertas activas (éxito, error y advertencia)
   * Limpia los mensajes asociados a cada tipo de alerta
   */
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  /**
   * Valida los datos del formulario antes de guardar
   * Verifica que el campo no esté vacío y que haya cambios respecto al valor original
   * Muestra el modal de confirmación si hay cambios válidos
   */
  validarEdicion(): void {
    // Habilita la visualización de errores de validación
    this.mostrarErrores = true;

    if (this.marcasVehiculos.maVe_Marca.trim()) {
      // Verifica si hubo cambios en el valor de la marca
      if (this.marcasVehiculos.maVe_Marca.trim() !== this.marcasVehiculosOriginal) {
        this.mostrarConfirmacionEditar = true;
      } else {
        // No se detectaron cambios
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      // El campo está vacío
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  /**
   * Cancela el proceso de edición desde el modal de confirmación
   * Cierra el modal sin guardar los cambios
   */
  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  /**
   * Confirma la edición desde el modal de confirmación
   * Cierra el modal y procede a guardar los cambios
   */
  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  /**
   * Guarda los cambios realizados en la marca de vehículo
   * Realiza una petición PUT al API para actualizar la marca
   * Muestra alertas de éxito o error según el resultado de la operación
   */
  private guardar(): void {
    this.mostrarErrores = true;

    if (this.marcasVehiculos.maVe_Marca.trim()) {
      // Prepara el objeto con los datos actualizados para enviar al API
      const marcasVehiculosActualizar = {
        maVe_Id: this.marcasVehiculos.maVe_Id,
        maVe_Marca: this.marcasVehiculos.maVe_Marca.trim(),
        usua_Creacion: this.marcasVehiculos.usua_Creacion,
        maVe_FechaCreacion: this.marcasVehiculos.maVe_FechaCreacion,
        usua_Modificacion: getUserId(),
        maVe_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      // Realiza la petición PUT al API para actualizar la marca
      this.http.put<any>(`${environment.apiBaseUrl}/MarcasVehiculos/Editar`, marcasVehiculosActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        // Maneja la respuesta exitosa del servidor
        next: (response) => {
          this.mensajeExito = `Marca de Vehiculo "${this.marcasVehiculos.maVe_Marca}" actualizada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.marcasVehiculos);
            this.cancelar();
          }, 3000);
        },
        // Maneja los errores que ocurran durante la petición HTTP
        error: (error) => {
          console.error('Error al actualizar marca:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la marca. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      // Maneja el caso cuando el campo de marca está vacío
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}
