import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Modelo } from 'src/app/Modelos/general/Modelo.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

interface Marca {
  maVe_Id: number;
  maVe_Marca: string;
}

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnInit, OnChanges {
  @Input() modeloData: Modelo | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Modelo>();

  modelo: Modelo = {
    mode_Id: 0,
    maVe_Id: 0,
    maVe_Marca: '',
    mode_Descripcion: '',
    usua_Creacion: 0,
    mode_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    mode_FechaModificacion: new Date(),
    usuarioCreacion: '',
    usuarioModificacion: '',
    code_Status: 0,
    message_Status: '',
    mode_Estado: true
  };

  // Objeto para almacenar los datos originales completos
  modeloOriginal: any = {};

  // Variables de estado
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;
  
  // Cambiamos el nombre para que coincida con el HTML
  marcasVehiculo: Marca[] = [];

  // Objeto para almacenar los cambios detectados
  cambiosDetectados: any = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarMarcas();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modeloData'] && changes['modeloData'].currentValue) {
      this.modelo = { ...changes['modeloData'].currentValue };
       const marcaActual = this.marcasVehiculo.find(m => m.maVe_Id === this.modelo.maVe_Id);
      this.modelo.maVe_Marca = marcaActual ? marcaActual.maVe_Marca : '';
      this.modeloOriginal = { ...changes['modeloData'].currentValue };
      this.mostrarErrores = false;
      this.cerrarAlerta();
      
      // Asegurarnos de que las marcas estén cargadas antes de establecer el valor
      if (this.marcasVehiculo.length === 0) {
        this.cargarMarcas();
      }
    }
  }

  OnMarcaChange(event: any) {
    const selectedId = +event.target.value;
    const marcaSeleccionada = this.marcasVehiculo.find(m => m.maVe_Id === selectedId);
    if (marcaSeleccionada) {
      this.modelo.maVe_Marca = marcaSeleccionada.maVe_Marca;
    } else {
      this.modelo.maVe_Marca = '';
    }
  }

  /**
   * Carga las marcas de vehículos disponibles desde el backend
   * - Realiza petición HTTP GET al endpoint de marcas
   * - Llena el dropdown de marcas para selección
   * - Verifica que la marca actual del modelo exista en la lista
   * - Maneja errores de carga y muestra alertas
   */
  private cargarMarcas(): void {
    this.http.get<Marca[]>(`${environment.apiBaseUrl}/MarcasVehiculos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.marcasVehiculo = data;
        //console.log('Marcas cargadas:', this.marcasVehiculo);
        //console.log('Marca actual del modelo:', this.modelo.maVe_Id);
        
        // Verificar si la marca actual existe en la lista
        const marcaExiste = this.marcasVehiculo.find(marca => marca.maVe_Id === this.modelo.maVe_Id);
        if (!marcaExiste && this.modelo.maVe_Id > 0) {
          console.warn('La marca del modelo no existe en la lista de marcas disponibles');
        }
      },
      error: (error) => {
        console.error('Error al cargar marcas:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar las marcas disponibles';
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
  }

  /**
   * Valida que todos los campos obligatorios estén completos
   * @returns true si todos los campos son válidos, false en caso contrario
   * - Verifica que la descripción no esté vacía
   * - Verifica que se haya seleccionado una marca
   * - Muestra mensajes de error específicos para campos faltantes
   */
  private validarCampos(): boolean {
    const errores: string[] = [];

    if (!this.modelo.mode_Descripcion.trim()) {
      errores.push('Descripción del modelo');
    }

    if (!this.modelo.maVe_Id || this.modelo.maVe_Id === 0) {
      errores.push('Marca de vehículo');
    }

    if (errores.length > 0) {
      this.mensajeWarning = `Por favor corrija los siguientes campos: ${errores.join(', ')}`;
      this.mostrarAlertaWarning = true;
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      return false;
    }

    return true;
  }

  /**
   * Detecta diferencias entre el modelo actual y el original
   * @returns true si hay cambios, false si no hay diferencias
   * - Compara descripción del modelo
   * - Compara marca seleccionada
   * - Almacena los cambios detectados para mostrar al usuario
   */
  hayDiferencias(): boolean {
    const a = this.modelo;
    const b = this.modeloOriginal;
    this.cambiosDetectados = {};

    // Verificar cambio en la descripción del modelo
    if (a.mode_Descripcion.trim() !== b.mode_Descripcion.trim()) {
      this.cambiosDetectados.descripcion = {
        anterior: b.mode_Descripcion || 'Sin descripción',
        nuevo: a.mode_Descripcion.trim(),
        label: 'Descripción del Modelo'
      };
    }

    if (a.maVe_Id !== b.maVe_Id) {
      this.cambiosDetectados.marca = {
        anterior: b.maVe_Marca,
        nuevo: a.maVe_Marca,
        label: 'Marca'
      };
    }
   
    return Object.keys(this.cambiosDetectados).length > 0;
  }

  /**
   * Obtiene la lista de cambios detectados como array
   * @returns Array con los cambios detectados
   * - Convierte el objeto de cambios a formato de lista
   * - Facilita la visualización de cambios en la interfaz
   */
  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  /**
   * Valida los datos antes de proceder con la edición
   * - Verifica que los campos obligatorios estén completos
   * - Detecta si hay cambios respecto a los datos originales
   * - Muestra confirmación si hay cambios válidos
   * - Muestra advertencias si no hay cambios o faltan datos
   */
  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.validarCampos()) {
      if (this.hayDiferencias()) {
        //console.log('Cambios detectados:', this.cambiosDetectados);
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      // El mensaje de error ya se establece en validarCampos()
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  /**
   * Cancela la confirmación de edición
   * - Oculta el modal de confirmación
   */
  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  /**
   * Confirma y procede con la edición
   * - Oculta el modal de confirmación
   * - Ejecuta el proceso de guardado
   */
  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  /**
   * Guarda los cambios del modelo en la base de datos
   * - Realiza validación final antes de guardar
   * - Prepara el objeto con los datos actualizados
   * - Envía petición HTTP PUT al backend
   * - Maneja respuestas de éxito y error
   * - Emite evento de guardado exitoso
   */
  private guardar(): void {
    // Validación final antes de guardar
    if (!this.validarCampos()) {
      return;
    }

    const modeloActualizar = {
      mode_Id: this.modelo.mode_Id,
      maVe_Id: this.modelo.maVe_Id,
      mode_Descripcion: this.modelo.mode_Descripcion.trim(),
      usua_Creacion: this.modelo.usua_Creacion,
      mode_FechaCreacion: this.modelo.mode_FechaCreacion,
      usua_Modificacion: getUserId(),
      mode_FechaModificacion: new Date().toISOString(),
      usuarioCreacion: '',
      usuarioModificacion: '',
      mave_Marca: '',
      mode_Estado: this.modelo.mode_Estado
    };

    this.http.put<any>(`${environment.apiBaseUrl}/Modelo/Actualizar`, modeloActualizar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        this.mensajeExito = `Modelo actualizado exitosamente`;
        this.mostrarAlertaExito = true;
        this.mostrarErrores = false;

        setTimeout(() => {
          this.onSave.emit(this.modelo);
          this.cancelar();
        }, 3000);
      },
      error: (error) => {
        console.error('Error al actualizar modelo:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar el modelo. Por favor, intente nuevamente.';
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
  }

  /**
   * Cancela la edición del modelo
   * - Cierra todas las alertas activas
   * - Emite evento para cerrar el formulario de edición
   */
  cancelar(): void {
    this.cerrarAlerta();
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
}