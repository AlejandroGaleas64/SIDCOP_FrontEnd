import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { EstadoCivil } from 'src/app/Modelos/general/EstadoCivil.Model';
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
  // Genera lista de cambios detectados para el modal de confirmación
  obtenerListaCambios() {
    const cambios = [];
    if (this.estadoCivil.esCv_Descripcion?.trim() !== this.estadoCivilOriginal?.trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.estadoCivilOriginal,
        nuevo: this.estadoCivil.esCv_Descripcion
      });
    }
    return cambios;
  }
  @Input() estadoCivilData: EstadoCivil | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<EstadoCivil>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

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

  estadoCivilOriginal = '';
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
    if (changes['estadoCivilData'] && changes['estadoCivilData'].currentValue) {
      this.estadoCivil = { ...changes['estadoCivilData'].currentValue };
      this.estadoCivilOriginal = this.estadoCivil.esCv_Descripcion || '';
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

  // Valida campos requeridos y detecta cambios antes de mostrar confirmación
  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.estadoCivil.esCv_Descripcion.trim()) {
      if (this.estadoCivil.esCv_Descripcion.trim() !== this.estadoCivilOriginal) {
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

  // Ejecuta PUT al endpoint de actualización con el payload del estado civil
  private guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);

    if (this.estadoCivil.esCv_Descripcion.trim()) {
      const estadoCivilActualizar = {
        esCv_Id: this.estadoCivil.esCv_Id,
        esCv_Descripcion: this.estadoCivil.esCv_Descripcion.trim(),
        usua_Creacion: this.estadoCivil.usua_Creacion,
        esCv_FechaCreacion: this.estadoCivil.esCv_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.estadoCivil.secuencia || '',
        esCv_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/EstadosCiviles/Actualizar`, estadoCivilActualizar, {
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
            this.mensajeExito = `Estado civil "${this.estadoCivil.esCv_Descripcion}" actualizado exitosamente`;
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
            console.error('Error al actualizar estado civil:', error);
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar el estado civil. Por favor, intente nuevamente.';
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
