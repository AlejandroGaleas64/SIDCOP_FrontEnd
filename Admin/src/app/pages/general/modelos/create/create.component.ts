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
   * - Realiza petición HTTP GET al endpoint de marcas
   * - Llena el dropdown de marcas para selección
   * - Maneja errores de carga y muestra alertas
   */
  private cargarMarcas(): void {
    this.http.get<Marca[]>(`${environment.apiBaseUrl}/MarcasVehiculos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.marcas = data;
        //console.log('Marcas cargadas:', this.marcas);
      },
      error: (error) => {
        console.error('Error al cargar marcas:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar las marcas disponibles';
        
        // Ocultar la alerta de error después de 5 segundos
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }

  /**
   * Maneja el cambio de selección en el dropdown de marcas
   * - Busca la marca seleccionada por su ID
   * - Actualiza el nombre de la marca en el modelo
   * - Sincroniza los datos de marca seleccionada
   */
  onMarcaChange(): void {
    const marcaSeleccionada = this.marcas.find(m => m.maVe_Id === this.modelo.maVe_Id);
    if (marcaSeleccionada) {
      this.modelo.maVe_Marca = marcaSeleccionada.maVe_Marca;
    }
  }

  /**
   * Reinicia el modelo a sus valores por defecto
   * - Limpia todos los campos del formulario
   * - Establece valores iniciales para nuevo modelo
   * - Prepara el formulario para una nueva entrada
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
   * - Oculta los errores de validación
   * - Cierra todas las alertas activas
   * - Reinicia el modelo a valores por defecto
   * - Emite evento para cerrar el formulario
   */
  cancelar(): void {
    this.mostrarErrores = false;
    this.cerrarAlerta();
    this.resetearModelo();
    this.onCancel.emit();
  }

  /**
   * Cierra todas las alertas de notificación
   * - Oculta alertas de éxito, error y advertencia
   * - Limpia todos los mensajes de alerta
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
   * @returns true si todos los campos requeridos están llenos, false en caso contrario
   * - Verifica que se haya seleccionado una marca
   * - Verifica que la descripción no esté vacía
   */
  private validarCampos(): boolean {
    return !!(this.modelo.maVe_Id && this.modelo.mode_Descripcion?.trim());
  }

  /**
   * Prepara el objeto modelo para enviar al backend
   * @returns Objeto formateado con los datos del modelo
   * - Convierte tipos de datos según requerimientos del API
   * - Establece campos de auditoría (usuario, fechas)
   * - Limpia y formatea los datos de entrada
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
   * - Valida que los campos requeridos estén completos
   * - Prepara el objeto para envío al backend
   * - Envía petición HTTP POST al endpoint de inserción
   * - Maneja respuestas de éxito y error
   * - Muestra mensajes de confirmación al usuario
   */
  guardar(): void {
    this.mostrarErrores = true;
    
    if (!this.validarCampos()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      
      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      return;
    }

    // Limpiar alertas previas
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;
    
    const modeloAGuardar = this.prepararObjetoParaGuardar();
   
    this.http.post<any>(`${environment.apiBaseUrl}/Modelo/Insertar`, modeloAGuardar, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        //console.log('Modelo guardado exitosamente:', response);
        this.mensajeExito = `Modelo "${this.modelo.mode_Descripcion}" guardado exitosamente`;
        this.mostrarAlertaExito = true;
        this.mostrarErrores = false;
        
        // Actualizar el modelo con los datos de respuesta si es necesario
        if (response && response.mode_Id) {
          this.modelo.mode_Id = response.mode_Id;
        }
        
        // Ocultar la alerta después de 3 segundos
        setTimeout(() => {
          this.mostrarAlertaExito = false;
          this.onSave.emit(this.modelo);
          this.cancelar();
        }, 3000);
      },
      error: (error) => {
        console.error('Error al guardar modelo:', error);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        console.error('Status:', error.status);
        console.error('StatusText:', error.statusText);
        console.error('Error body:', error.error);
        
        this.mostrarAlertaError = true;
        this.mensajeError = `Error al guardar el modelo: ${error.status} - ${error.statusText}`;
        this.mostrarAlertaExito = false;
        
        // Ocultar la alerta de error después de 5 segundos
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }
}