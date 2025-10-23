/**
 * Componente para crear nuevos tipos de vendedores
 * Permite al usuario ingresar y guardar información de tipos de vendedores en el sistema
 */

import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TipoVendedores  } from 'src/app/Modelos/general/TipoVendedores.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  // Eventos de salida para comunicación con componentes padre
  /** Evento emitido cuando el usuario cancela la operación de creación */
  @Output() onCancel = new EventEmitter<void>();
  /** Evento emitido cuando se guarda exitosamente un tipo de vendedor */
  @Output() onSave = new EventEmitter<TipoVendedores>();
  
  // Propiedades para controlar la visualización de mensajes y alertas
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

  /**
   * Constructor del componente
   * @param http Cliente HTTP para realizar peticiones al API
   */
  constructor(private http: HttpClient) {}

  /**
   * Objeto que contiene los datos del tipo de vendedor a crear
   * Inicializado con valores por defecto
   */
  tipoVendedor: TipoVendedores = {
    tiVe_Id: 0,
    tiVe_TipoVendedor: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    tiVe_FechaCreacion: new Date(),
    tiVe_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: '',
  };

  /**
   * Cancela la operación de creación y resetea el formulario
   * Limpia todas las alertas y mensajes, resetea el objeto tipoVendedor a sus valores iniciales
   * y emite el evento onCancel para notificar al componente padre
   */
  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.tipoVendedor = {
      tiVe_Id: 0,
      tiVe_TipoVendedor: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      tiVe_FechaCreacion: new Date(),
      tiVe_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      secuencia: '',
    };
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
   * Guarda un nuevo tipo de vendedor en el sistema
   * Valida que el campo de descripción no esté vacío antes de realizar la petición HTTP
   * Muestra alertas de éxito, error o advertencia según el resultado de la operación
   */
  guardar(): void {
    // Habilita la visualización de errores de validación
    this.mostrarErrores = true;
    
    // Valida que el campo de descripción no esté vacío
    if (this.tipoVendedor.tiVe_TipoVendedor.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      // Prepara el objeto con los datos necesarios para enviar al API
      const tipoVendedorGuardar = {
        tiVe_TipoVendedor: this.tipoVendedor.tiVe_TipoVendedor.trim(),
        usua_Creacion: getUserId(),
        tiVe_FechaCreacion: new Date()
      };
      
      // Realiza la petición POST al API para insertar el nuevo tipo de vendedor
      this.http.post<any>(`${environment.apiBaseUrl}/TiposDeVendedor/Insertar`, tipoVendedorGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        // Maneja la respuesta exitosa del servidor
        next: (response) => {
          this.mensajeExito = `Tipo de vendedor "${this.tipoVendedor.tiVe_TipoVendedor}" guardado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          
          // Ocultar la alerta después de 3 segundos
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.tipoVendedor);
            this.cancelar();
          }, 3000);
        },
        // Maneja los errores que ocurran durante la petición HTTP
        error: (error) => {
          console.error('Error al guardar tipo de vendedor:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el tipo de vendedor. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          
          // Ocultar la alerta de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
      // Maneja el caso cuando el campo de descripción está vacío
      // Mostrar alerta de warning para campos vacíos
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      
      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}
