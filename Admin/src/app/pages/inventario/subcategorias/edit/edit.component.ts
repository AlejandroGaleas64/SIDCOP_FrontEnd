import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Subcategoria } from 'src/app/Modelos/inventario/SubcategoriaModel';


@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})

export class EditComponent implements OnChanges {
  @Input() subcategoriaData: Subcategoria | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Subcategoria>();

 subcategoria: Subcategoria = {
    subc_Id: 0,
      subc_Descripcion: '',
      cate_Id: 0,
      usua_Creacion: 0,
      usua_Modificacion: 0,
      subc_Estado: true,
      subc_FechaCreacion: new Date(),
      subc_FechaModificacion: new Date(),
      cate_Descripcion: '',

      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: ''
  };

  subcategoriaOriginal = '';
  categoriaOriginal = 0;

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  // Objeto para rastrear cambios
  cambiosDetectados: any = {};

  Categorias: any[] = [];

  constructor(private http: HttpClient) {

    this.cargarCategorias();
  }

  

  cargarCategorias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Categorias/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.Categorias = data,
      error: (error) => console.error('Error cargando categorias:', error)
    });
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subcategoriaData'] && changes['subcategoriaData'].currentValue) {
      this.subcategoria = { ...changes['subcategoriaData'].currentValue };
      this.subcategoriaOriginal = this.subcategoria.subc_Descripcion || '';
      this.categoriaOriginal = this.subcategoria.cate_Id || 0;
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

    if (this.subcategoria.subc_Descripcion.trim()) {
      if (this.hayDiferencias()) {
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

  private hayDiferencias(): boolean {
    if (!this.subcategoria || !this.subcategoriaOriginal) return false;

    this.cambiosDetectados = {};

    // Verificar cambio en la descripción de la subcategoría
    if (this.subcategoria.subc_Descripcion.trim() !== this.subcategoriaOriginal) {
      this.cambiosDetectados.descripcion = {
        anterior: this.subcategoriaOriginal || 'Sin descripción',
        nuevo: this.subcategoria.subc_Descripcion.trim(),
        label: 'Descripción de la Subcategoría'
      };
    }

    // Verificar cambio en la categoría
    if (this.subcategoria.cate_Id !== this.categoriaOriginal) {
      this.cambiosDetectados.categoria = {
        anterior: this.getCategoriaNombre(this.categoriaOriginal) || 'Sin categoría',
        nuevo: this.getCategoriaNombre(this.subcategoria.cate_Id) || 'Sin categoría',
        label: 'Categoría'
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  // Método para obtener la lista de cambios en formato para mostrar en el modal
  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  private guardar(): void {
    this.mostrarErrores = true;

    if (this.subcategoria.subc_Descripcion.trim() && this.subcategoria.cate_Id) {
      const subcategoriaActualizar = {
        subc_Id: this.subcategoria.subc_Id,
        subc_Descripcion: this.subcategoria.subc_Descripcion.trim(),
        cate_Id: this.subcategoria.cate_Id,
        cate: '',
        usua_Creacion: this.subcategoria.usua_Creacion,
        subc_FechaCreacion: this.subcategoria.subc_FechaCreacion,
        usua_Modificacion: getUserId(),
        subc_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Subcategoria/Actualizar`, subcategoriaActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Subcategoria "${this.subcategoria.subc_Descripcion}" actualizada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.subcategoria);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al actualizar subcategoria:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la subcategoria. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }


getCategoriaNombre(cateId: number): string {
  if (!cateId) return 'Sin especificar';
  if (!this.Categorias || this.Categorias.length === 0) {
    return `Categoría ${cateId}`;
  }
  const categoria = this.Categorias.find(c => c.cate_Id === cateId);
  return categoria ? categoria.cate_Descripcion : `Categoría ${cateId} (no encontrada)`;
}


}
