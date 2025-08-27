import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { UnidadDePeso } from 'src/app/Modelos/general/UnidadDePeso.Model';
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
  // Devuelve la lista de cambios detectados para el modal de confirmación
  obtenerListaCambios() {
    const cambios = [];
    if (this.UnidadDePeso.unPe_Descripcion?.trim() !== this.UnidadDePesoOriginal?.trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.UnidadDePesoOriginal,
        nuevo: this.UnidadDePeso.unPe_Descripcion
      });
    }
    return cambios;
  }
  
  @Input() UnidadDePesoData: UnidadDePeso | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<UnidadDePeso>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  UnidadDePeso: UnidadDePeso = {
    unPe_Id: 0,
    unPe_Descripcion: '',
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

  UnidadDePesoOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['UnidadDePesoData'] && changes['UnidadDePesoData'].currentValue) {
      this.UnidadDePeso = { ...changes['UnidadDePesoData'].currentValue };
      this.UnidadDePesoOriginal = this.UnidadDePeso.unPe_Descripcion || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
    }
  }

  cancelar(): void {
    this.cerrarAlerta();
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

  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.UnidadDePeso.unPe_Descripcion.trim()) {
      if (this.UnidadDePeso.unPe_Descripcion.trim() !== this.UnidadDePesoOriginal) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
    this.cerrarAlerta();
    
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
      unPe_Id: this.UnidadDePeso.unPe_Id,
      UnPe_Descripcion: this.UnidadDePeso.unPe_Descripcion.trim(),
      Usua_Modificacion: userId,
      UnPe_FechaModificacion: new Date().toISOString()
    };

    console.log('Enviando payload de actualización:', JSON.stringify(payload, null, 2));

    this.http.put<any>(`${environment.apiBaseUrl}/UnidadDePeso/Actualizar`, payload, {
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
          this.mensajeExito = response.body?.message || 'Unidad de peso actualizada correctamente';
          this.onSave.emit(response.body?.data || this.UnidadDePeso);
          
          setTimeout(() => {
            this.cancelar();
          }, 2000);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response.body?.message || 'Error al actualizar la unidad de peso';
          this.onOverlayChange.emit(false);
        }
      },
      error: (error) => {
        console.error('Error al actualizar:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = error.error?.message || 'Error al conectar con el servidor';
        this.onOverlayChange.emit(false);
      },
      complete: () => {
        this.mostrarConfirmacionEditar = false;
      }
    });
  }
}