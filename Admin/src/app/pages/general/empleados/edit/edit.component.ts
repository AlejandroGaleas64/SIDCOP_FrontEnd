import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
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
export class EditComponent implements OnChanges {
  @Input() empleadoData: Empleado | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Empleado>();

  sucursales: any[] = [];
  estadosCiviles: any[] = [];
  cargos: any[] = [];
  colonias: any[] = [];
  colonia: any[] = [];

  ngOnInit(): void {
    if (this.empleadoData) {
      this.empleado = { ...this.empleadoData };
      this.empleadoOriginal = this.empleado.empl_Apellidos || '';
      // Recargar imagen si existe
      if (this.empleado.empl_Imagen) {
        this.uploadedFiles = [this.empleado.empl_Imagen];
      } else {
        this.uploadedFiles = [];
      }
    }

      this.obtenerSucursales();
      this.obtenerEstadosCiviles();
      this.obtenerCargos();
      this.listarColonias();
  }

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

  empleadoOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) {}

  get fechaInicioFormato(): string {
    return new Date(this.empleado.empl_FechaNacimiento).toISOString().split('T')[0];
  }

  set fechaInicioFormato(value: string) {
    this.empleado.empl_FechaNacimiento = new Date(value);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['empleadoData'] && changes['empleadoData'].currentValue) {
      this.empleado = { ...changes['empleadoData'].currentValue };
      this.empleadoOriginal = this.empleado.empl_Apellidos || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
      // Recargar imagen si existe
      if (this.empleado.empl_Imagen) {
        this.uploadedFiles = [this.empleado.empl_Imagen];
      } else {
        this.uploadedFiles = [];
      }
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

  private validarFormatoDNI(dni: string): boolean {
    const formatoDNI = /^\d{4}-\d{4}-\d{5}$/;
    return formatoDNI.test(dni);
  }

  validarEdicion(): void {
    this.mostrarErrores = true;

    // Validar formato del DNI
    if (!this.validarFormatoDNI(this.empleado.empl_DNI)) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'El DNI debe tener el formato 0000-0000-00000';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    // Compara todos los campos relevantes
    const original = this.empleadoData;
    const actual = this.empleado;

    // Verificar si hay cambios en la imagen
    const imagenHaCambiado = this.uploadedFiles.length > 0 && this.uploadedFiles[0].file !== undefined;

    const haCambiado =
      imagenHaCambiado || // Incluir cambios en la imagen
      (original?.empl_DNI?.trim() || '') !== (actual.empl_DNI?.trim() || '') ||
      (original?.empl_Codigo?.trim() || '') !== (actual.empl_Codigo?.trim() || '') ||
      (original?.empl_Nombres?.trim() || '') !== (actual.empl_Nombres?.trim() || '') ||
      (original?.empl_Apellidos?.trim() || '') !== (actual.empl_Apellidos?.trim() || '') ||
      (original?.empl_Sexo?.trim() || '') !== (actual.empl_Sexo?.trim() || '') ||
      (original?.empl_FechaNacimiento || '') !== (actual.empl_FechaNacimiento || '') ||
      (original?.empl_Correo?.trim() || '') !== (actual.empl_Correo?.trim() || '') ||
      (original?.empl_Telefono?.trim() || '') !== (actual.empl_Telefono?.trim() || '') ||
      (original?.sucu_Id || 0) !== (actual.sucu_Id || 0) ||
      (original?.esCv_Id || 0) !== (actual.esCv_Id || 0) ||
      (original?.carg_Id || 0) !== (actual.carg_Id || 0) ||
      (original?.colo_Id || 0) !== (actual.colo_Id || 0) ||
      (original?.empl_DireccionExacta?.trim() || '') !== (actual.empl_DireccionExacta?.trim() || '') ||
      (original?.empl_Imagen || '') !== (actual.empl_Imagen || '');

    // Valida campos requeridos
    const tieneImagen = this.uploadedFiles.length > 0 || actual.empl_Imagen;
    const camposRequeridos = [
      actual.empl_DNI,
      actual.empl_Codigo,
      actual.empl_Nombres,
      actual.empl_Apellidos,
      actual.empl_Sexo,
      actual.empl_FechaNacimiento,
      actual.empl_Correo,
      actual.empl_Telefono,
      actual.sucu_Id,
      actual.esCv_Id,
      actual.carg_Id,
      actual.colo_Id,
      actual.empl_DireccionExacta
    ];

    // Verifica si todos los campos están llenos y si hay una imagen
    const todosLlenos = camposRequeridos.every(c => c && c.toString().trim() !== '') && tieneImagen;

    if (!tieneImagen) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La imagen del empleado es obligatoria.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    if (todosLlenos) {
      if (haCambiado) {
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
        usua_Modificacion: 1,
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
          }, 3000);
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

    

      // Método para obtener la URL completa de la imagen para mostrarla
      getImageDisplayUrl(imagePath: string): string {
        return this.imageUploadService.getImageUrl(imagePath);
      }
    
      // File Remove
      removeFile(event: any) {
        this.uploadedFiles.splice(this.uploadedFiles.indexOf(event), 1);
      }

      
}
