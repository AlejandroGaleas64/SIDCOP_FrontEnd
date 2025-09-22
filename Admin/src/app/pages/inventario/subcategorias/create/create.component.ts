
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Subcategoria } from 'src/app/Modelos/inventario/SubcategoriaModel';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})


export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Subcategoria>();
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  selectedCate: number = 0;
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

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.subcategoria = {
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

  guardar(): void {
    this.mostrarErrores = true;
    
    if (this.subcategoria.subc_Descripcion.trim() && this.selectedCate > 0) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      const sucategoriaGuardar = {
        subc_Id: 0,
        subc_Descripcion: this.subcategoria.subc_Descripcion.trim(),
        cate_Id: this.selectedCate,
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        subc_FechaCreacion: new Date(),
        usua_Modificacion: 0,
        numero: "", 
        subc_FechaModificacion: new Date(),
        usuarioCreacion: "", 
        usuarioModificacion: "" ,
        cate: ''
      
      };

      //console.log('Guardando subcategoria:', sucategoriaGuardar);
      
      this.http.post<any>(`${environment.apiBaseUrl}/Subcategoria/Insertar`, sucategoriaGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          //console.log('Subc guardada exitosamente:', response);
          this.mensajeExito = `Subcategoria "${this.subcategoria.subc_Descripcion}" guardada exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          
          // Ocultar la alerta después de 3 segundos
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.subcategoria);
            this.selectedCate = 0;
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al guardar Subcate:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar la subcategoria. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          
          // Ocultar la alerta de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
      // Mostrar alerta de warning para campos vacíos
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      
      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}
