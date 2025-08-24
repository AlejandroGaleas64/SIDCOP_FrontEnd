import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { EstadoVisita  } from 'src/app/Modelos/general/EstadoVisita.Model';
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
  @Output() onSave = new EventEmitter<EstadoVisita>();
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  estadoVisita: EstadoVisita = {
    esVi_Id: 0,
    esVi_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    esVi_FechaCreacion: new Date(),
    esVi_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
  };

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.estadoVisita = {
      esVi_Id: 0,
      esVi_Descripcion: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      esVi_FechaCreacion: new Date(),
      esVi_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      secuencia: 0,
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
    
    if (this.estadoVisita.esVi_Descripcion.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      const estadoVisitaGuardar = {
        esVi_Id: 0,
        esVi_Descripcion: this.estadoVisita.esVi_Descripcion.trim(),
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        esVi_FechaCreacion: new Date(),
        usua_Modificacion: 0,
        numero: "", 
        esVi_FechaModificacion: new Date(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      console.log('Guardando estadoVisita:', estadoVisitaGuardar);
      
      this.http.post<any>(`${environment.apiBaseUrl}/EstadoVisita/Insertar`, estadoVisitaGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          console.log('Estado de Visita guardada exitosamente:', response);
          this.mensajeExito = `Estado de Visita "${this.estadoVisita.esVi_Descripcion}" guardada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          
          // Ocultar la alerta después de 3 segundos
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.estadoVisita);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al guardar estadoVisita:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar la estadoVisita. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          
          // Ocultar la alerta de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
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
