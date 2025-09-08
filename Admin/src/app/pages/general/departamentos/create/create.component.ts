import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Departamento } from 'src/app/Modelos/general/Departamentos.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgxMaskDirective],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
  providers: [provideNgxMask()],
})
export class CreateComponent {
   @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Departamento>();
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  departamento: Departamento = {
    depa_Codigo: '',
    depa_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    depa_FechaCreacion: new Date(),
    depa_FechaModificacion: new Date(),
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
    this.departamento = {
      depa_Codigo: '',
      depa_Descripcion: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      secuencia: 0,
      depa_FechaCreacion: new Date(),
      depa_FechaModificacion: new Date(),
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
    
    if (this.departamento.depa_Descripcion.trim() && this.departamento.depa_Codigo.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      const departamentoGuardar = {
        depa_Codigo: this.departamento.depa_Codigo.trim(),
        depa_Descripcion: this.departamento.depa_Descripcion.trim(),
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        depa_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        numero: "", 
        depa_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      this.http.post<any>(`${environment.apiBaseUrl}/Departamentos/Insertar`, departamentoGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if (response.data.code_Status === 1) 
          {
            this.mensajeExito = `Departamento "${this.departamento.depa_Descripcion}" guardado exitosamente`;
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;
            
            // Ocultar la alerta después de 3 segundos
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit(this.departamento);
              this.cancelar();
            }, 3000);
          }
          else 
          {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar el departamento, ' + response.data.message_Status;
            this.mostrarAlertaExito = false;
            
            // Ocultar la alerta de error después de 5 segundos
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
          
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el departamento. Por favor, intente nuevamente.';
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
