import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Marcas } from 'src/app/Modelos/general/Marcas.Model';
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
    if (this.marca.marc_Descripcion?.trim() !== this.marcaOriginal?.trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.marcaOriginal,
        nuevo: this.marca.marc_Descripcion
      });
    }
    return cambios;
  }

  @Input() marcaData: Marcas | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Marcas>();

 marca: Marcas = {
    marc_Id: 0,
    marc_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    marc_Estado: true,
    marc_FechaCreacion: new Date(),
    marc_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
  };

  marcaOriginal = '';
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
    if (changes['marcaData'] && changes['marcaData'].currentValue) {
      this.marca = { ...changes['marcaData'].currentValue };
      this.marcaOriginal = this.marca.marc_Descripcion || '';
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

    if (this.marca.marc_Descripcion.trim()) {
      if (this.marca.marc_Descripcion.trim() !== this.marcaOriginal) {
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

    if (this.marca.marc_Descripcion.trim()) {
      const marcaActualizar = {
        marc_Id: this.marca.marc_Id,
        marc_Descripcion: this.marca.marc_Descripcion.trim(),
        usua_Creacion: this.marca.usua_Creacion,
        marc_FechaCreacion: this.marca.marc_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.marca.marc_Id  || '',
        marc_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Marcas/Actualizar`, marcaActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Marca "${this.marca.marc_Descripcion}" actualizada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.marca);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al actualizar marca:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la marca. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}
