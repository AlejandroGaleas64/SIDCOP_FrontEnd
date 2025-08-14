import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, DropzoneModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent implements OnInit {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  vendedores: any[] = [];
  clientes: any[] = [];
  clientesFiltrados: any[] = [];
  estadosVisita: any[] = [];
  direcciones: any[] = [];

  visita: any = {
    vendedor: null,
    cliente: null,
    direccion: null,
    esVi_Id: '',
    clVi_Observaciones: '',
    clVi_Fecha: new Date().toISOString().split('T')[0]
  };

  cargando = false;
  mostrarErrores = false;
  mensajeExito = '';
  mensajeWarning = '';
  mensajeError = '';
  maxDate = new Date().toISOString().split('T')[0];

  uploadedFiles: any[] = [];
  maxImages = 5;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.cargarVendedores();
    this.cargarEstadosVisita();
  }

  cargarVendedores() {
    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/ListarPorRutas`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => { this.vendedores = data; this.cargando = false; },
      error: () => { this.mostrarMensaje('Error al cargar la lista de vendedores', 'error'); this.cargando = false; }
    });
  }

  cargarEstadosVisita() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/EstadoVisita/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.estadosVisita = data,
      error: () => this.mostrarMensaje('Error al cargar los estados de visita', 'error')
    });
  }

  onVendedorSeleccionado(vendedor: any) {
    if (!vendedor) { this.clientesFiltrados = []; this.visita.cliente = null; this.visita.direccion = null; return; }
    this.cargarClientesPorRuta(vendedor.ruta_Id);
  }

  cargarClientesPorRuta(rutaId: number) {
    if (!rutaId) { this.clientesFiltrados = []; this.visita.cliente = null; return; }
    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/BuscarPorRuta/${rutaId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.clientesFiltrados = data || [];
        this.cargando = false;
        if (this.clientesFiltrados.length === 1) { this.visita.cliente = this.clientesFiltrados[0]; this.onClienteSeleccionado(this.visita.cliente); }
        else { this.visita.cliente = null; this.visita.direccion = null; this.direcciones = []; }
      },
      error: () => { this.mostrarMensaje('Error al cargar la lista de clientes', 'error'); this.cargando = false; this.clientesFiltrados = []; }
    });
  }

  onClienteSeleccionado(cliente: any) {
    if (!cliente) { this.direcciones = []; this.visita.direccion = null; return; }
    this.cargarDireccionesCliente(cliente.clie_Id);
  }

  cargarDireccionesCliente(clienteId: number) {
    if (!clienteId) { this.direcciones = []; this.visita.direccion = null; return; }
    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/DireccionesPorCliente/Buscar/${clienteId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => { this.direcciones = data || []; this.cargando = false; if (this.direcciones.length === 1) this.visita.direccion = this.direcciones[0]; },
      error: () => { this.mostrarMensaje('Error al cargar las direcciones del cliente', 'error'); this.cargando = false; this.direcciones = []; }
    });
  }

  mostrarMensaje(mensaje: string, tipo: 'exito' | 'error' | 'advertencia' = 'error') {
    this.mensajeExito = tipo === 'exito' ? mensaje : '';
    this.mensajeError = tipo === 'error' ? mensaje : '';
    this.mensajeWarning = tipo === 'advertencia' ? mensaje : '';
  }

  dropzoneConfig: DropzoneConfigInterface = {
    url: 'https://httpbin.org/post',
    clickable: true,
    addRemoveLinks: true,
    previewsContainer: false,
    paramName: 'file',
    maxFilesize: 50,
    acceptedFiles: 'image/*',
  };

  // Cambiar onFileAdded a onFileSelected para que coincida con el HTML
  onFileSelected(event: any) {
    if (!event || !event[0]) return;
    if (this.uploadedFiles.length + event.length > this.maxImages) {
      this.mostrarMensaje(`Solo puedes subir un máximo de ${this.maxImages} imágenes`, 'advertencia');
      return;
    }

    Array.from(event).forEach((file: any) => {
      if (!file.type.match('image.*')) {
        this.mostrarMensaje('Solo se permiten archivos de imagen', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const fileData = {
          name: file.name,
          size: this.formatFileSize(file.size),
          type: file.type,
          dataURL: e.target.result,
          file: file,
          id: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        this.uploadedFiles = [...this.uploadedFiles, fileData];
      };
      reader.readAsDataURL(file);
    });
  }

  removeFile(file: any) {
    this.uploadedFiles = this.uploadedFiles.filter(f => f.id !== file.id);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cerrarAlerta() { this.mensajeExito = ''; this.mensajeWarning = ''; this.mensajeError = ''; }

  cancelar() { this.onCancel.emit(); }

  async guardar() {
    this.mostrarErrores = true;
    if (!this.visita.vendedor || !this.visita.cliente || !this.visita.direccion || !this.visita.esVi_Id || !this.visita.clVi_Fecha) { this.mostrarMensaje('Por favor complete todos los campos obligatorios.', 'error'); return; }
    if (this.uploadedFiles.length === 0) { this.mostrarMensaje('Debe subir al menos una imagen de la visita.', 'error'); return; }

    try {
      const imageUrls = [];
      for (const file of this.uploadedFiles) {
        if (file.file) {
          const url = await this.uploadImageToCloudinary(file.file);
          imageUrls.push(url);
        } else if (file.dataURL) { imageUrls.push(file.dataURL); }
      }
      await this.guardarVisita(imageUrls);
    } catch { this.mostrarMensaje('Error al subir las imágenes. Por favor, intente nuevamente.', 'error'); }
  }

  async uploadImageToCloudinary(file: File): Promise<string> {
    const url = 'https://api.cloudinary.com/v1_1/dbt7mxrwk/upload';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'empleados');
    const response = await fetch(url, { method: 'POST', body: formData });
    const data = await response.json();
    if (!data.secure_url) throw new Error('No se pudo obtener la URL de la imagen');
    return data.secure_url;
  }

  private async guardarVisita(imageUrls: string[]) {
    const visitaData = {
      clVi_Cliente: this.visita.cliente.clie_Id,
      clVi_Direccion: this.visita.direccion.diCl_DireccionExacta,
      clVi_Fecha: this.visita.clVi_Fecha,
      clVi_Observaciones: this.visita.clVi_Observaciones || '',
      clVi_Imagenes: imageUrls,
      clVi_UsuarioCreador: 1,
      esVi_Id: this.visita.esVi_Id,
      vende_Id: this.visita.vendedor.vende_Id
    };
    const response = await this.http.post<any>(`${environment.apiBaseUrl}/ClientesVisitaHistorial/Insertar`, visitaData, { headers: { 'x-api-key': environment.apiKey, 'Content-Type': 'application/json' } }).toPromise();
    if (response && response.success) { this.mostrarMensaje('Visita guardada exitosamente', 'exito'); this.onSave.emit(response.data); this.limpiarFormulario(); } 
    else { this.mostrarMensaje('Error al guardar la visita: ' + (response?.message || 'Error desconocido'), 'error'); }
  }

  limpiarFormulario() {
    this.visita = { vendedor: null, cliente: null, direccion: null, esVi_Id: '', clVi_Observaciones: '', clVi_Fecha: new Date().toISOString().split('T')[0] };
    this.clientesFiltrados = [];
    this.direcciones = [];
    this.uploadedFiles = [];
    this.mostrarErrores = false;
  }

  searchCliente = (term: string, item: any) => {
    if (!term) return true;
    term = term.toLowerCase();
    return item.clie_Codigo?.toLowerCase().includes(term) || item.clie_Nombres?.toLowerCase().includes(term) || item.clie_Apellidos?.toLowerCase().includes(term) || item.clie_NombreNegocio?.toLowerCase().includes(term);
  };
}
