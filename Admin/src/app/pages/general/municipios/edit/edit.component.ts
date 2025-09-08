import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Municipio } from 'src/app/Modelos/general/Municipios.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent {
  @Input() municipioData: Municipio | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Municipio>();

  // Devuelve la lista de cambios detectados para el modal de confirmación
  obtenerListaCambios() {
    const cambios = [];
    
    // Comparar descripción
    if (this.municipio.muni_Descripcion?.trim() !== this.municipioOriginal?.trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.municipioOriginal,
        nuevo: this.municipio.muni_Descripcion
      });
    }
    
    return cambios;
  }

 municipio: Municipio = {
    muni_Codigo: '',
    muni_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    depa_Codigo: '',
    muni_FechaCreacion: new Date(),
    muni_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  municipioOriginal = '';
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
    if (changes['municipioData'] && changes['municipioData'].currentValue) {
      this.municipio = { ...changes['municipioData'].currentValue };
      this.municipioOriginal = this.municipio.muni_Descripcion || '';
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

    if (this.municipio.muni_Descripcion.trim()) {
      if (this.municipio.muni_Descripcion.trim() !== this.municipioOriginal) {
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

    try {
    if (this.municipio.muni_Descripcion.trim()) {
      const municipioActualizar = {
        muni_Codigo: this.municipio.muni_Codigo,
        muni_Descripcion: this.municipio.muni_Descripcion.trim(),
        usua_Creacion: this.municipio.usua_Creacion,
        muni_FechaCreacion: this.municipio.muni_FechaCreacion,
        usua_Modificacion: getUserId(),
        depa_Codigo: this.municipio.depa_Codigo || '',
        muni_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.post<any>(`${environment.apiBaseUrl}/Municipios/Actualizar`, municipioActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {

          if(response.data.code_Status === 1) 
          {
            this.mensajeExito = `Municipio "${this.municipio.muni_Descripcion}" actualizado exitosamente`;
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;

            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit(this.municipio);
              this.cancelar();
            }, 3000);
          }
          else
          {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar el municipio, ', response.data.message_Status;
            setTimeout(() => this.cerrarAlerta(), 5000);
          }
          
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el municipio. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
    }
    catch (error) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error al actualizar el municipio. Por favor, intente nuevamente.';
      setTimeout(() => this.cerrarAlerta(), 5000);
    }
  }
}
