import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { EstadoCivil } from 'src/app/Modelos/general/EstadoCivil.Model';
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
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<EstadoCivil>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  estadoCivil: EstadoCivil = {
    esCv_Id: 0,
    esCv_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    esCv_FechaCreacion: new Date(),
    esCv_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.onOverlayChange.emit(false);
    this.estadoCivil = {
      esCv_Id: 0,
      esCv_Descripcion: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      secuencia: 0,
      esCv_FechaCreacion: new Date(),
      esCv_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: ''
    };
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
    if (this.estadoCivil.esCv_Descripcion.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      const estadoCivilGuardar = {
        esCv_Id: 0,
        esCv_Descripcion: this.estadoCivil.esCv_Descripcion.trim(),
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        esCv_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        numero: "", 
        esCv_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      
      
      this.http.post<any>(`${environment.apiBaseUrl}/EstadosCiviles/Insertar`, estadoCivilGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mostrarErrores = false;
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            this.mensajeExito = `Estado civil "${this.estadoCivil.esCv_Descripcion}" guardado exitosamente`;
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.onSave.emit(this.estadoCivil);
                this.cancelar();
              }, 100);
            }, 2000);
          }, 300);
        },
        error: (error) => {

          setTimeout(() => {
            this.onOverlayChange.emit(false);
            console.error('Error al guardar estado civil:', error);
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar el estado civil. Por favor, intente nuevamente.';
            this.mostrarAlertaExito = false;
            // Ocultar la alerta de error después de 5 segundos
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }, 1000);
        }
      });
    } else {
      // Mostrar alerta de warning para campos vacíos
      this.onOverlayChange.emit(false);
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
