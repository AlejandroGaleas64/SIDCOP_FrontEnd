import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit-recarga',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditRecargaComponent implements OnChanges {
  @Input() recargaData: any | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  recarga: any = {
    reca_Id: 0,
    reca_Confirmacion: '',
    reca_Observaciones: '',
    usua_Modificacion: 0
  };

  recargaOriginal: any = {};
  cambiosDetectados: any = {};

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mostrarAlertaError = false;
  mostrarAlertaWarning = false;
  mostrarConfirmacionEditar = false;

  mensajeExito = '';
  mensajeError = '';
  mensajeWarning = '';


  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recargaData']?.currentValue) {
      this.recarga = { 
        ...changes['recargaData'].currentValue,
        reca_Confirmacion: '', // Siempre iniciar con "Seleccione una opción"
        reca_Observaciones: changes['recargaData'].currentValue.reca_Observaciones || ''
      };
      this.recargaOriginal = { ...this.recarga };
      this.resetAlerts();
    }
  }

  private resetAlerts(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
    this.mostrarConfirmacionEditar = false;
  }

  validarConfirmacion(): void {
    this.resetAlerts();
    this.mostrarErrores = true;

    if (!this.validarCampos()) {
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    if (this.hayDiferencias()) {
      this.mostrarConfirmacionEditar = true;
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'No se han detectado cambios.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

 
private validarCampos(): boolean {
    const errores: string[] = [];
    const confirmacion = this.recarga.reca_Confirmacion?.toUpperCase();

    // Validación de confirmación
    if (!confirmacion || !['P', 'A', 'R'].includes(confirmacion)) {
      errores.push('Estado de confirmación debe ser P (Pendiente), A (Aprobada) o R (Rechazada)');
    }

    // Validación de observaciones para rechazo
    if (confirmacion === 'R' && (!this.recarga.reca_Observaciones || this.recarga.reca_Observaciones.trim() === '')) {
      errores.push('Observaciones son requeridas para rechazo');
    }

    // Validación de longitud de observaciones
    if (this.recarga.reca_Observaciones && this.recarga.reca_Observaciones.length > 200) {
      errores.push('Las observaciones no pueden exceder 200 caracteres');
    }

    if (errores.length > 0) {
      this.mensajeWarning = `Corrija los siguientes campos: ${errores.join(', ')}`;
      this.mostrarAlertaWarning = true;
      return false;
    }

    return true;
  }

  private hayDiferencias(): boolean {
    if (!this.recarga || !this.recargaOriginal) return false;

    this.cambiosDetectados = {};

    // Verificar cambio en confirmación
    if (this.recarga.reca_Confirmacion !== this.recargaOriginal.reca_Confirmacion) {
      const getEstadoLabel = (estado: string) => {
        switch (estado?.toUpperCase()) {
          case 'A': return 'Aprobado/Confirmada';
          case 'R': return 'Rechazado/Rechazada';
          case 'P': return 'Pendiente';
          default: return 'Sin estado';
        }
      };

      this.cambiosDetectados.confirmacion = {
        anterior: getEstadoLabel(this.recargaOriginal.reca_Confirmacion),
        nuevo: getEstadoLabel(this.recarga.reca_Confirmacion),
        label: 'Estado de Confirmación'
      };
    }

    // Verificar cambio en observaciones
    if (this.recarga.reca_Observaciones !== this.recargaOriginal.reca_Observaciones) {
      this.cambiosDetectados.observaciones = {
        anterior: this.recargaOriginal.reca_Observaciones || 'Sin observaciones',
        nuevo: this.recarga.reca_Observaciones || 'Sin observaciones',
        label: 'Observaciones'
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

 private guardar(): void {
    if (!this.validarCampos()) return;

    const userId = getUserId();
    if (!userId || isNaN(userId)) {
        this.mostrarError('Usuario no válido');
        return;
    }

    // Asegurar que todos los campos requeridos estén presentes
    const body = {
        Reca_Id: Number(this.recarga.reca_Id),
        Reca_Confirmacion: String(this.recarga.reca_Confirmacion).substring(0, 1).toUpperCase(),
        Reca_Observaciones: String(this.recarga.reca_Observaciones || '').substring(0, 200),
        Usua_Modificacion: Number(userId),
        Usua_Confirmacion : Number(userId),
        Recarga : "",
        detalles :  [], 
        Reca_FechaModificacion: new Date().toISOString()
    };

    console.log('Datos a enviar:', JSON.stringify(body, null, 2));

    this.http.put<any>(`${environment.apiBaseUrl}/Recargas/Confirmar`, body, {
        headers: {
            'X-Api-Key': environment.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    }).subscribe({
        next: (response) => {
            console.log('Respuesta del servidor:', response);
            if (response?.data?.code_Status === 1) {
                this.mostrarExito(response.data.message_Status);
                setTimeout(() => this.onSave.emit(this.recarga), 3000);
            } else {
                const errorMsg = response?.message || 
                                response?.data?.message_Status || 
                                'Error al procesar la recarga';
                this.mostrarError(errorMsg);
            }
        },
        error: (error) => {
            console.error('Error completo:', error);
            let errorMsg = 'Error desconocido';
            
            if (error.error) {
                // Intentar obtener el mensaje de error del backend
                if (typeof error.error === 'string') {
                    try {
                        const parsedError = JSON.parse(error.error);
                        errorMsg = parsedError.message || parsedError.title || error.error;
                    } catch {
                        errorMsg = error.error;
                    }
                } else if (typeof error.error === 'object') {
                    errorMsg = error.error.message || 
                              error.error.title || 
                              JSON.stringify(error.error);
                }
            } else {
                errorMsg = error.message || 'Error en la conexión';
            }
            
            this.mostrarError(`Error ${error.status || 'desconocido'}: ${errorMsg}`);
        }
    });
}

  private mostrarExito(mensaje: string): void {
    this.mostrarAlertaExito = true;
    this.mensajeExito = mensaje || 'Operación exitosa';
    this.mostrarErrores = false;
  }

  private mostrarError(mensaje: string): void {
    this.mostrarAlertaError = true;
    this.mensajeError = mensaje || 'Error desconocido';
    setTimeout(() => this.cerrarAlerta(), 10000);
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'P': 
      case 'PENDIENTE': return 'bg-warning text-dark';
      case 'A': 
      case 'APROBADA':
      case 'CONFIRMADA': return 'bg-success';
      case 'R': 
      case 'RECHAZADA': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  onObservacionesChange(): void {
    // Cambiar límite de 500 a 200 caracteres según el SP
    if (this.recarga.reca_Observaciones && this.recarga.reca_Observaciones.length > 200) {
      this.recarga.reca_Observaciones = this.recarga.reca_Observaciones.substring(0, 200);
    }
  }

  onEstadoConfirmacionChange(): void {
    if (this.recarga.reca_Confirmacion === 'R') {
      setTimeout(() => {
        const textarea = document.querySelector('textarea[ng-reflect-model]') as HTMLTextAreaElement;
        if (textarea) textarea.focus();
      }, 100);
    }
  }

  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeWarning = '';
  }
}