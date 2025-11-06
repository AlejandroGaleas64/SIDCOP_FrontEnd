import { Component, Output, EventEmitter, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { EstadoCivil } from 'src/app/Modelos/general/EstadoCivil.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Empleado } from 'src/app/Modelos/general/Empleado.Model';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule, DropzoneModule, NgxMaskDirective, NgxMaskPipe],
  providers: [provideNgxMask()],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})


export class EditComponent implements OnInit, OnChanges {
  //Inputs y outputs
  @Input() empleadoData: Empleado | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Empleado>();

  // Variables para el manejo de imágenes
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  isDragOver = false;

  //Variables para almacenar listas de datos
  sucursales: any[] = [];
  estadosCiviles: any[] = [];
  cargos: any[] = [];
  colonias: any[] = [];
  colonia: any[] = [];



  async ngOnInit(): Promise<void> {
    // Inicializar datos básicos primero
    this.obtenerSucursales();
    this.obtenerEstadosCiviles();
    this.obtenerCargos();
    this.listarColonias();
    
    if (this.empleadoData) {
      this.empleado = { ...this.empleadoData };
      this.empleadoOriginal = this.empleado.empl_Apellidos || '';
      
      // Cargar imagen existente si hay una
      if (this.empleado.empl_Imagen) {
        try {
          // Usar el método getImageDisplayUrl para construir la URL
          const imageUrl = this.getImageDisplayUrl(this.empleado.empl_Imagen);
          
          this.imagePreview = imageUrl;

          // Actualizar uploadedFiles con la información de la imagen
          const filename = this.empleado.empl_Imagen.split('/').pop() || 'image';
          this.uploadedFiles = [{
            name: filename,
            dataURL: imageUrl,
          }];
          
          // No intentar convertir a File por ahora
          this.selectedFile = null;
        } catch (error) {
          console.error('Error al cargar la imagen:', error);
        }
      } else {
        console.log('No se encontró imagen en el empleado');
      }
    } else {
      //console.log('ngOnInit - No hay EmpleadoData');
    }

    this.obtenerSucursales();
    this.obtenerEstadosCiviles();
    this.obtenerCargos();
    this.listarColonias();
  }

  //Inicializar el objeto empleado
  empleado: Empleado = {
    empl_Id: 0,
    empl_DNI: '',
    empl_Codigo: '',
    empl_Nombres: '',
    empl_Apellidos: '',
    empl_Sexo: '',
    empl_FechaNacimiento: new Date(),
    empl_Correo: '',
    empl_Telefono: '',
    empl_Imagen: '',
    sucu_Id: 0,
    esCv_Id: 0,
    carg_Id: 0,
    colo_Id: 0,
    empl_DireccionExacta: '',
    usua_Creacion: 0,
    empl_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    empl_FechaModificacion: new Date(),
    empl_Estado: true
  };

