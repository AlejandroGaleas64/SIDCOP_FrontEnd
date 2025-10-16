import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Departamento } from 'src/app/Modelos/general/Departamentos.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';


@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgxMaskDirective],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
  providers: [provideNgxMask()],
})
export class EditComponent {
  @Input() departamentoData: Departamento | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Departamento>();

  // Devuelve la lista de cambios detectados para el modal de confirmación
  obtenerListaCambios() {
    const cambios = [];
    
    // Comparar descripción
    if (this.departamento.depa_Descripcion?.trim() !== this.departamentoOriginal?.trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.departamentoOriginal,
        nuevo: this.departamento.depa_Descripcion
      });
    }
    
    return cambios;
  }

 departamento: Departamento = {
    depa_Codigo: '',
    depa_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    depa_FechaCreacion: new Date(),
    depa_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  departamentoOriginal = '';
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
    if (changes['departamentoData'] && changes['departamentoData'].currentValue) {
      this.departamento = { ...changes['departamentoData'].currentValue };
      this.departamentoOriginal = this.departamento.depa_Descripcion || '';
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

    if (this.departamento.depa_Descripcion.trim()) {
      if (this.departamento.depa_Descripcion.trim() !== this.departamentoOriginal) {
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

    if (this.departamento.depa_Descripcion.trim()) {
      const departamentoActualizar = {
        depa_Codigo: this.departamento.depa_Codigo,
        depa_Descripcion: this.departamento.depa_Descripcion.trim(),
        usua_Creacion: this.departamento.usua_Creacion,
        depa_FechaCreacion: this.departamento.depa_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.departamento.secuencia || '',
        depa_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Departamentos/Editar`, departamentoActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {

          if(response.data.code_Status === 1) 
          {
            this.mensajeExito = `Departamento "${this.departamento.depa_Descripcion}" actualizado exitosamente`;
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;

            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit(this.departamento);
              this.cancelar();
            }, 3000);
          }
          else
          {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar el departamento, ', response.data.message_Status;
            setTimeout(() => this.cerrarAlerta(), 5000);
          }
          
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el departamento. Por favor, intente nuevamente.';
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
