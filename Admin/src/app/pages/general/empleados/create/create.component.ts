import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Empleado } from 'src/app/Modelos/general/Empleado.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';


@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule, NgxMaskDirective, NgxMaskPipe, DropzoneModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
  providers: [provideNgxMask()]
})

export class CreateComponent {
  //Variables para almacenar listas de datos
  sucursales: any[] = [];
  estadosCiviles: any[] = [];
  cargos: any[] = [];
  colonia: any[] = [];
  empleados: any[] = [];

  //Eventos
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Empleado>();
    
  //Variables para mostrar alertas
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError: boolean = false;
  mensajeError: string = '';
  mostrarAlertaWarning: boolean = false;
  mensajeWarning: string = '';
  correoInvalido: boolean = false;
  dniDuplicado: boolean = false;

  //Variables para subir imagen
  isDragOver: boolean = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
    
  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) {}

  ngOnInit(): void {
    this.obtenerSucursales();
    this.obtenerEstadosCiviles();
    this.obtenerCargos();
    this.listarColonias();
    this.cargarEmpleados();
  }
  
  //Inicializar el objeto empleado
  empleado: Empleado = {
    empl_Id: 0,
    empl_DNI: '',
    empl_Codigo: '',
    empl_Nombres: '',
    empl_Apellidos: '',
    empl_Sexo: 'M',
    empl_FechaNacimiento: new Date(),
    empl_Correo: '',
    empl_Telefono: '',
    sucu_Id: 0,
    esCv_Id: 0,
    carg_Id: 0,
    colo_Id: 0,
    empl_DireccionExacta: '',
    usua_Creacion: 0,
    empl_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    empl_FechaModificacion: new Date(),
    empl_Estado: true,
    empl_Imagen: ''
  };
  
  //Funcion para limpiar el formulario
  limpiarFormulario(): void {
    // Limpiar imagen
    this.uploadedFiles = [];
    this.selectedFile = null;
    this.imagePreview = null;
    this.isDragOver = false;

    // Reiniciar el empleado con valores por defecto
    this.empleado = {
      empl_Id: 0,
      empl_DNI: '',
      empl_Codigo: this.generarSiguienteCodigo(), // Generar nuevo código
      empl_Nombres: '',
      empl_Apellidos: '',
      empl_Sexo: 'M',
      empl_FechaNacimiento: new Date(),
      empl_Correo: '',
      empl_Telefono: '',
      sucu_Id: 0,
      esCv_Id: 0,
      carg_Id: 0,
      colo_Id: 0,
      empl_DireccionExacta: '',
      usua_Creacion: 0,
      empl_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      empl_FechaModificacion: new Date(),
      empl_Estado: true,
      empl_Imagen: ''
    };
    
    // Resetear errores de validación
    this.mostrarErrores = false;
    this.correoInvalido = false;
    this.dniDuplicado = false;
  }

  //Funcion para cancelar
  cancelar(): void {
    // Limpiar alertas
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';

    // Limpiar el formulario
    this.limpiarFormulario();
    
    // Recargar lista de empleados para obtener el código actualizado
    this.cargarEmpleados();
    
    // Emitir evento de cancelar
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
  
  //Funcion para guardar
  async guardar(): Promise<void> {
    // Activar bandera de errores para validación visual
    this.mostrarErrores = true;
    this.dniDuplicado = false;

    // Validar campos obligatorios
    const camposFaltantes: string[] = [];

    if (!this.empleado.empl_DNI?.trim()) camposFaltantes.push('DNI');
    if (!this.empleado.empl_Nombres?.trim()) camposFaltantes.push('nombres');
    if (!this.empleado.empl_Apellidos?.trim()) camposFaltantes.push('apellidos');
    if (!this.empleado.empl_Correo?.trim()) {
      camposFaltantes.push('correo electrónico');
      this.correoInvalido = false;
    } else if (!this.empleado.empl_Correo.match('[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')) {
      this.correoInvalido = true;
      camposFaltantes.push('un correo electrónico válido');
    } else {
      this.correoInvalido = false;
    }
    if (!this.empleado.empl_Telefono?.trim()) camposFaltantes.push('teléfono');
    if (!this.empleado.sucu_Id) camposFaltantes.push('sucursal');
    if (!this.empleado.esCv_Id) camposFaltantes.push('estado civil');
    if (!this.empleado.carg_Id) camposFaltantes.push('cargo');
    if (!this.empleado.colo_Id) camposFaltantes.push('colonia');
    if (!this.empleado.empl_DireccionExacta?.trim()) camposFaltantes.push('dirección exacta');
    if (!this.selectedFile && !this.uploadedFiles.length) camposFaltantes.push('imagen');

    // Si hay campos faltantes, mostrar mensaje de advertencia
    if (camposFaltantes.length > 0) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      
      // Ocultar la alerta después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      
      return;
    }

    // Validar que el DNI no esté repetido en la lista de empleados
    const dniActual = (this.empleado.empl_DNI || '').replace(/[^0-9]/g, '');
    const dniExiste = this.empleados.some(e => ((e.empl_DNI || '').replace(/[^0-9]/g, '')) === dniActual);
    if (dniExiste) {
      this.dniDuplicado = true;
      this.mostrarAlertaError = true;
      this.mensajeError = 'El DNI ingresado ya existe para otro empleado.';
      this.mostrarAlertaWarning = false;
      
      setTimeout(() => {
        this.mostrarAlertaError = false;
        this.mensajeError = '';
      }, 5000);
      
      return;
    }

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
    } else if (this.selectedFile) {
      // Si hay un archivo seleccionado pero no en uploadedFiles (puede pasar en algunos casos)
      try {
        const imagePath = await this.imageUploadService.uploadImageAsync(this.selectedFile);
        this.empleado.empl_Imagen = imagePath;
      } catch (error) {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al subir la imagen al servidor.';
        return;
      }
    }

    // Si llegamos hasta aquí, todos los campos obligatorios están completos
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;

    // Continuar con el procesamiento del formulario
    if (this.empleado.empl_DNI.trim()) {
    // Limpiar alertas previas
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;

    const dni = this.empleado.empl_DNI.replace(/[^0-9]/g, ''); // Eliminar cualquier guión existente y solo mantener números
    // Formatear como 0505-5050-50505 (4-4-5)
    const dniMask = dni.length >= 13 ? 
      `${dni.slice(0, 4)}-${dni.slice(4, 8)}-${dni.slice(8, 13)}` : 
      dni; // Si no tiene la longitud suficiente, dejarlo como está

    const telefono = this.empleado.empl_Telefono.trim();
      
    const empleadoGuardar = {
      empl_Id: 0,
      empl_DNI: dniMask,
      empl_Codigo: this.empleado.empl_Codigo,
      empl_Nombres: this.empleado.empl_Nombres,
      empl_Apellidos: this.empleado.empl_Apellidos,
      empl_Sexo: this.empleado.empl_Sexo,
      empl_FechaNacimiento: new Date(this.empleado.empl_FechaNacimiento).toISOString(),
      empl_Correo: this.empleado.empl_Correo,
      empl_Telefono: this.empleado.empl_Telefono,
      sucu_Id: this.empleado.sucu_Id,
      esCv_Id: this.empleado.esCv_Id,
      carg_Id: this.empleado.carg_Id,
      colo_Id: this.empleado.colo_Id,
      empl_DireccionExacta: this.empleado.empl_DireccionExacta,
      empl_Imagen: this.empleado.empl_Imagen,
      empl_Estado: true,
      usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
      empl_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: 0,
      empl_FechaModificacion: new Date().toISOString(),
    };
    
      
    this.http.post<any>(`${environment.apiBaseUrl}/Empleado/Insertar`, empleadoGuardar, {
    headers: { 
    'X-Api-Key': environment.apiKey,
    'Content-Type': 'application/json',
    'accept': '*/*'
    }
    }).subscribe({
    next: (response) => {
      
      // Mostrar mensaje de éxito
      this.mostrarAlertaExito = true;
      this.mensajeExito = `Empleado "${this.empleado.empl_Nombres}" guardado exitosamente`;
      this.mostrarAlertaError = false;
      this.mostrarAlertaWarning = false;
      this.mostrarErrores = false;
      
      // Emitir evento de guardado exitoso
      this.onSave.emit(response.data || this.empleado);

      // Actualizar la lista de empleados
      this.cargarEmpleados();
      
      // Limpiar el formulario pero mantener el mensaje
      this.limpiarFormulario();
      
      // Ocultar el mensaje de éxito después de 5 segundos
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 5000);
    },
    error: (error) => {
      console.error('Error al guardar Empleado:', error);
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error al guardar el empleado. Por favor, intente nuevamente.';
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


  //Metodo para obtener la lista de sucursales
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

  //Metodo para obtener la lista de estados civiles
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


  //Metodo para obtener la lista de cargos
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

  //Metodo para ordenar la lista de colonias por municipio y departamento
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

  //Metodo para buscar colonias por nombre
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
      );
  };

  //Metodo para obtener la lista de colonias
  direccionExactaInicial: string = '';

  //Metodo para obtener la colonia seleccionada
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

  //Metodo para listar las colonias
  listarColonias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => this.colonia = this.ordenarPorMunicipioYDepartamento(data));
  };

  //Metodo para cargar los empleados
  cargarEmpleados() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Empleado/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.empleados = data; 
      this.empleado.empl_Codigo = this.generarSiguienteCodigo();
    },
    error => {
      console.error('Error al cargar los empleados:', error);
    }
    );
  }
    
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
    
  //Array para almacenar los archivos subidos
  uploadedFiles: any[] = [];
  imageURL: any;

  //Evento para seleccionar el archivo
  onFileSelected(event: any) {
    let file: File;
  
    // Manejar tanto eventos de input como de dropzone
    if (event.target && event.target.files) {
      file = event.target.files[0];
    } else if (Array.isArray(event)) {
      file = event[0];
    } else {
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

    // Previsualización local inmediata (tu lógica original)
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
      this.uploadedFiles = [{ 
        ...file, 
        dataURL: e.target.result, 
        name: file.name, 
        file: file 
      }];
    };
    reader.readAsDataURL(file);
  }

  //Evento para cuando se arrastra el archivo
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  //Evento para cuando se sale del area de arrastre
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  //Evento para remover la imagen
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.onFileSelected(event.dataTransfer.files[0]);
    }
  }

  //Formato de tamaño de archivo
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Método para obtener la URL completa de la imagen para mostrarla
  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
  }
    
  // File Remove
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


  generarSiguienteCodigo(): string {
    // Supón que tienes un array de promociones existentes llamado promociones
    const codigos = this.empleados
      .map(p => p.empl_Codigo)
      .filter(c => /^EMP-\d{5}$/.test(c));
    if (codigos.length === 0) return 'EMP-00001';

    // Ordenamos y tomamos el mayor
    const ultimoCodigo = codigos.sort().pop()!;
    const numero = parseInt(ultimoCodigo.split('-')[1], 10) + 1;
    return `EMP-${numero.toString().padStart(5, '0')}`;
  }


}
