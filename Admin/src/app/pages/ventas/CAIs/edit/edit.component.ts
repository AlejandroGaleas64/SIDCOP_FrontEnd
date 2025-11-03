import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CAIs } from 'src/app/Modelos/ventas/CAIs.Model';
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
  @Input() caiData: CAIs | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<CAIs>();

  cai: CAIs = {
    nCai_Id: 0,
    nCai_Codigo: '',
    nCai_Descripcion: '',
    usua_Creacion: 0,
    nCai_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    nCai_FechaModificacion: new Date(),
    usuarioCreacion: '',
    usuarioModificacion: '',
    code_Status: 0,
    message_Status: ''
  };

  caiOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  constructor(private http: HttpClient) {}

  /**
   * Detecta cambios en las propiedades de entrada del componente
   * @param changes - Objeto con los cambios detectados
   * - Actualiza el CAI local cuando se reciben nuevos datos
   * - Guarda la descripción original para comparaciones
   * - Reinicia el estado de errores y alertas
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['caiData'] && changes['caiData'].currentValue) {
      this.cai = { ...changes['caiData'].currentValue };
      this.caiOriginal = this.cai.nCai_Descripcion || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
    }
  }

  /**
   * Cancela la edición del CAI
   * - Cierra todas las alertas activas
   * - Emite evento para cerrar el formulario de edición
   */
  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  /**
   * Cierra todas las alertas de notificación
   * - Oculta alertas de éxito, error y advertencia
   * - Limpia todos los mensajes de alerta
   */
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  /**
   * Valida los datos antes de proceder con la edición
   * - Verifica que los campos requeridos estén completos
   * - Compara los datos actuales con los originales
   * - Muestra confirmación si hay cambios válidos
   * - Muestra advertencias si no hay cambios o faltan datos
   */
  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.cai.nCai_Codigo.trim() && this.cai.nCai_Descripcion.trim()) {
      if (
        this.cai.nCai_Codigo.trim() !== this.caiData?.nCai_Codigo?.trim() ||
        this.cai.nCai_Descripcion.trim() !== this.caiData?.nCai_Descripcion?.trim()
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

  /**
   * Cancela la confirmación de edición
   * - Oculta el modal de confirmación
   */
  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  /**
   * Confirma y procede con la edición
   * - Oculta el modal de confirmación
   * - Ejecuta el proceso de guardado
   */
  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  /**
   * Guarda los cambios del CAI en la base de datos
   * - Valida que los campos requeridos estén completos
   * - Prepara el objeto con los datos actualizados
   * - Envía petición HTTP PUT al backend
   * - Maneja respuestas de éxito y error
   * - Emite evento de guardado exitoso
   */
  private guardar(): void {
    this.mostrarErrores = true;

    if (this.cai.nCai_Codigo.trim() && this.cai.nCai_Descripcion.trim()) {
      const caiActualizar = {
        nCai_Id: this.cai.nCai_Id,
        nCai_Codigo: this.cai.nCai_Codigo.trim(),
        nCai_Descripcion: this.cai.nCai_Descripcion.trim(),
        usua_Creacion: this.cai.usua_Creacion,
        nCai_FechaCreacion: this.cai.nCai_FechaCreacion,
        usua_Modificacion: getUserId(),
        nCai_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/CaiS/Editar`, caiActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `CAI "${this.cai.nCai_Descripcion}" actualizado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.cai);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al actualizar CAI:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el CAI. Por favor, intente nuevamente.';
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
