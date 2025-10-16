/**
 * Componente para editar marcas existentes
 * Permite modificar la información de una marca, valida cambios y muestra confirmaciones antes de guardar
 */

import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Marcas } from 'src/app/Modelos/general/Marcas.Model';
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
    if (this.marca.marc_Descripcion?.trim() !== this.marcaOriginal?.trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.marcaOriginal,
        nuevo: this.marca.marc_Descripcion
      });
    }
    return cambios;
  }

  // Propiedades de entrada y salida para comunicación con componentes padre
  /** Datos de la marca recibidos desde el componente padre para editar */
  @Input() marcaData: Marcas | null = null;
  /** Evento emitido cuando el usuario cancela la operación de edición */
  @Output() onCancel = new EventEmitter<void>();
  /** Evento emitido cuando se guarda exitosamente la marca editada */
  @Output() onSave = new EventEmitter<Marcas>();

 /**
   * Objeto que contiene los datos actuales de la marca en edición
   * Se actualiza con los valores del formulario
   */
 marca: Marcas = {
    marc_Id: 0,
    marc_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    marc_Estado: true,
    marc_FechaCreacion: new Date(),
    marc_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
  };

  // Propiedades para control de estado y validación
  /** Almacena el valor original de la descripción para detectar cambios */
  marcaOriginal = '';
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
    if (changes['marcaData'] && changes['marcaData'].currentValue) {
      this.marca = { ...changes['marcaData'].currentValue };
      this.marcaOriginal = this.marca.marc_Descripcion || '';
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

    if (this.marca.marc_Descripcion.trim()) {
      // Verifica si hubo cambios en el valor de la descripción
      if (this.marca.marc_Descripcion.trim() !== this.marcaOriginal) {
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
   * Guarda los cambios realizados en la marca
   * Realiza una petición PUT al API para actualizar la marca
   * Muestra alertas de éxito o error según el resultado de la operación
   */
  private guardar(): void {
    this.mostrarErrores = true;

    if (this.marca.marc_Descripcion.trim()) {
      // Prepara el objeto con los datos actualizados para enviar al API
      const marcaActualizar = {
        marc_Id: this.marca.marc_Id,
        marc_Descripcion: this.marca.marc_Descripcion.trim(),
        usua_Creacion: this.marca.usua_Creacion,
        marc_FechaCreacion: this.marca.marc_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.marca.marc_Id  || '',
        marc_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      // Realiza la petición PUT al API para actualizar la marca
      this.http.put<any>(`${environment.apiBaseUrl}/Marcas/Actualizar`, marcaActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        // Maneja la respuesta exitosa del servidor
        next: (response) => {
          this.mensajeExito = `Marca "${this.marca.marc_Descripcion}" actualizada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.marca);
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
      // Maneja el caso cuando el campo de descripción está vacío
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}
