import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { UnidadDePeso } from 'src/app/Modelos/general/UnidadDePeso.Model';
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
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<UnidadDePeso>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  UnidadDePeso: UnidadDePeso = {
    unPe_Id: 0,
    unPe_Descripcion: '',
    unPe_Abreviatura: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    unPe_FechaCreacion: new Date(),
    unPe_FechaModificacion: new Date(),
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
    this.UnidadDePeso = {
      unPe_Id: 0,
      unPe_Descripcion: '',
      unPe_Abreviatura: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      secuencia: 0,
      unPe_FechaCreacion: new Date(),
      unPe_FechaModificacion: new Date(),
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

  onAbreviaturaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove any non-letter characters and limit to 2 characters
    let value = input.value.replace(/[^a-zA-Z]/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2);
    }
    // Update the model
    this.UnidadDePeso.unPe_Abreviatura = value;
    // Update the input value
    input.value = value;
  }

  guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
    
    // Reset all alerts
    this.cerrarAlerta();
    
    // Validar que la abreviatura tenga exactamente 2 letras y solo contenga letras
    const abreviaturaValida = /^[A-Za-z]{2}$/.test(this.UnidadDePeso.unPe_Abreviatura);
    
    if (!abreviaturaValida) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La abreviatura debe contener exactamente 2 letras (sin números ni caracteres especiales)';
      this.onOverlayChange.emit(false);
      return;
    }
    
    if (!this.UnidadDePeso.unPe_Descripcion?.trim()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete el campo de descripción';
      this.onOverlayChange.emit(false);
      return;
    }

    const userId = getUserId();
    
    if (!userId || userId === 0) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error: No se pudo obtener el ID del usuario';
      this.onOverlayChange.emit(false);
      return;
    }

    const payload = {
      UnPe_Descripcion: this.UnidadDePeso.unPe_Descripcion.trim(),
      UnPe_Abreviatura: this.UnidadDePeso.unPe_Abreviatura.trim(),
      Usua_Creacion: userId,
      UnPe_FechaCreacion: new Date().toISOString(),
      Usua_Modificacion: 0,
      UnPe_FechaModificacion: new Date().toISOString(),
      Secuencia: ""
    };

    console.log('Enviando payload:', JSON.stringify(payload, null, 2));

    this.http.post<any>(`${environment.apiBaseUrl}/UnidadDePeso/Insertar`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': environment.apiKey
      },
      observe: 'response'
    }).subscribe({
      next: (response) => {
        console.log('Respuesta del servidor:', response);
        if (response.status === 200 && response.body?.success) {
          this.mostrarAlertaExito = true;
          this.mensajeExito = response.body?.message || 'Unidad de peso creada correctamente';
          // Emitir el evento para actualizar la lista
          this.onSave.emit(response.body?.data || payload);
          
          // Reset form
          this.UnidadDePeso.unPe_Descripcion = '';
          this.mostrarErrores = false;
          
          // Cerrar el modal después de 2 segundos
          setTimeout(() => {
            this.cancelar();
          }, 2000);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response.body?.message || 'Error al crear la unidad de peso';
          this.onOverlayChange.emit(false);
        }
      },
      error: (error) => {
        console.error('Error al guardar:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = error.error?.message || 'Error al conectar con el servidor';
        this.onOverlayChange.emit(false);
      },
      complete: () => {
        // No necesitamos hacer nada aquí ya que manejamos el overlay en next y error
      }
    });
  }
}