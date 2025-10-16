import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { CAIs } from 'src/app/Modelos/ventas/CAIs.Model';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<CAIs>();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  cai: CAIs = {
    nCai_Id: 0,
    nCai_Codigo: '',
    nCai_Descripcion: '',
    usua_Creacion: getUserId(),
    nCai_FechaCreacion: new Date(),
    usuarioCreacion: '',
    usuarioModificacion: '',
    code_Status: 0,
    message_Status: ''
  };

  cancelar(): void {
    this.mostrarErrores = false;
    this.cai = {
      nCai_Id: 0,
      nCai_Codigo: '',
      nCai_Descripcion: '',
      usua_Creacion: getUserId(),
      nCai_FechaCreacion: new Date(),
      usuarioCreacion: '',
      usuarioModificacion: '',
      code_Status: 0,
      message_Status: ''
    };
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

  // Función para formatear el código CAI con la máscara
  formatCaiCode(event: any): void {
    let value = event.target.value;
    
    // Remover todos los caracteres que no sean letras o números
    value = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Limitar a 32 caracteres (5 grupos de 6 + 1 grupo de 2)
    if (value.length > 32) {
      value = value.substring(0, 32);
    }
    
    // Aplicar la máscara: XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      // Agregar guión después de cada grupo de 6 caracteres, excepto al final
      if (i > 0 && i % 6 === 0 && i < 30) {
        formatted += '-';
      }
      // Agregar guión antes del último grupo de 2 caracteres
      else if (i === 30 && value.length > 30) {
        formatted += '-';
      }
      formatted += value[i];
    }
    
    // Actualizar el valor del modelo
    this.cai.nCai_Codigo = formatted;
    
    // Actualizar el valor del input
    event.target.value = formatted;
  }

  // Función para manejar el pegado de texto
  onPasteCaiCode(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    
    // Simular el evento de input con el texto pegado
    const target = event.target as HTMLInputElement;
    target.value = pastedText;
    
    this.formatCaiCode({ target });
  }

  guardar(): void {
  this.mostrarErrores = true;

  if (this.cai.nCai_Codigo.trim() && this.cai.nCai_Descripcion.trim()) {
    const caiGuardar = {
      nCai_Id: 0,
      nCai_Codigo: this.cai.nCai_Codigo.trim(),
      nCai_Descripcion: this.cai.nCai_Descripcion.trim(),
      usua_Creacion: getUserId(),
      secuencia: 0,
      usuarioCreacion: "",
      usuarioModificacion: "",
      nCai_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: 0,
      nCai_FechaModificacion: new Date().toISOString(),
      nCai_Estado: true,
      estado: ""
    };

    this.http.post<any>(`${environment.apiBaseUrl}/CaiS/Crear`, caiGuardar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        if (response.success && response.data?.code_Status === 1) {
          this.mensajeExito = `CAI "${this.cai.nCai_Codigo}" - "${this.cai.nCai_Descripcion}" creado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.cai);
            this.cancelar();
          }, 3000);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response.data?.message_Status || 'Error al guardar el CAI.';
        }
      },
      error: (error) => {
        console.error('Error al guardar el CAI:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al guardar el CAI. Por favor, intente nuevamente.';

        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  } else {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';

    setTimeout(() => {
      this.mostrarAlertaWarning = false;
      this.mensajeWarning = '';
    }, 4000);
  }
}
}
