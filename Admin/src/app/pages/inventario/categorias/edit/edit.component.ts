
import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { EstadoCivil } from 'src/app/Modelos/general/EstadoCivil.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Categoria } from 'src/app/Modelos/inventario/CategoriaModel';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})


export class EditComponent implements OnChanges {
  @Input() categoriaData: Categoria | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Categoria>();

 categoria: Categoria = {
      
      cate_Id: 0,
      cate_Descripcion: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      cate_FechaCreacion: new Date(),
      cate_FechaModificacion: new Date(),
      cate_Estado: false,
      subc_Id: 0,
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      No: 0

  };

  estadoCivilOriginal = '';
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
    if (changes['categoriaData'] && changes['categoriaData'].currentValue) {
      this.categoria = { ...changes['categoriaData'].currentValue };
      this.estadoCivilOriginal = this.categoria.cate_Descripcion || '';
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

    if (this.categoria.cate_Descripcion.trim()) {
      if (this.categoria.cate_Descripcion.trim() !== this.estadoCivilOriginal) {
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

    if (this.categoria.cate_Descripcion.trim()) {
      const estadoCivilActualizar = {
        cate_Id: this.categoria.cate_Id,
        cate_Descripcion: this.categoria.cate_Descripcion.trim(),
        usua_Creacion: this.categoria.usua_Creacion,
        cate_FechaCreacion: this.categoria.cate_FechaCreacion,
        usua_Modificacion: getUserId(),
                
        cate_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Categorias/Actualizar`, estadoCivilActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Categoria "${this.categoria.cate_Descripcion}" actualizado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.categoria);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al actualizar estado civil:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el estado civil. Por favor, intente nuevamente.';
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
