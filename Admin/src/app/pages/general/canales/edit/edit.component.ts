import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Canal } from 'src/app/Modelos/general/Canal.Model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit',
  standalone: true,
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class EditComponent implements OnChanges {
  @Input() canalData: Canal | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Canal>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  canal: Canal = new Canal();

  canalOriginalDescripcion = '';
  canalOriginalObservaciones = '';
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
    if (changes['canalData'] && this.canalData) {
      this.canal = { ...this.canalData };
      this.canalOriginalDescripcion = this.canal.cana_Descripcion || '';
      this.canalOriginalObservaciones = this.canal.cana_Observaciones || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
    }
  }

  cancelar() {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  cerrarAlerta() {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.canal.cana_Descripcion.trim() && this.canal.cana_Observaciones.trim()) {
      if (
        this.canal.cana_Descripcion.trim() !== this.canalOriginalDescripcion ||
        this.canal.cana_Observaciones.trim() !== this.canalOriginalObservaciones
      ) {
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
    console.log('Confirmar edición de canal');
    this.guardar();
  }

  private guardar() {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
    // ...payload igual...
    const canal: any = {
      cana_Id: this.canal.cana_Id,
      cana_Descripcion: this.canal.cana_Descripcion.trim(),
      cana_Observaciones: this.canal.cana_Observaciones.trim(),
      usua_Creacion: this.canal.usua_Creacion,
      cana_FechaCreacion: this.canal.cana_FechaCreacion instanceof Date
        ? this.canal.cana_FechaCreacion.toISOString()
        : this.canal.cana_FechaCreacion,
      usua_Modificacion: getUserId(),
      cana_FechaModificacion: new Date().toISOString(),
      cana_Estado: this.canal.cana_Estado,
      UsuarioCreacion: this.canal.usuarioCreacion || '',
      UsuarioModificacion: this.canal.usuarioModificacion || ''
    };

    if (canal.cana_Descripcion && canal.cana_Observaciones) {
      this.http.put<any>(`${environment.apiBaseUrl}/Canal/Actualizar`, canal, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (resp) => {
          console.log('Respuesta del PUT /Canal/Actualizar:', resp);
          this.mostrarErrores = false;
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            this.mensajeExito = `Canal "${this.canal.cana_Descripcion}" actualizado exitosamente`;
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.onSave.emit(this.canal);
                this.cancelar();
              }, 100);
            }, 2000);
          }, 1000);
        },
        error: (err) => {
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            console.error('Error en PUT /Canal/Actualizar:', err);
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar canal. Por favor, intente nuevamente.';
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