import { Component, EventEmitter, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, DropzoneModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  rutas: any[] = [];
  clientes: any[] = [];
  estadosVisita: any[] = [];
  visita: any = {
    veRu_Id: '',
    diCl_Id: '',
    esVi_Id: '',
    clVi_Observaciones: '',
    clVi_Fecha: ''
  };

  mostrarErrores = false;
  mensajeExito = '';
  mensajeWarning = '';
  mensajeError = '';
  direcciones: any;
  Clientes: any;
  mostrarAlertaError = false;

  constructor(private http: HttpClient) {
    this.cargarCombos();
  }

  cargarCombos() {
    // Cargar rutas
    this.http.get<any[]>(`${environment.apiBaseUrl}/Rutas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.rutas = data);
    // Cargar clientes
    this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.clientes = data;
    });
    // Cargar estados de visita
    this.http.get<any[]>(`${environment.apiBaseUrl}/EstadosVisita/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.estadosVisita = data);
  }

  public dropzoneConfig: DropzoneConfigInterface = {
    url: 'https://httpbin.org/post', // No subir a ningún endpoint automáticamente
    clickable: true,
    addRemoveLinks: true,
    previewsContainer: false,
    paramName: 'file',
    maxFilesize: 50,
    acceptedFiles: 'image/*',
  };

  uploadedFiles: any[] = [];

  // File Upload
  imageURL: any;

  onFileSelected(event: any) {
    const file = Array.isArray(event) ? event[0] : event;
    if (!file) return;

    // Previsualización local inmediata
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedFiles = [{ ...file, dataURL: e.target.result, name: file.name, file: file }];
    };
    reader.readAsDataURL(file);
  }

  onImagenSeleccionada(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.visita.hCVi_Foto = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeFile(event: any) {
    this.uploadedFiles.splice(this.uploadedFiles.indexOf(event), 1);
  }
  cerrarAlerta() {
    this.mensajeExito = '';
    this.mensajeWarning = '';
    this.mensajeError = '';
  }

  cancelar() {
    this.onCancel.emit();
  }

  guardar() {
    this.mostrarErrores = true;
    if (!this.visita.VeRu_Id || !this.visita.DiCl_Id || !this.visita.EsVi_Id || !this.visita.ClVi_Fecha) {
      this.mensajeError = 'Por favor complete todos los campos obligatorios.';
      return;
    }
    // Agrega los campos de usuario y fecha de creación si es necesario
    this.visita.Usua_Creacion = 1; // Cambia por el usuario real
    this.visita.ClVi_FechaCreacion = new Date().toISOString();

    this.http.post<any>(`${environment.apiBaseUrl}/ClientesVisitaHistorial/Insertar`, this.visita, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (resp) => {
        if (resp.code_Status === 1) {
          this.mensajeExito = resp.message_Status;
          this.onSave.emit(this.visita);
        } else {
          this.mensajeError = resp.message_Status || 'Error al registrar la visita.';
        }
      },
      error: (err) => {
        this.mensajeError = 'Error de conexión o datos inválidos.';
      }
    });
  }

  // ========== MÉTODOS DE CLIENTES (SIN CAMBIOS) ==========

  searchCliente = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.clie_Codigo?.toLowerCase().includes(term) ||
      item.clie_Nombres?.toLowerCase().includes(term) ||
      item.clie_Apellidos?.toLowerCase().includes(term) ||
      item.clie_NombreNegocio?.toLowerCase().includes(term)
    );
  };

  cargarClientes() {
    this.http
      .get<any>(`${environment.apiBaseUrl}/Cliente/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (data) => {
          this.Clientes = data;
          console.log('Clientes cargados:', this.Clientes);
        },
        error: (error) => {
          console.error('Error al cargar clientes:', error);
          this.mostrarAlertaError = true;
          this.mensajeError =
            'Error al cargar clientes. Por favor, intente nuevamente.';
        },
      });
  }

  cargarDirecciones(clienteId: number) {
    this.http
      .get<any>(
        `${environment.apiBaseUrl}/DireccionesPorCliente/Buscar/${clienteId}`,
        {
          headers: { 'x-api-key': environment.apiKey },
        }
      )
      .subscribe((data) => (this.direcciones = data));
  }

  onClienteSeleccionado(clienteId: number) {
    this.cargarDirecciones(clienteId);
    this.visita.diCl_Id = 0; // Reiniciar dirección seleccionada
  }
}
