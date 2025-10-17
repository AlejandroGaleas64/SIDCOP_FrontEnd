import { Component, Output, EventEmitter } from '@angular/core';
import { Canal } from 'src/app/Modelos/general/Canal.Model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create',
  standalone: true,
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Canal>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  // Modelo del canal a crear con valores iniciales
  canal: Canal = new Canal();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  // Limpia el formulario y emite evento de cancelación al padre
  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.canal = new Canal();
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

  // Valida campos requeridos y ejecuta POST al endpoint de inserción
  guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);

    if (
      this.canal.cana_Descripcion &&
      this.canal.cana_Descripcion.trim()
    ) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;

      const canalGuardar = {
        ...this.canal,
        cana_Id: 0,
        cana_Descripcion: this.canal.cana_Descripcion.trim(),
        cana_Observaciones: this.canal.cana_Observaciones?.trim() || '',
        usua_Creacion: getUserId(),
        cana_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        cana_FechaModificacion: new Date().toISOString(),
        cana_Estado: true,
        UsuarioCreacion: '',
        UsuarioModificacion: ''
      };

      this.http.post<any>(`${environment.apiBaseUrl}/Canal/Insertar`, canalGuardar, {
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
            this.mensajeExito = `Canal "${this.canal.cana_Descripcion}" guardado exitosamente`;
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.onSave.emit(this.canal);
                this.cancelar();
              }, 100);
            }, 2000);
          }, 300);
        },
        error: () => {
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar el canal. Por favor, intente nuevamente.';
            this.mostrarAlertaExito = false;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }, 300);
        }
      });
    } else {
      this.onOverlayChange.emit(false);
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}