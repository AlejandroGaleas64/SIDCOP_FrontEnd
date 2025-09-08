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

  sucursales: any[] = [];
  estadosCiviles: any[] = [];

  cargos: any[] = [];
  colonia: any[] = [];
  empleados: any[] = [];
  @Output() onCancel = new EventEmitter<void>();
    @Output() onSave = new EventEmitter<Empleado>();
    
    mostrarErrores = false;
    mostrarAlertaExito = false;
    mensajeExito = '';
    mostrarAlertaError = false;
    mensajeError = '';
    mostrarAlertaWarning = false;
    mensajeWarning = '';

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
  
    cancelar(): void {
      // Limpiar alertas
      this.mostrarErrores = false;
      this.mostrarAlertaExito = false;
      this.mensajeExito = '';
      this.mostrarAlertaError = false;
      this.mensajeError = '';
      this.mostrarAlertaWarning = false;
      this.mensajeWarning = '';

      // Limpiar imagen
      this.uploadedFiles = [];
      this.selectedFile = null;
    this.imagePreview = null;
    this.isDragOver = false;

      // Recargar lista de empleados para obtener el código actualizado
      this.cargarEmpleados();

      // Reiniciar el empleado con valores por defecto
      this.empleado = {
        empl_Id: 0,
        empl_DNI: '',
        empl_Codigo: '',
        empl_Nombres: '',
        empl_Apellidos: '',
        empl_Sexo: 'M', // Mantener el valor por defecto 'M'
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

      // Emitir evento de cancelar solo si se llamó desde el botón de cancelar
      if (!this.mostrarAlertaExito) {
        this.onCancel.emit();
      }
    }
  
    cerrarAlerta(): void {
      this.mostrarAlertaExito = false;
      this.mensajeExito = '';
      this.mostrarAlertaError = false;
      this.mensajeError = '';
      this.mostrarAlertaWarning = false;
      this.mensajeWarning = '';
    }
  
    async guardar(): Promise<void> {

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
      this.mostrarErrores = true;

      
        
      if (this.empleado.empl_DNI.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;

      const dni = this.empleado.empl_DNI.trim();
      const dniMask = dni.length === 15 ? dni.slice(0, 4) + '-' + dni.slice(4, 8) + '-' + dni.slice(8, 15) : dni;

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
      
      console.log('Datos a enviar al backend:', empleadoGuardar);
      console.log('URL de la imagen (empl_Imagen):', empleadoGuardar.empl_Imagen);
        
      this.http.post<any>(`${environment.apiBaseUrl}/Empleado/Insertar`, empleadoGuardar, {
      headers: { 
      'X-Api-Key': environment.apiKey,
      'Content-Type': 'application/json',
      'accept': '*/*'
      }
      }).subscribe({
      next: (response) => {
      console.log('Empleado guardado exitosamente:', response);
      this.mensajeExito = `Empleado "${this.empleado.empl_Nombres}" guardado exitosamente`;
      this.mostrarAlertaExito = true;
      this.mostrarErrores = false;
        
      this.onSave.emit(this.empleado);

      // Actualizar la lista de empleados y limpiar el formulario
      this.cargarEmpleados();
      this.cancelar();

      setTimeout(() => {
        this.mostrarAlertaExito = false;
      }, 3000);
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


    //Selects
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
    
    uploadedFiles: any[] = [];
    
    // File Upload
    imageURL: any;

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

    onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.onFileSelected(event.dataTransfer.files[0]);
    }
  }

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

  // Ordena y toma el mayor
  const ultimoCodigo = codigos.sort().pop()!;
  const numero = parseInt(ultimoCodigo.split('-')[1], 10) + 1;
  return `EMP-${numero.toString().padStart(5, '0')}`;
}


}