  //Variables para mostrar alertas
  empleadoOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  //Constructor
  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) {
    // Forzar detección de cambios al inicializar
    setTimeout(() => {
      if (this.empleadoData && this.empleadoData.empl_Imagen) {
        this.initializeImage();
      }
    }, 0);
  }

  private initializeImage(): void {
    try {
      if (this.empleadoData?.empl_Imagen) {
        const imageUrl = this.getImageDisplayUrl(this.empleadoData.empl_Imagen);
        this.imagePreview = imageUrl;
        
        const filename = this.empleadoData.empl_Imagen.split('/').pop() || 'image';
        this.uploadedFiles = [{
          name: filename,
          dataURL: imageUrl
        }];
      }
    } catch (error) {
      console.error('Error al inicializar la imagen:', error);
    }
  }

  // Método para convertir URL a File
  private async urlToFile(url: string, filename: string, mimeType: string): Promise<File> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: mimeType });
    } catch (error) {
      console.error('Error al convertir URL a File:', error);
      throw error;
    }
  }

  get fechaInicioFormato(): string {
    return new Date(this.empleado.empl_FechaNacimiento).toISOString().split('T')[0];
  }

  set fechaInicioFormato(value: string) {
    this.empleado.empl_FechaNacimiento = new Date(value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    //Si hay cambios en el empleadoData
    if (changes['empleadoData'] && changes['empleadoData'].currentValue) {
      this.empleado = { ...changes['empleadoData'].currentValue };
      this.empleadoOriginal = this.empleado.empl_Apellidos || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
      
      // Recargar imagen si existe
      if (this.empleado.empl_Imagen) {
        const imageUrl = `${environment.apiBaseUrl}/${this.empleado.empl_Imagen}`;
        this.imagePreview = imageUrl;
        
        // Actualizar uploadedFiles
        const filename = this.empleado.empl_Imagen.split('/').pop() || 'image';
        this.uploadedFiles = [{
          name: filename,
          dataURL: imageUrl
        }];
      } else {
        this.uploadedFiles = [];
        this.imagePreview = null;
      }
    }
  }

  //Funcion para cancelar
  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  //Funcion para cerrar alertas
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  //Funcion para validar el formato del DNI
  private validarFormatoDNI(dni: string): boolean {
    const formatoDNI = /^\d{4}-\d{4}-\d{5}$/;
    return formatoDNI.test(dni);
  }

  //Funcion para validar el formato del correo electrónico
  validarCorreo(correo: string): boolean {
    const formatoCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return formatoCorreo.test(correo);
  }

  //Funcion para validar la edicion
  validarEdicion(): void {
    this.mostrarErrores = true;

    // Verificar si hay imagen (ya sea la original o una nueva)
    const tieneImagen = this.uploadedFiles.length > 0;
    
    // Si no hay imagen, mostrar error y salir
    if (!tieneImagen) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La imagen del empleado es obligatoria.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    // Validar que empleadoData existe
    if (!this.empleadoData) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error: No hay datos del empleado para comparar';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    // Validar formato del DNI
    if (!this.validarFormatoDNI(this.empleado?.empl_DNI || '')) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'El DNI debe tener el formato 0000-0000-00000';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    // Validar correo electrónico
    if (this.empleado.empl_Correo.trim() && !this.validarCorreo(this.empleado.empl_Correo.trim())) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor ingrese un correo electrónico válido.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    // Validar que todos los campos requeridos estén completos
    const camposRequeridos = [
      this.empleado.empl_DNI,
      this.empleado.empl_Codigo,
      this.empleado.empl_Nombres,
      this.empleado.empl_Apellidos,
      this.empleado.empl_Sexo,
      this.empleado.empl_FechaNacimiento,
      this.empleado.empl_Correo,
      this.empleado.empl_Telefono,
      this.empleado.sucu_Id,
      this.empleado.esCv_Id,
      this.empleado.carg_Id,
      this.empleado.colo_Id,
      this.empleado.empl_DireccionExacta
    ];

    // Verifica si todos los campos están llenos
    const todosLlenos = camposRequeridos.every(c => c && c.toString().trim() !== '');

    if (!todosLlenos) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    // Solo después de validar que todo está completo, verificar si hay cambios
    if (this.hayDiferencias()) {
      this.mostrarConfirmacionEditar = true;
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'No se han detectado cambios.';
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

  //Funcion que guarda los datos del empleado
  async guardar(): Promise<void> {
    this.mostrarErrores = true;
    const fechaInicial = new Date(this.empleado.empl_FechaNacimiento).toISOString().split('T')[0];

    // Si hay un archivo local seleccionado en uploadedFiles, subirlo al backend
    if (this.uploadedFiles.length > 0 && this.uploadedFiles[0].file) {
      try {
        const imagePath = await this.imageUploadService.uploadImageAsync(this.uploadedFiles[0].file);
        this.empleado.empl_Imagen = imagePath;
      } catch (error) {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al subir la imagen al servidor.';
        return; // No continuar si la imagen no se pudo subir
      }
    }

    // Validar que al menos un campo haya cambiado
    const camposValidos = 
      this.empleado.empl_DNI?.trim() !== '' &&
      this.empleado.empl_Codigo?.trim() !== '' &&
      this.empleado.empl_Nombres?.trim() !== '' &&
      this.empleado.empl_Apellidos?.trim() !== '' &&
      this.empleado.empl_Sexo?.trim() !== '' &&
      this.empleado.empl_Correo?.trim() !== '' &&
      this.validarCorreo(this.empleado.empl_Correo?.trim() || '') &&
      this.empleado.empl_Telefono?.trim() !== '' &&
      this.empleado.sucu_Id !== 0 &&
      this.empleado.esCv_Id !== 0 &&
      this.empleado.carg_Id !== 0 &&
      this.empleado.colo_Id !== 0 &&
      this.empleado.empl_DireccionExacta?.trim() !== '';

    if (camposValidos) {
      const empleadoActualizar = {
        empl_Id: this.empleado.empl_Id,
        empl_DNI: this.empleado.empl_DNI,
        empl_Codigo: this.empleado.empl_Codigo,
        empl_Nombres: this.empleado.empl_Nombres,
        empl_Apellidos: this.empleado.empl_Apellidos,
        empl_Sexo: this.empleado.empl_Sexo,
        empl_FechaNacimiento: fechaInicial,
        empl_Correo: this.empleado.empl_Correo,
        empl_Telefono: this.empleado.empl_Telefono,
        sucu_Id: this.empleado.sucu_Id,
        esCv_Id: this.empleado.esCv_Id,
        carg_Id: this.empleado.carg_Id,
        colo_Id: this.empleado.colo_Id,
        empl_DireccionExacta: this.empleado.empl_DireccionExacta,
        empl_Imagen: this.empleado.empl_Imagen,
        empl_Estado: true,
        usua_Creacion: getUserId(), // variable global
        empl_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: getUserId(), // variable global
        empl_FechaModificacion: new Date().toISOString(),
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Empleado/Actualizar`, empleadoActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Empleado "${this.empleado.empl_Nombres}" actualizado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.empleado);
            this.cancelar();
          }, 1000);
        },
        error: (error) => {
          console.error('Error al actualizar empleado:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el empleado. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }


  //Funcion para obtener las sucursales
  obtenerSucursales() {
    const headers = {
      'X-Api-Key': environment.apiKey,
      'Content-Type': 'application/json',
      'accept': '*/*'
    };

    this.http.get<any[]>(`${environment.apiBaseUrl}/Sucursales/Listar`, { headers }).subscribe({
      next: (data) => {
        this.sucursales = data;
      },
      error: (error) => {
        console.error('Error al obtener sucursales:', error);
      }
    });
  }


  //Funcion para obtener los estados civiles
  obtenerEstadosCiviles() {
    const headers = {
      'X-Api-Key': environment.apiKey,
      'Content-Type': 'application/json',
      'accept': '*/*'
    };

    this.http.get<any[]>(`${environment.apiBaseUrl}/EstadosCiviles/Listar`, { headers }).subscribe({
      next: (data) => {
        this.estadosCiviles = data;
      },
      error: (error) => {
        console.error('Error al obtener los estados civiles:', error);
      }
    });
  }


  //Funcion para obtener los cargos
  obtenerCargos() {
    const headers = {
      'X-Api-Key': environment.apiKey,
      'Content-Type': 'application/json',
      'accept': '*/*'
    };

    this.http.get<any[]>(`${environment.apiBaseUrl}/Cargo/Listar`, { headers }).subscribe({
      next: (data) => {
        this.cargos = data;
      },
      error: (error) => {
        console.error('Error al obtener cargos:', error);
      }
    });
  }

  //Funcion para ordenar las colonias
  ordenarPorMunicipioYDepartamento(colonias: any[]): any[] {
    return colonias.sort((a, b) => {
      // Primero por departamento
      if (a.depa_Descripcion < b.depa_Descripcion) return -1;
      if (a.depa_Descripcion > b.depa_Descripcion) return 1;
      // Luego por municipio
      if (a.muni_Descripcion < b.muni_Descripcion) return -1;
      if (a.muni_Descripcion > b.muni_Descripcion) return 1;
      return 0;
    });
  }

  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  direccionExactaInicial: string = '';

  onColoniaSeleccionada(colo_Id: number) {
    const coloniaSeleccionada = this.colonia.find((c: any) => c.colo_Id === colo_Id);
    if (coloniaSeleccionada) {
      this.direccionExactaInicial = coloniaSeleccionada.colo_Descripcion;
      this.empleado.empl_DireccionExacta = coloniaSeleccionada.colo_Descripcion;
    } else {
      this.direccionExactaInicial = '';
      this.empleado.empl_DireccionExacta = '';
    }
  }

  listarColonias(): void {
  this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => this.colonia = this.ordenarPorMunicipioYDepartamento(data));
  };


  //Imagenes

  //Crear imagenes

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


  // Método para obtener la URL completa de la imagen para mostrarla
  getImageDisplayUrl(imagePath: string): string {
    if (!imagePath) return '';
    
    // Limpiar la ruta de cualquier referencia duplicada a apiBaseUrl
    const cleanPath = imagePath
      .replace(environment.apiBaseUrl, '')  // Remover cualquier URL base completa
      .replace('apiBaseUrl/', '')           // Remover string literal
      .replace(/^\/+/, '');                 // Remover slashes iniciales extra
    
    const fullUrl = `${environment.apiBaseUrl}/${cleanPath}`;
    return fullUrl;
  }
  
  //Funcion para manejar la imagen seleccionada
  onFileSelected(event: any) {
    let file: File | null = null;
    
    // Si es una URL de Cloudinary (string)
    if (typeof event === 'string' && event.includes('cloudinary')) {
      this.imagePreview = event;
      this.uploadedFiles = [{
        name: event.split('/').pop() || 'image',
        dataURL: event,
      }];
      return;
    }
    
    // Manejar tanto eventos de input como de dropzone
    if (event.target && event.target.files) {
      file = event.target.files[0];
    } else if (Array.isArray(event)) {
      file = event[0];
    } else if (event instanceof File) {
      file = event;
    }

    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Por favor selecciona una imagen válida';
      return;
    }

    // Validar tamaño (50MB como tienes en dropzoneConfig)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'La imagen es demasiado grande. Máximo 50MB.';
        return;
    }

    this.selectedFile = file;

    // Previsualización local inmediata
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      this.uploadedFiles = [{ 
        ...file, 
        dataURL: e.target.result, 
        name: file?.name || 'image', 
        file: file 
      }];
    };
    reader.readAsDataURL(file);
  }

  //Funcion para manejar el arrastre de la imagen
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  //Funcion para manejar el area de arrastre de la imagen
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  //Funcion que maneja las imagenes al soltar
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.onFileSelected(event.dataTransfer.files[0]);
    }
  }

  //Funcion para formatear el tamaño de la imagen
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  //Funcion para eliminar la imagen
  removeFile(event: any) {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    
    // Limpiar las nuevas propiedades
    this.selectedFile = null;
    this.imagePreview = null;
    
    // Limpiar tu lógica original
    if (this.uploadedFiles.length > 0) {
      this.uploadedFiles.splice(this.uploadedFiles.indexOf(event), 1);
    }
    this.uploadedFiles = [];

    // Limpiar el input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Objeto para rastrear cambios
  cambiosDetectados: any = {};

  //Funcion para verificar si hay diferencias
  private hayDiferencias(): boolean {
    if (!this.empleado || !this.empleadoData) return false;

    this.cambiosDetectados = {};

    // Verificar primero si hay imagen
    if (this.uploadedFiles.length === 0) {
      return false; // No continuar con la validación si no hay imagen
    }

    // Verificar si hay un nuevo archivo seleccionado
    if (this.selectedFile || (this.uploadedFiles.length > 0 && this.uploadedFiles[0].file)) {
      this.cambiosDetectados.imagen = {
        anterior: this.empleadoData.empl_Imagen ? 'Imagen actual' : 'Sin imagen',
        nuevo: 'Nueva imagen seleccionada',
        label: 'Imagen del empleado',
        isImage: true,
        anteriorUrl: this.empleadoData.empl_Imagen ? this.getImageDisplayUrl(this.empleadoData.empl_Imagen) : null,
        nuevoUrl: this.imagePreview
      };
    }

    // Verificar cambios en cada campo
    if (this.empleado?.empl_DNI !== this.empleadoData?.empl_DNI) {
      this.cambiosDetectados.dni = {
        anterior: this.empleadoData?.empl_DNI || 'Sin DNI',
        nuevo: this.empleado?.empl_DNI || '',
        label: 'DNI del Empleado'
      };
    }

    if (this.empleado?.empl_Nombres !== this.empleadoData?.empl_Nombres) {
      this.cambiosDetectados.nombres = {
        anterior: this.empleadoData?.empl_Nombres || 'Sin nombres',
        nuevo: this.empleado?.empl_Nombres || '',
        label: 'Nombres del empleado'
      };
    }

    if (this.empleado?.empl_Apellidos !== this.empleadoData?.empl_Apellidos) {
      this.cambiosDetectados.apellidos = {
        anterior: this.empleadoData?.empl_Apellidos || 'Sin apellidos',
        nuevo: this.empleado?.empl_Apellidos || '',
        label: 'Apellidos del empleado'
      };
    }

    if (this.empleado?.empl_Sexo !== this.empleadoData?.empl_Sexo) {
      this.cambiosDetectados.sexo = {
        anterior: this.empleadoData?.empl_Sexo || 'Sin especificar',
        nuevo: this.empleado?.empl_Sexo || '',
        label: 'Sexo del empleado'
      };
    }

    if (this.empleado?.empl_FechaNacimiento?.toString() !== this.empleadoData?.empl_FechaNacimiento?.toString()) {
      this.cambiosDetectados.fechaNacimiento = {
        anterior: this.empleadoData?.empl_FechaNacimiento?.toString() || 'Sin fecha',
        nuevo: this.empleado?.empl_FechaNacimiento?.toString() || '',
        label: 'Fecha de nacimiento'
      };
    }

    if (this.empleado?.empl_Correo !== this.empleadoData?.empl_Correo) {
      this.cambiosDetectados.correo = {
        anterior: this.empleadoData?.empl_Correo || 'Sin correo',
        nuevo: this.empleado?.empl_Correo || '',
        label: 'Correo del empleado'
      };
    }

    if (this.empleado?.empl_Telefono !== this.empleadoData?.empl_Telefono) {
      this.cambiosDetectados.telefono = {
        anterior: this.empleadoData?.empl_Telefono || 'Sin teléfono',
        nuevo: this.empleado?.empl_Telefono || '',
        label: 'Teléfono del empleado'
      };
    }

    if (this.empleado?.sucu_Id !== this.empleadoData?.sucu_Id) {
      const sucursalAnterior = this.sucursales?.find(s => s.sucu_Id === this.empleadoData?.sucu_Id);
      const sucursalNueva = this.sucursales?.find(s => s.sucu_Id === this.empleado?.sucu_Id);
      this.cambiosDetectados.sucursal = {
        anterior: sucursalAnterior?.sucu_Descripcion || 'Sin sucursal',
        nuevo: sucursalNueva?.sucu_Descripcion || 'Sin sucursal',
        label: 'Sucursal'
      };
    }

    if (this.empleado?.esCv_Id !== this.empleadoData?.esCv_Id) {
      const estadoCivilAnterior = this.estadosCiviles?.find(e => e.esCv_Id === this.empleadoData?.esCv_Id);
      const estadoCivilNuevo = this.estadosCiviles?.find(e => e.esCv_Id === this.empleado?.esCv_Id);
      this.cambiosDetectados.estadoCivil = {
        anterior: estadoCivilAnterior?.esCv_Descripcion || 'Sin estado civil',
        nuevo: estadoCivilNuevo?.esCv_Descripcion || 'Sin estado civil',
        label: 'Estado Civil'
      };
    }

    if (this.empleado?.carg_Id !== this.empleadoData?.carg_Id) {
      const cargoAnterior = this.cargos?.find(c => c.carg_Id === this.empleadoData?.carg_Id);
      const cargoNuevo = this.cargos?.find(c => c.carg_Id === this.empleado?.carg_Id);
      this.cambiosDetectados.cargo = {
        anterior: cargoAnterior?.carg_Descripcion || 'Sin cargo',
        nuevo: cargoNuevo?.carg_Descripcion || 'Sin cargo',
        label: 'Cargo'
      };
    }

    if (this.empleado?.colo_Id !== this.empleadoData?.colo_Id) {
      const coloniaAnterior = this.colonia?.find(c => c.colo_Id === this.empleadoData?.colo_Id);
      const coloniaNueva = this.colonia?.find(c => c.colo_Id === this.empleado?.colo_Id);
      this.cambiosDetectados.colonia = {
        anterior: coloniaAnterior?.colo_Descripcion || 'Sin colonia',
        nuevo: coloniaNueva?.colo_Descripcion || 'Sin colonia',
        label: 'Colonia'
      };
    }

    if (this.empleado.empl_DireccionExacta !== this.empleadoData.empl_DireccionExacta) {
      this.cambiosDetectados.direccion = {
        anterior: this.empleadoData.empl_DireccionExacta || 'Sin dirección',
        nuevo: this.empleado.empl_DireccionExacta,
        label: 'Dirección exacta'
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  // Método para obtener la lista de cambios en formato para mostrar en el modal
  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  } 
}
