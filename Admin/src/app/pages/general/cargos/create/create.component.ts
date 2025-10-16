import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Cargos } from 'src/app/Modelos/general/Cargos.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  // Eventos para comunicar acciones al padre (cerrar y recargar lista)
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Cargos>();
  // Estado UI para validación y alertas
  isFocused = false;
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Inyección de HttpClient para llamadas a API
  constructor(private http: HttpClient) {}

  // Modelo de formulario inicializado con valores por defecto
  cargo: Cargos = {
    carg_Id: 0,
    carg_Descripcion: '',
    usua_Creacion: 0,
    carg_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    carg_FechaModificacion: new Date(),
    carg_Estado: true,
    usuarioCreacion : '',
    usuarioModificacion : '',
    code_Status: 0,
    message_Status: '',
    secuencia : 0
  };

  // Limpia estado del formulario y emite cancelación al contenedor
  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.cargo = {
      carg_Id: 0,
      carg_Descripcion: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      carg_FechaCreacion: new Date(),
      carg_FechaModificacion: new Date(),
      carg_Estado : true,
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      secuencia: 0
    };
    this.onCancel.emit();
  }

  // Cierra cualquier alerta visible
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Valida campos requeridos, arma el payload y realiza la inserción vía API
guardar(): void {
  this.mostrarErrores = true;
  
  if (this.cargo.carg_Descripcion.trim()) {
    // Limpiar alertas previas antes de intentar guardar
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;

    // Payload de inserción (server-side establece Id y auditoría adicional)
    const cargoGuardar = {
      carg_Id: 0,
      carg_Descripcion: this.cargo.carg_Descripcion,
      usua_Creacion: getUserId(), // usuario autenticado
      carg_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: 0,
      carg_FechaModificacion : new Date().toISOString(),
      carg_Estado: true,
      usuarioCreacion : '',
      usuarioModificacion : ''
    };

    // Llamada a API para insertar el cargo con encabezados requeridos
    this.http.post<any>(`${environment.apiBaseUrl}/Cargo/Insertar`, cargoGuardar, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        // Interpretación de respuesta basada en code_Status del backend
        const status = response?.data?.code_Status;

        if (status === -1) {
          // Error controlado (por ejemplo: duplicados u otras reglas de negocio)
          this.mostrarAlertaError = true;
          this.mensajeError = response?.data?.message_Status || 'Error en la operación.';
          this.mostrarAlertaExito = false;

          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);

        } else {
          // Éxito: notifica, emite evento y restablece formulario
          this.mensajeExito = `Cargo "${this.cargo.carg_Descripcion}" guardado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.cargo);
            this.cancelar();
          }, 3000);
        }
      },
      error: (error) => {
        // Error no controlado en cliente/red/servidor
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al guardar el cargo. Por favor, intente nuevamente.';
        this.mostrarAlertaExito = false;
        
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  } else {
    // Validación: campo requerido vacío
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

