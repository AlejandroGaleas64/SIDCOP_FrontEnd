
/**
 * Componente para crear nuevas marcas de vehículos
 * Permite al usuario ingresar y guardar información de marcas de vehículos en el sistema
 */

import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MarcasVehiculos } from 'src/app/Modelos/general/MarcasVehiculos.model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent {
  // Eventos de salida para comunicación con componentes padre
  /** Evento emitido cuando el usuario cancela la operación de creación */
  @Output() onCancel = new EventEmitter<void>();
  /** Evento emitido cuando se guarda exitosamente una marca de vehículo */
  @Output() onSave = new EventEmitter<MarcasVehiculos>();
  
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
   * Objeto que contiene los datos de la marca de vehículo a crear
   * Inicializado con valores por defecto
   */
  marca: MarcasVehiculos = {
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

  /**
   * Cancela la operación de creación y resetea el formulario
   * Limpia todas las alertas y mensajes, resetea el objeto marca a sus valores iniciales
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
    this.marca = {
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
   * Guarda una nueva marca de vehículo en el sistema
   * Valida que el campo de marca no esté vacío antes de realizar la petición HTTP
   * Muestra alertas de éxito, error o advertencia según el resultado de la operación
   */
  guardar(): void {
    // Habilita la visualización de errores de validación
    this.mostrarErrores = true;
    
    // Valida que el campo de marca no esté vacío
    if (this.marca.maVe_Marca.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      // Prepara el objeto con los datos necesarios para enviar al API
      const marcaGuardar = {
        maVe_Id: 0,
        maVe_Marca: this.marca.maVe_Marca.trim(),
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        maVe_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        maVe_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      //console.log('Guardando marca:', marcaGuardar);
      
      // Realiza la petición POST al API para insertar la nueva marca
      this.http.post<any>(`${environment.apiBaseUrl}/MarcasVehiculos/Insertar`, marcaGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        // Maneja la respuesta exitosa del servidor
        next: (response) => {
          console.log('Respuesta del servidor:', response); // Debug
          
          // Verificar si la respuesta es un error de duplicado (code_Status: -1)
          if (response && (response.code_Status === -1 || response.code_Status === '-1' || response.message_Status?.includes('duplicad'))) {
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
            this.mostrarAlertaWarning = false;
            this.mensajeError = response.message_Status || 'Ya existe una marca de vehículo con estos datos.';
            
            // Ocultar la alerta de error después de 5 segundos
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            return; // Importante: salir de la función para no mostrar mensaje de éxito
          } else {
            //console.log('Marca guardada exitosamente:', response);
            this.mensajeExito = `Marca de Vehiculo "${this.marca.maVe_Marca}" guardada exitosamente`;
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;
            
            // Ocultar la alerta después de 3 segundos
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit(this.marca);
              this.cancelar();
            }, 3000);
          }
        },
        // Maneja los errores que ocurran durante la petición HTTP
        error: (error) => {
          console.error('Error al guardar marca:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar la marca. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          
          // Ocultar la alerta de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
      // Maneja el caso cuando el campo de marca está vacío
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