import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Municipio } from 'src/app/Modelos/general/Municipios.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgxMaskDirective],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
  providers: [provideNgxMask()],
})
export class CreateComponent {
  // Eventos para notificar acciones al componente padre
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Municipio>();

  // Estados de UI para validaciones y mensajes
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  Departamentos: any[] = []; 

  constructor(private http: HttpClient) {
    // Cargar catálogo de departamentos para el formulario de creación
    this.cargarDepartamentos();
  }

  // Modelo local para el municipio que se creará
  municipio: Municipio = {
    muni_Codigo: '',
    muni_Descripcion: '',
    depa_Codigo: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    muni_FechaCreacion: new Date(),
    muni_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  // Solicita la lista de departamentos desde el backend
  cargarDepartamentos() {
    this.http.get<any>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => this.Departamentos = data);
  };

  // Cancela la creación y resetea el formulario
  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.municipio = {
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
    this.onCancel.emit();
  }

  // Reset de las alertas
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Valida y envía la petición de creación al backend
  guardar(): void {
    this.mostrarErrores = true;

    if (this.municipio.muni_Descripcion.trim() && this.municipio.muni_Codigo.trim()) {
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;

      const municipioGuardar = {
        muni_Codigo: this.municipio.muni_Codigo.trim(),
        muni_Descripcion: this.municipio.muni_Descripcion.trim(),
        depa_Codigo: this.municipio.depa_Codigo.trim(),
        usua_Creacion: getUserId(),
        muni_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        numero: "", 
        muni_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      this.http.post<any>(`${environment.apiBaseUrl}/Municipios/Insertar`, municipioGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if (response?.data?.code_Status === 1) {
            // Creación exitosa
            this.mensajeExito = `Municipio "${this.municipio.muni_Descripcion}" guardado exitosamente`;
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;

            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit(this.municipio);
              this.cancelar();
            }, 3000);
          } else {
            // Respuesta de error desde la API
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar el municipio, ' + (response?.data?.message_Status || '');
            this.mostrarAlertaExito = false;

            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }

        },
        error: () => {
          // Error de red/servidor
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el municipio. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;

          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
      // Campos requeridos incompletos
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
