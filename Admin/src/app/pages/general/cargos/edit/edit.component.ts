import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Cargos } from 'src/app/Modelos/general/Cargos.Model';
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
  // Recibe el modelo a editar desde el contenedor
  @Input() cargoData: Cargos | null = null;
  // Eventos hacia el contenedor para cerrar/actualizar lista
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Cargos>();

  // Estado editable del formulario
 cargo: Cargos = {
    carg_Id: 0,
    carg_Descripcion: '',
    usua_Creacion: 0,
    carg_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    carg_FechaModificacion: new Date(),
    usuarioModificacion : '',
    usuarioCreacion : '', 
    carg_Estado: true,
    code_Status: 0,
    message_Status: '',
    secuencia : 0
  };

  // Para detectar cambios vs. original y validar edición
  cargoOriginal = '';
  // Flags de UI (validación y alertas)
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  // Controla la visualización del modal de confirmación
  mostrarConfirmacionEditar = false;

  // HttpClient inyectado para llamadas a API
  constructor(private http: HttpClient) {}

  // Sincroniza el input con el estado interno cuando cambia la selección
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cargoData'] && changes['cargoData'].currentValue) {
      this.cargo = { ...changes['cargoData'].currentValue };
      this.cargoOriginal = this.cargo.carg_Descripcion || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
    }
  }

  // Emite cancelación sin guardar cambios
  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  // Resetea cualquier alerta visible
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Valida campos requeridos y si hay cambios para mostrar confirmación
  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.cargo.carg_Descripcion.trim()) {
      if (this.cargo.carg_Descripcion.trim() !== this.cargoOriginal) {
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

  // Cierra modal de confirmación
  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  // Confirma y procede a guardar cambios
  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  // Construye payload y envía actualización a API
  private guardar(): void {
    this.mostrarErrores = true;

    if (this.cargo.carg_Descripcion.trim()) {
      const cargoActualizar = {
        carg_Id: this.cargo.carg_Id,
        carg_Descripcion: this.cargo.carg_Descripcion.trim(),
        usua_Creacion: this.cargo.usua_Creacion,
        carg_FechaCreacion: this.cargo.carg_FechaCreacion,
        usua_Modificacion: getUserId(),
        // numero: this.cargo..secuencia || '',
        carg_FechaModificacion: new Date().toISOString(),
        carg_Estado: true,
        usuarioCreacion : '',
        usuarioModificacion : ''
        // usuarioModificacion: ''
      };

      // Llamada a API para actualizar registro existente
      this.http.put<any>(`${environment.apiBaseUrl}/Cargo/Actualizar`, cargoActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          // Éxito: notifica, emite evento y cierra
          this.mensajeExito = `Cargo "${this.cargo.carg_Descripcion}" actualizado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.cargo);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          // console.error('Error al actualizar cargo:', error);
          // Error no controlado (cliente/red/servidor)
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el cargo. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      // Validación: campo requerido vacío
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}

