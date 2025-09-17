import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { UnidadDePeso } from 'src/app/Modelos/general/UnidadDePeso.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnChanges {
  // Devuelve la lista de cambios detectados para el modal de confirmación
  obtenerListaCambios() {
    const cambios = [];
    if (this.UnidadDePeso.unPe_Descripcion?.trim() !== this.UnidadDePesoOriginal?.trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.UnidadDePesoOriginal,
        nuevo: this.UnidadDePeso.unPe_Descripcion
      });
    }
    if (this.UnidadDePeso.unPe_Abreviatura?.trim() !== this.UnidadDePesoAbreviaturaOriginal?.trim()) {
      cambios.push({
        label: 'Abreviatura',
        anterior: this.UnidadDePesoAbreviaturaOriginal,
        nuevo: this.UnidadDePeso.unPe_Abreviatura
      });
    }
    return cambios;
  }
  
  @Input() UnidadDePesoData: UnidadDePeso | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<UnidadDePeso>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  UnidadDePeso: UnidadDePeso = {
    unPe_Id: 0,
    unPe_Descripcion: '',
     unPe_Abreviatura: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    unPe_FechaCreacion: new Date(),
    unPe_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  UnidadDePesoOriginal = '';
  UnidadDePesoAbreviaturaOriginal = '';
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
    if (changes['UnidadDePesoData'] && changes['UnidadDePesoData'].currentValue) {
      this.UnidadDePeso = { ...changes['UnidadDePesoData'].currentValue };
      this.UnidadDePesoOriginal = this.UnidadDePeso.unPe_Descripcion || '';
      this.UnidadDePesoAbreviaturaOriginal = this.UnidadDePeso.unPe_Abreviatura || '';
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

    // Validar que la abreviatura tenga exactamente 2 letras y solo contenga letras
    const abreviaturaValida = /^[A-Za-z]{2}$/.test(this.UnidadDePeso.unPe_Abreviatura);
    
    if (!abreviaturaValida) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La abreviatura debe contener exactamente 2 letras (sin números ni caracteres especiales)';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    if (this.UnidadDePeso.unPe_Descripcion.trim()) {
      // Verificar si hay cambios en descripción o abreviatura
      const hayDescripcionCambiada = this.UnidadDePeso.unPe_Descripcion.trim() !== this.UnidadDePesoOriginal;
      const hayAbreviaturaCambiada = this.UnidadDePeso.unPe_Abreviatura.trim() !== this.UnidadDePesoAbreviaturaOriginal;
      
      if (hayDescripcionCambiada || hayAbreviaturaCambiada) {
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

   guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
    this.cerrarAlerta();
    
    // Validar que la abreviatura tenga exactamente 2 letras y solo contenga letras
    const abreviaturaValida = /^[A-Za-z]{2}$/.test(this.UnidadDePeso.unPe_Abreviatura);
    
    if (!abreviaturaValida) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La abreviatura debe contener exactamente 2 letras (sin números ni caracteres especiales)';
      this.onOverlayChange.emit(false);
      return;
    }

    if (!this.UnidadDePeso.unPe_Descripcion?.trim()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete el campo de descripción';
      this.onOverlayChange.emit(false);
      return;
    }

    const userId = getUserId();
    
    if (!userId || userId === 0) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error: No se pudo obtener el ID del usuario';
      this.onOverlayChange.emit(false);
      return;
    }

    const payload = {
      unPe_Id: this.UnidadDePeso.unPe_Id,
      UnPe_Descripcion: this.UnidadDePeso.unPe_Descripcion.trim(),
      UnPe_Abreviatura: this.UnidadDePeso.unPe_Abreviatura.trim(),
      Usua_Modificacion: userId,
      UnPe_FechaModificacion: new Date().toISOString()
    };


    this.http.put<any>(`${environment.apiBaseUrl}/UnidadDePeso/Actualizar`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': environment.apiKey
      },
      observe: 'response'
    }).subscribe({
      next: (response) => {
        this.mensajeExito = `Unidad de peso "${this.UnidadDePeso.unPe_Descripcion}" actualizada exitosamente`;
        this.mostrarAlertaExito = true;
        this.mostrarErrores = false;
        this.onOverlayChange.emit(false);

        setTimeout(() => {
          this.mostrarAlertaExito = false;
          this.onSave.emit(this.UnidadDePeso);
          this.cancelar();
        }, 3000);
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar la unidad de peso. Por favor, intente nuevamente.';
        this.onOverlayChange.emit(false);
        setTimeout(() => this.cerrarAlerta(), 5000);
      },
      complete: () => {
        this.mostrarConfirmacionEditar = false;
      }
    });
  }

  onAbreviaturaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Remove any non-letter characters and limit to 2 characters
    let value = input.value.replace(/[^a-zA-Z]/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2);
    }
    // Update the model
    this.UnidadDePeso.unPe_Abreviatura = value;
    // Update the input value
    input.value = value;
  }
}