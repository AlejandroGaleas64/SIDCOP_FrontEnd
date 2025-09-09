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
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

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
  cargandoImagen = false;
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
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

  constructor(private http: HttpClient, private router: Router, private imageUploadService: ImageUploadService) {}

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

    this.mostrarAlertaExito = tipo === 'exito';
    this.mostrarAlertaError = tipo === 'error';
    this.mostrarAlertaWarning = tipo === 'advertencia';
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
        // Crear una URL temporal para mostrar la imagen inmediatamente
        const tempImageUrl = URL.createObjectURL(file);
        
        const fileData = {
          name: file.name,
          size: this.formatFileSize(file.size),
          type: file.type,
          dataURL: tempImageUrl, // Usar URL temporal para mostrar la imagen inmediatamente
          file: file,
          id: Date.now() + Math.random().toString(36).substr(2, 9)
        };
        this.uploadedFiles = [...this.uploadedFiles, fileData];
      });
    } catch (error) {
      this.mostrarMensaje('Error al procesar los archivos', 'error');
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

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  cancelar() { this.onCancel.emit(); }

  guardar() {
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
    const userId = getUserId();
    const fechaActual = new Date();
    const fechaVisita = new Date(this.visita.clVi_Fecha);
    // fechaVisita.setHours(0, 0, 0, 0);

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

    // 1. Crear visita
    this.http.post<any>(`${environment.apiBaseUrl}/ClientesVisitaHistorial/Insertar`, visitaData, {
      headers: { 'x-api-key': environment.apiKey, 'Content-Type': 'application/json' }
    }).subscribe({
      next: () => {
        // 2. Obtener la última visita creada
        this.http.get<any[]>(`${environment.apiBaseUrl}/ClientesVisitaHistorial/Listar`, {
          headers: { 'x-api-key': environment.apiKey }
        }).subscribe({
          next: (visitas) => {
            if (!visitas || visitas.length === 0) {
              this.mostrarMensaje('No se pudo obtener la visita creada', 'error');
              this.cargando = false;
              return;
            }

            const ultimaVisita = visitas[0];
            const visitaId = ultimaVisita.clVi_Id;

            if (!visitaId) {
              this.mostrarMensaje('No se pudo obtener el ID de la visita creada', 'error');
              this.cargando = false;
              return;
            }

            // 3. Subir imágenes una por una y asociarlas
            let index = 0;
            const subirSiguiente = () => {
              if (index >= this.uploadedFiles.length) {
                // Todas las imágenes asociadas, mostrar éxito y limpiar formulario
                this.mostrarMensaje('Visita y las imágenes se registraron correctamente.', 'exito');

                setTimeout(() => {
                  this.mostrarAlertaExito = false;
                  this.onSave.emit(ultimaVisita);
                  this.limpiarFormulario();
                }, 3000);

                this.cargando = false;
                return;
              }

              const file = this.uploadedFiles[index];
              const subirImagen = (url: string) => {
                const imagenData = {
                  ImVi_Imagen: url,
                  ClVi_Id: Number(visitaId),
                  Usua_Creacion: Number(userId),
                  ImVi_FechaCreacion: new Date().toISOString()
                };

                this.http.post<any>(`${environment.apiBaseUrl}/ImagenVisita/Insertar`, imagenData, {
                  headers: { 'x-api-key': environment.apiKey, 'Content-Type': 'application/json' }
                }).subscribe({
                  next: () => {
                    index++;
                    subirSiguiente();
                  },
                  error: () => {
                    this.mostrarMensaje('Error al asociar imagen', 'error');
                    this.cargando = false;
                  }
                });
              };

              // Subir imagen usando ImageUploadService si es archivo
              if (file.file) {
                this.cargandoImagen = true;
                this.imageUploadService.uploadImageAsync(file.file)
                  .then(imagePath => {
                    this.cargandoImagen = false;
                    // Construir la URL completa para mostrar la imagen
                    const baseUrl = environment.apiBaseUrl.replace('/api', '');
                    const fullImagePath = `${baseUrl}/${imagePath.startsWith('/') ? imagePath.substring(1) : imagePath}`;
                    if (imagePath) subirImagen(fullImagePath);
                    else this.mostrarMensaje('No se pudo obtener la ruta de la imagen', 'error');
                  })
                  .catch(error => {
                    this.cargandoImagen = false;
                    this.mostrarMensaje('Error al subir la imagen al servidor', 'error');
                  });
              } else if (file.dataURL) {
                subirImagen(file.dataURL);
              } else {
                index++;
                subirSiguiente();
              }
            };

            subirSiguiente();
          },
          error: () => {
            this.mostrarMensaje('Error al obtener la visita creada', 'error');
            this.cargando = false;
          }
        });
      },
      error: () => {
        this.mostrarMensaje('Error al crear la visita', 'error');
        this.cargando = false;
      }
    });
  }

  async uploadImage(file: File): Promise<string> {
    try {
      const imagePath = await this.imageUploadService.uploadImageAsync(file);
      return imagePath;
    } catch (error) {
      throw new Error('No se pudo subir la imagen');
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
