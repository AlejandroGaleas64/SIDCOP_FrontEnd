
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
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<MarcasVehiculos>();
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

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
    
    if (this.marca.maVe_Marca.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
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

      console.log('Guardando marca:', marcaGuardar);
      
      this.http.post<any>(`${environment.apiBaseUrl}/MarcasVehiculos/Insertar`, marcaGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          console.log('Marca guardada exitosamente:', response);
          this.mensajeExito = `Marca de Vehiculo "${this.marca.maVe_Marca}" guardada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          
          // Ocultar la alerta después de 3 segundos
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.marca);
            this.cancelar();
          }, 3000);
        },
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