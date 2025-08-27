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

  private guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);

    if (this.UnidadDePeso.unPe_Descripcion.trim()) {
      const UnidadDePesoActualizar = {
        unPe_Id: this.UnidadDePeso.unPe_Id,
        unPe_Descripcion: this.UnidadDePeso.unPe_Descripcion.trim(),
        usua_Creacion: this.UnidadDePeso.usua_Creacion,
        unPe_FechaCreacion: this.UnidadDePeso.unPe_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.UnidadDePeso.secuencia || '',
        unPe_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/UnidadesMedida/Actualizar`, UnidadDePesoActualizar, {
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
            this.mensajeExito = `Unidad De Peso "${this.UnidadDePeso.unPe_Descripcion}" actualizada exitosamente`;
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.onSave.emit(this.UnidadDePeso);
                this.cancelar();
              }, 100);
            }, 2000);
          }, 300);
        },
        error: (error) => {
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            console.error('Error al actualizar Unidad De Peso:', error);
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar la Unidad De Peso. Por favor, intente nuevamente.';
            setTimeout(() => this.cerrarAlerta(), 5000);
          }, 1000);
        }
      });
    } else {
      this.onOverlayChange.emit(false);
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}