import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MarcasVehiculos } from 'src/app/Modelos/general/MarcasVehiculos.model';
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
    if (this.marcasVehiculos.maVe_Marca?.trim() !== this.marcasVehiculosOriginal?.trim()) {
      cambios.push({
        label: 'Marca',
        anterior: this.marcasVehiculosOriginal,
        nuevo: this.marcasVehiculos.maVe_Marca
      });
    }
    return cambios;
  }

  @Input() marcasVehiculosData: MarcasVehiculos | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<MarcasVehiculos>();

 marcasVehiculos: MarcasVehiculos = {
    maVe_Id: 0,
    maVe_Marca: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    maVe_Estado: true,
    maVe_FechaCreacion: new Date(),
    maVe_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
  };

  marcasVehiculosOriginal = '';
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
    if (changes['marcasVehiculosData'] && changes['marcasVehiculosData'].currentValue) {
      this.marcasVehiculos = { ...changes['marcasVehiculosData'].currentValue };
      this.marcasVehiculosOriginal = this.marcasVehiculos.maVe_Marca || '';
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

    if (this.marcasVehiculos.maVe_Marca.trim()) {
      if (this.marcasVehiculos.maVe_Marca.trim() !== this.marcasVehiculosOriginal) {
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

    if (this.marcasVehiculos.maVe_Marca.trim()) {
      const marcasVehiculosActualizar = {
        maVe_Id: this.marcasVehiculos.maVe_Id,
        maVe_Marca: this.marcasVehiculos.maVe_Marca.trim(),
        usua_Creacion: this.marcasVehiculos.usua_Creacion,
        maVe_FechaCreacion: this.marcasVehiculos.maVe_FechaCreacion,
        usua_Modificacion: getUserId(),
        maVe_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/MarcasVehiculos/Editar`, marcasVehiculosActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Marca "${this.marcasVehiculos.maVe_Marca}" actualizada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.marcasVehiculos);
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
