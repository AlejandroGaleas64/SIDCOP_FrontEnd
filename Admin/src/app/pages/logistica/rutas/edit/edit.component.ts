// ESTOS SON TODOS LOS IMPORTS NECESARIOS
import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Ruta } from 'src/app/Modelos/logistica/Rutas.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit',
  standalone: true,
  // CONFIRMAMOS LOS IMPORTS A UTILIZAR
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnChanges {
  @Input() rutaData: Ruta | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Ruta>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

 ruta: Ruta = {
    ruta_Id: 0,
    ruta_Codigo: '',
    ruta_Descripcion: '',
    ruta_Observaciones: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    ruta_FechaCreacion: new Date(),
    ruta_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  rutaOriginal: any = {};
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
    if (changes['rutaData'] && changes['rutaData'].currentValue) {
      this.ruta = { ...changes['rutaData'].currentValue };
      this.rutaOriginal = { ...this.rutaData };
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

  // VALIDACIONES PARA TODOS LOS CAMPOS NECESARIOS Y LOS VALORES REQUERIDOS
  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.ruta.ruta_Codigo.trim() && this.ruta.ruta_Descripcion.trim()) {
      if (this.hayDiferencias()) {
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

  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cambiosDetectados: any = {};

  // PARA EL MENSAJE DE CONFIRMACIÓN CON LOS CAMBIOS NUEVOS Y LOS CAMPOS ANTERIORES
  hayDiferencias(): boolean {
    const a = this.ruta;
    const b = this.rutaOriginal;
    this.cambiosDetectados = {};

    // Verificar cada campo y almacenar los cambios
    if (a.ruta_Codigo !== b.ruta_Codigo) {
      this.cambiosDetectados.codigo = {
        anterior: b.ruta_Codigo,
        nuevo: a.ruta_Codigo,
        label: 'Código de la ruta'
      };
    }

    if (a.ruta_Descripcion !== b.ruta_Descripcion) {
      this.cambiosDetectados.descripcion = {
        anterior: b.ruta_Descripcion,
        nuevo: a.ruta_Descripcion,
        label: 'Descripción de la ruta'
      };
    }
   
    if (a.ruta_Observaciones !== b.ruta_Observaciones) {
      this.cambiosDetectados.Observaciones = {
        anterior: b.ruta_Observaciones,
        nuevo: a.ruta_Observaciones,
        label: 'Observaciones de la ruta'
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  // EL PROCESO DE GUARDAR LA EDICIÓN CON LAS VALIDACIONES CONFIRMADAS
  private guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);

    if (this.ruta.ruta_Codigo.trim() && this.ruta.ruta_Descripcion.trim()) {
      const rutaActualizar = {
        ruta_Id: this.ruta.ruta_Id,
        ruta_Codigo: this.ruta.ruta_Codigo.trim(),
        ruta_Descripcion: this.ruta.ruta_Descripcion.trim(),
        ruta_Observaciones: this.ruta.ruta_Observaciones.trim(),
        usua_Creacion: this.ruta.usua_Creacion,
        ruta_FechaCreacion: this.ruta.ruta_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.ruta.secuencia || '',
        ruta_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Rutas/Modificar`, rutaActualizar, {
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
            this.mensajeExito = `Ruta "${this.ruta.ruta_Descripcion}" actualizada exitosamente`;  
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.onSave.emit(this.ruta);
                this.cancelar();
              }, 100);
            }, 2000);
          }, 300);
        },
        error: (error) => {
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            //console.error('Error al actualizar ruta:', error);
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar la ruta. Por favor, intente nuevamente.';
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
