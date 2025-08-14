import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { Router } from '@angular/router';
import { getUserId } from 'src/app/core/utils/user-utils';
import { lastValueFrom } from 'rxjs';

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
    esVi_Id: null,
    clVi_Observaciones: '',
    clVi_Fecha: ''
  };

  cargando = false;
  mostrarErrores = false;
  mensajeExito = '';
  mensajeWarning = '';
  mensajeError = '';
  maxDate = new Date().toISOString().split('T')[0];
  minDate = '2000-01-01';

  uploadedFiles: any[] = [];

  dropzoneConfig: DropzoneConfigInterface = {
    url: 'https://httpbin.org/post',
    clickable: true,
    addRemoveLinks: true,
    previewsContainer: false,
    paramName: 'file',
    maxFilesize: 50,
    acceptedFiles: 'image/*',
  };

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
    if (!rutaId) { 
      this.clientesFiltrados = [];
      this.visita.cliente = null;
      return; 
    }
    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        // Filtrar clientes por ruta_Id
        this.clientesFiltrados = (data || []).filter(cliente => cliente.ruta_Id === rutaId);
        this.cargando = false;
        if (this.clientesFiltrados.length === 1) { 
          this.visita.cliente = this.clientesFiltrados[0]; 
          this.onClienteSeleccionado(this.visita.cliente); 
        } else { 
          this.visita.cliente = null; 
          this.visita.direccion = null; 
          this.direcciones = []; 
        }
      },
      error: () => { 
        this.mostrarMensaje('Error al cargar la lista de clientes', 'error'); 
        this.cargando = false; 
        this.clientesFiltrados = []; 
      }
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

  onFileSelected(event: any) {
    try {
      let files: File[] = [];
      if (event?.addedFiles) files = Array.from(event.addedFiles);
      else if (event?.target?.files) files = Array.from(event.target.files);
      else if (Array.isArray(event)) files = event;
      else if (event?.file) files = [event.file];
      else if (event instanceof File) files = [event];

      files.forEach((file: File) => {
        if (!file || !(file instanceof File)) return;
        if (!file.type || !file.type.startsWith('image/')) {
          this.mostrarMensaje(`El archivo ${file.name} no es una imagen válida`, 'error');
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
    } catch (error) {
      this.mostrarMensaje('Error al procesar los archivos', 'error');
      console.error('Error en onFileSelected:', error);
    }
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
    if (!this.visita.vendedor || !this.visita.cliente || !this.visita.direccion || !this.visita.esVi_Id || !this.visita.clVi_Fecha) { 
      this.mostrarMensaje('Por favor complete todos los campos obligatorios.', 'error'); 
      return; 
    }
    
    if (this.uploadedFiles.length === 0) { 
      this.mostrarMensaje('Debe subir al menos una imagen de la visita.', 'error'); 
      return; 
    }

    this.cargando = true;
    
    try {
      const imageUrls = [];
      for (const file of this.uploadedFiles) {
        if (file.file) {
          const url = await this.uploadImageToCloudinary(file.file);
          imageUrls.push(url);
        } else if (file.dataURL) { 
          imageUrls.push(file.dataURL); 
        }
      }

      const visitaCreada = await this.crearVisita();
      const visitaId = visitaCreada?.data?.clVi_Id || visitaCreada?.data?.id;
      
      if (!visitaId) throw new Error('No se pudo obtener el ID de la visita creada');

      if (imageUrls.length > 0) await this.asociarImagenesAVisita(visitaId, imageUrls);

      this.mostrarMensaje('Visita creada exitosamente', 'exito');
      this.onSave.emit(visitaCreada.data);
      this.limpiarFormulario();
      
    } catch (error: any) {
      console.error('Error al guardar la visita:', error);
      const errorMessage = error?.message || 'Error al procesar la solicitud. Por favor, intente nuevamente.';
      this.mostrarMensaje(errorMessage, 'error');
    } finally {
      this.cargando = false;
    }
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

  private async crearVisita(): Promise<any> {
    try {
      if (!this.visita.vendedor?.ruta_Id) throw new Error('Falta el ID de ruta del vendedor');
      if (!this.visita.direccion?.diCl_Id) throw new Error('Falta el ID de dirección');
      if (!this.visita.esVi_Id) throw new Error('Falta el estado de la visita');
      if (!this.visita.clVi_Fecha) throw new Error('Falta la fecha de la visita');

      const userId = getUserId();
      const fechaActual = new Date();
      const fechaVisita = new Date(this.visita.clVi_Fecha);
      fechaVisita.setHours(0, 0, 0, 0);

      const visitaData = {
        clVi_Id: 0,                               
        diCl_Id: Number(this.visita.direccion?.diCl_Id) || 0,
        diCl_Latitud: 0,
        diCl_Longitud: 0,
        vend_Id: 0,
        vend_Codigo: '',
        vend_DNI: '',
        vend_Nombres: '',
        vend_Apellidos: '',
        vend_Telefono: '',
        vend_Tipo: '',
        vend_Imagen: '',
        ruta_Id: 0,
        ruta_Descripcion: '',
        veRu_Id: Number(this.visita.vendedor?.veRu_Id) || 0,
        veRu_Dias: '',
        clie_Id: Number(this.visita.cliente?.clie_Id) || 0,
        clie_Codigo: this.visita.cliente?.clie_Codigo || '',
        clie_Nombres: this.visita.cliente?.clie_Nombres || '',
        clie_Apellidos: this.visita.cliente?.clie_Apellidos || '',
        clie_NombreNegocio: this.visita.cliente?.clie_NombreNegocio || '',
        imVi_Imagen: '',
        clie_Telefono: this.visita.cliente?.clie_Telefono || '',
        esVi_Id: Number(this.visita.esVi_Id) || 0,
        esVi_Descripcion: '',
        clVi_Observaciones: this.visita.clVi_Observaciones || '',
        clVi_Fecha: fechaVisita.toISOString(),
        usua_Creacion: Number(userId) || 0,
        clVi_FechaCreacion: fechaActual.toISOString()
      };



      console.log('Enviando datos de visita:', visitaData);

      const response = await lastValueFrom(
        this.http.post<any>(
          `${environment.apiBaseUrl}/ClientesVisitaHistorial/Insertar`,
          visitaData,
          { headers: { 'x-api-key': environment.apiKey, 'Content-Type': 'application/json' } }
        )
      );

      if (!response) throw new Error('No se recibió respuesta del servidor');
      return response;

    } catch (error: any) {
      console.error('Error en crearVisita:', error);
      throw new Error(error.message || 'Error al crear la visita');
    }
  }

  private async asociarImagenesAVisita(visitaId: number, imageUrls: string[]): Promise<void> {
    if (!visitaId || !imageUrls?.length) return;

    const userId = getUserId();
    const fechaActual = new Date().toISOString();

    for (const imageUrl of imageUrls) {
      const imagenData = {
        ImVi_Imagen: imageUrl,
        ClVi_Id: Number(visitaId),
        Usua_Creacion: Number(userId),
        ImVi_FechaCreacion: fechaActual
      };

      console.log('Enviando imagen a asociar:', imagenData);

      try {
        const response = await lastValueFrom(
          this.http.post<any>(
            `${environment.apiBaseUrl}/ImagenVisita/Insertar`,
            imagenData,
            { headers: { 'x-api-key': environment.apiKey, 'Content-Type': 'application/json' } }
          )
        );

        console.log('Respuesta de imagen asociada:', response);

      } catch (error) {
        console.error('Error al asociar imagen:', error);
      }
    }
  }

  limpiarFormulario() {
    this.visita = {
      vendedor: null,
      cliente: null,
      direccion: null,
      esVi_Id: null,
      clVi_Observaciones: '',
      clVi_Fecha: new Date().toISOString().split('T')[0]
    };
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
