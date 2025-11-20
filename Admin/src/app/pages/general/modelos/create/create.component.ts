import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Modelo } from 'src/app/Modelos/general/Modelo.Model';

// Interfaz para las marcas
interface Marca {
  maVe_Id: number;
  maVe_Marca: string;
}

// Interfaz para la respuesta del API
interface ApiResponse {
  code: number;
  success: boolean;
  message: string;
  data: {
    code_Status: number;
    message_Status: string;
    data?: any;
    tras_Id?: number;
  };
}

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent implements OnInit {
  
  // Eventos para comunicación con el componente padre
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Modelo>();

  // Modelo para el formulario
  modelo: Modelo = new Modelo({
    mode_Id: 0,
    maVe_Id: 0,
    maVe_Marca: '',
    mode_Descripcion: '',
    usua_Creacion: 0,
    usuarioCreacion: '',
    usuarioModificacion: '',
    mode_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    mode_FechaModificacion: new Date(),
    mode_Estado: true,
    code_Status: 0,
    message_Status: ''
  });

  // Lista de marcas para el select
  marcas: Marca[] = [];

  // Control de validaciones
  mostrarErrores = false;

  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarMarcas();
  }

  /**
   * Carga las marcas de vehículos disponibles desde el backend
   */
  private cargarMarcas(): void {
    this.http.get<Marca[]>(`${environment.apiBaseUrl}/MarcasVehiculos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.marcas = data;
      },
      error: (error) => {
        console.error('Error al cargar marcas:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar las marcas disponibles';
        
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }

  /**
   * Maneja el cambio de selección en el dropdown de marcas
   */
  onMarcaChange(): void {
    const marcaSeleccionada = this.marcas.find(m => m.maVe_Id === this.modelo.maVe_Id);
    if (marcaSeleccionada) {
      this.modelo.maVe_Marca = marcaSeleccionada.maVe_Marca;
    }
  }

  /**
   * Reinicia el modelo a sus valores por defecto
   */
  private resetearModelo(): void {
    this.modelo = new Modelo({
      mode_Id: 0,
      maVe_Id: 0,
      maVe_Marca: '',
      mode_Descripcion: '',
      usua_Creacion: 0,
      usuarioCreacion: '',
      usuarioModificacion: '',
      mode_FechaCreacion: new Date(),
      usua_Modificacion: undefined,
      mode_FechaModificacion: undefined,
      mode_Estado: true,
      code_Status: 0,
      message_Status: ''
    });
  }

  /**
   * Cancela la creación del modelo y limpia el formulario
   */
  cancelar(): void {
    this.mostrarErrores = false;
    this.cerrarAlerta();
    this.resetearModelo();
    this.onCancel.emit();
  }

  /**
   * Cierra todas las alertas de notificación
   */
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  /**
   * Valida que los campos obligatorios estén completos
   */
  private validarCampos(): boolean {
    return !!(this.modelo.maVe_Id && this.modelo.mode_Descripcion?.trim());
  }

  /**
   * Prepara el objeto modelo para enviar al backend
   */
  private prepararObjetoParaGuardar(): any {
    return {
      mode_Id: 0,
      maVe_Id: Number(this.modelo.maVe_Id),
      mode_Descripcion: this.modelo.mode_Descripcion.trim(),
      usua_Creacion: Number(getUserId()),
      usuarioCreacion: "",
      usuarioModificacion: "",
      mode_FechaCreacion: new Date(),
      usua_Modificacion: null,
      mode_FechaModificacion: null,
      mode_Estado: Boolean(this.modelo.mode_Estado),
      mave_Marca: ''
    };
  }

  /**
   * Guarda un nuevo modelo en la base de datos
   */
  guardar(): void {
    this.mostrarErrores = true;
    
    if (!this.validarCampos()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      return;
    }

    // Limpiar alertas previas
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaExito = false;
    
    const modeloAGuardar = this.prepararObjetoParaGuardar();
   
    this.http.post<ApiResponse>(`${environment.apiBaseUrl}/Modelo/Insertar`, modeloAGuardar, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        // Verificar que la respuesta tenga la estructura esperada
        if (!response || !response.data) {
          console.error('Respuesta sin estructura data:', response);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error: Respuesta inesperada del servidor';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          return;
        }

        const codeStatus = response.data.code_Status;
        const messageStatus = response.data.message_Status;
        
        // Manejo según code_Status
        if (codeStatus === -1) {
          // Caso de duplicado
          this.mostrarAlertaWarning = true;
          this.mensajeWarning = 'Ya existe un modelo con ese nombre. Por favor ingrese un nombre diferente.';
          this.mostrarAlertaError = false;
          this.mostrarAlertaExito = false;
          
          setTimeout(() => {
            this.mostrarAlertaWarning = false;
            this.mensajeWarning = '';
          }, 5000);
        } 
        else if (codeStatus === 0) {
          // Caso de error general
          this.mostrarAlertaError = true;
          this.mensajeError = messageStatus || 'Error al guardar el modelo.';
          this.mostrarAlertaExito = false;
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        } 
        else if (codeStatus === 1) {
          // Caso de éxito
          this.mensajeExito = `Modelo "${this.modelo.mode_Descripcion}" guardado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          
          // Actualizar el modelo con los datos de respuesta si existen
          if (response.data.data && response.data.data.mode_Id) {
            this.modelo.mode_Id = response.data.data.mode_Id;
          }
          
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.modelo);
            this.cancelar();
          }, 3000);
        } 
        else {
          // code_Status desconocido
          this.mostrarAlertaError = true;
          this.mensajeError = messageStatus || 'Respuesta inesperada del servidor';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      },
      error: (error) => {
        console.error('Error al guardar modelo:', error);
        
        this.mostrarAlertaError = true;
        
        // Intentar obtener el mensaje del error del backend
        if (error.error && error.error.data && error.error.data.message_Status) {
          this.mensajeError = error.error.data.message_Status;
        } else if (error.error && error.error.message) {
          this.mensajeError = error.error.message;
        } else if (error.message) {
          this.mensajeError = error.message;
        } else {
          this.mensajeError = `Error al guardar el modelo: ${error.status || 'Error de conexión'}`;
        }
        
        this.mostrarAlertaExito = false;
        
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }
}