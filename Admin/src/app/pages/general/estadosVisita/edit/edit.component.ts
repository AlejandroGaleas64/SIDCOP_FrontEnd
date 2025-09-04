import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { EstadoVisita } from 'src/app/Modelos/general/EstadoVisita.Model';
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
  @Input() estadoVisitaData: EstadoVisita | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<EstadoVisita>();

 estadoVisita: EstadoVisita = {
    esVi_Id: 0,
    esVi_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    esVi_FechaCreacion: new Date(),
    esVi_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
  };

  // estadoVisitaOriginal = '';
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
    if (changes['estadoVisitaData'] && changes['estadoVisitaData'].currentValue) {
      this.estadoVisita = { ...changes['estadoVisitaData'].currentValue };
      this.estadoVisitaOriginal = { ...changes['estadoVisitaData'].currentValue };
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

    if (this.estadoVisita.esVi_Descripcion.trim()) {
      if (this.estadoVisita.esVi_Descripcion.trim() !== this.estadoVisitaOriginal) {
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

    if (this.estadoVisita.esVi_Descripcion.trim()) {
      const estadoVisitaActualizar = {
        esVi_Id: this.estadoVisita.esVi_Id,
        esVi_Descripcion: this.estadoVisita.esVi_Descripcion.trim(),
        usua_Creacion: this.estadoVisita.usua_Creacion,
        esVi_FechaCreacion: this.estadoVisita.esVi_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.estadoVisita.esVi_Id  || '',
        esVi_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/EstadoVisita/Actualizar`, estadoVisitaActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Estado de Visita "${this.estadoVisita.esVi_Descripcion}" actualizada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.estadoVisita);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al actualizar estadoVisita:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la estadoVisita. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  estadoVisitaOriginal: any = {};
  cambiosDetectados: any = {};
    obtenerListaCambios(): { label: string; anterior: string; nuevo: string }[] {
    const cambios: { label: string; anterior: string; nuevo: string }[] = [];

    const val = (v: any) => v == null || v === '' ? '—' : String(v);
    const trim = (s: any) => (s ?? '').toString().trim();
    const nuevo = this.estadoVisita as any;
    const original = this.estadoVisitaOriginal as any;
    this.cambiosDetectados = {};

    const camposBasicos = [
      { key: 'esVi_Descripcion', label: 'Estado de Visita' },
    ];

    camposBasicos.forEach(campo => {
      const valorOriginal = original[campo.key];
      const valorNuevo = nuevo[campo.key];
      const sonDiferentes = trim(valorOriginal) !== trim(valorNuevo);

      console.log(`Campo: ${campo.key}`, {
        original: valorOriginal,
        nuevo: valorNuevo,
        sonDiferentes
      });

      if (sonDiferentes) {
        const item = {
          anterior: val(valorOriginal),
          nuevo: val(valorNuevo),
          label: campo.label
        };
        this.cambiosDetectados[campo.key] = item as any;
        cambios.push(item);
      }
    });

    // Verificar cada campo y almacenar los cambios
    if (nuevo.esVi_Descripcion !== original.esVi_Descripcion) {
      this.cambiosDetectados.descripcion = {
        anterior: original.esVi_Descripcion,
        nuevo: nuevo.esVi_Descripcion,
        label: 'Descripción del Estado de Visita'
      };
    }

    return cambios;
  }
}
