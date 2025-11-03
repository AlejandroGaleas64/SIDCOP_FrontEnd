import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { Modelo } from 'src/app/Modelos/general/Modelo.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';

// Importar el servicio de exportación optimizado
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/export.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BreadcrumbsComponent,
    TableModule,
    PaginationModule,
    CreateComponent,
    EditComponent,
    DetailsComponent
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  // ===== CONFIGURACIÓN FÁCIL DE EXPORTACIÓN =====
  // 🔧 PERSONALIZA AQUÍ TU CONFIGURACIÓN DE EXPORTACIÓN 🔧
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Modelos',                    // Título del reporte
    filename: 'Modelos',                           // Nombre base del archivo
    
    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Marca', header: 'Marca', width: 25, align: 'left' as const },
      { key: 'Descripción', header: 'Descripción', width: 50, align: 'left' as const }
    ] as ExportColumn[],
    
    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (modelo: Modelo, index: number) => ({
      'No': modelo?.No || (index + 1),
      'Marca': this.limpiarTexto(modelo?.maVe_Marca),
      'Descripción': this.limpiarTexto(modelo?.mode_Descripcion)
      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(modelo?.campo),
    })
  };

  // Breadcrumb items
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario
  accionesDisponibles: string[] = [];

  // Form controls
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;
  modeloEditando: Modelo | null = null;
  modeloDetalle: Modelo | null = null;

  // Alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Confirmación eliminar
  mostrarConfirmacionEliminar = false;
  modeloAEliminar: Modelo | null = null;

  // Estado de exportación
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  constructor(
    public table: ReactiveTableService<Modelo>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargarDatos();
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'General' },
      { label: 'Modelos', active: true }
    ];
    this.cargarAccionesUsuario();
  }

  // ===== MÉTODOS DE EXPORTACIÓN OPTIMIZADOS =====

  /**
   * Método unificado para exportar datos de modelos a diferentes formatos
   * @param tipo - Tipo de exportación: 'excel', 'pdf' o 'csv'
   * - Valida que no haya otra exportación en progreso
   * - Verifica que existan datos para exportar
   * - Ejecuta la exportación según el tipo seleccionado
   * - Maneja errores y muestra mensajes al usuario
   */
  async exportar(tipo: 'excel' | 'pdf' | 'csv'): Promise<void> {
    if (this.exportando) {
      this.mostrarMensaje('warning', 'Ya hay una exportación en progreso...');
      return;
    }

    if (!this.validarDatosParaExport()) {
      return;
    }

    try {
      this.exportando = true;
      this.tipoExportacion = tipo;
      this.mostrarMensaje('info', `Generando archivo ${tipo.toUpperCase()}...`);
      
      const config = this.crearConfiguracionExport();
      let resultado;
      
      switch (tipo) {
        case 'excel':
          resultado = await this.exportService.exportToExcel(config);
          break;
        case 'pdf':
          resultado = await this.exportService.exportToPDF(config);
          break;
        case 'csv':
          resultado = await this.exportService.exportToCSV(config);
          break;
      }
      
      this.manejarResultadoExport(resultado);
      
    } catch (error) {
      console.error(`Error en exportación ${tipo}:`, error);
      this.mostrarMensaje('error', `Error al exportar archivo ${tipo.toUpperCase()}`);
    } finally {
      this.exportando = false;
      this.tipoExportacion = null;
    }
  }

  /**
   * Exporta los datos de modelos a formato Excel (.xlsx)
   * Método específico que utiliza la función exportar general
   */
  async exportarExcel(): Promise<void> {
    await this.exportar('excel');
  }

  /**
   * Exporta los datos de modelos a formato PDF
   * Método específico que utiliza la función exportar general
   */
  async exportarPDF(): Promise<void> {
    await this.exportar('pdf');
  }

  /**
   * Exporta los datos de modelos a formato CSV (valores separados por comas)
   * Método específico que utiliza la función exportar general
   */
  async exportarCSV(): Promise<void> {
    await this.exportar('csv');
  }

  /**
   * Verifica si se puede realizar una exportación de modelos
   * @param tipo - Tipo específico de exportación (opcional)
   * @returns true si se puede exportar, false en caso contrario
   * - Verifica que no haya exportación en progreso
   * - Confirma que existan datos en la tabla
   */
  puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
    if (this.exportando) {
      return tipo ? this.tipoExportacion !== tipo : false;
    }
    return this.table.data$.value?.length > 0;
  }

  // ===== MÉTODOS PRIVADOS DE EXPORTACIÓN =====

  /**
   * Crea la configuración de exportación de forma dinámica
   */
  private crearConfiguracionExport(): ExportConfig {
    return {
      title: this.exportConfig.title,
      filename: this.exportConfig.filename,
      data: this.obtenerDatosExport(),
      columns: this.exportConfig.columns,
      metadata: {
      }
    };
  }

  /**
   * Obtiene y prepara los datos para exportación
   */
  private obtenerDatosExport(): any[] {
    try {
      const datos = this.table.data$.value;
      
      if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error('No hay datos disponibles para exportar');
      }
      
      // Usar el mapeo configurado
      return datos.map((modelo, index) => 
        this.exportConfig.dataMapping.call(this, modelo, index)
      );
      
    } catch (error) {
      console.error('Error obteniendo datos:', error);
      throw error;
    }
  }


  /**
   * Maneja el resultado de las exportaciones
   */
  private manejarResultadoExport(resultado: { success: boolean; message: string }): void {
    if (resultado.success) {
      this.mostrarMensaje('success', resultado.message);
    } else {
      this.mostrarMensaje('error', resultado.message);
    }
  }

  /**
   * Valida datos antes de exportar
   */
  private validarDatosParaExport(): boolean {
    const datos = this.table.data$.value;
    
    if (!Array.isArray(datos) || datos.length === 0) {
      this.mostrarMensaje('warning', 'No hay datos disponibles para exportar');
      return false;
    }
    
    if (datos.length > 10000) {
      const continuar = confirm(
        `Hay ${datos.length.toLocaleString()} registros. ` +
        'La exportación puede tomar varios minutos. ¿Desea continuar?'
      );
      if (!continuar) return false;
    }
    
    return true;
  }

  /**
   * Limpia texto para exportación de manera más eficiente
   */
  private limpiarTexto(texto: any): string {
    if (!texto) return '';
    
    return String(texto)
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:()\[\]]/g, '')
      .trim()
      .substring(0, 150);
  }

  /**
   * Sistema de mensajes mejorado con tipos adicionales
   */
  private mostrarMensaje(tipo: 'success' | 'error' | 'warning' | 'info', mensaje: string): void {
    this.cerrarAlerta();
    
    const duracion = tipo === 'error' ? 5000 : 3000;
    
    switch (tipo) {
      case 'success':
        this.mostrarAlertaExito = true;
        this.mensajeExito = mensaje;
        setTimeout(() => this.mostrarAlertaExito = false, duracion);
        break;
        
      case 'error':
        this.mostrarAlertaError = true;
        this.mensajeError = mensaje;
        setTimeout(() => this.mostrarAlertaError = false, duracion);
        break;
        
      case 'warning':
      case 'info':
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        setTimeout(() => this.mostrarAlertaWarning = false, duracion);
        break;
    }
  }
  // ===== MÉTODOS EXISTENTES (SIN CAMBIOS) =====

  /**
   * Valida si una acción específica está permitida para el usuario
   * @param accion - Nombre de la acción a validar
   * @returns true si la acción está permitida, false en caso contrario
   * - Compara con las acciones disponibles del usuario
   * - Normaliza el texto para comparación
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  /**
   * Abre el formulario para crear un nuevo modelo
   * - Alterna la visibilidad del formulario de creación
   * - Cierra otros formularios abiertos (edición, detalles)
   */
  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
  }

  /**
   * Abre el formulario para editar un modelo existente
   * @param modelo - El objeto modelo a editar
   * - Crea una copia del modelo para edición
   * - Muestra el formulario de edición
   * - Cierra otros formularios abiertos
   */
  editar(modelo: Modelo): void {
    this.modeloEditando = { ...modelo };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
  }

  /**
   * Abre la vista de detalles de un modelo
   * @param modelo - El objeto modelo del cual mostrar detalles
   * - Crea una copia del modelo para visualización
   * - Muestra el formulario de detalles
   * - Cierra otros formularios abiertos
   */
  detalles(modelo: Modelo): void {
    this.modeloDetalle = { ...modelo };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
  }

  /**
   * Solicita confirmación para eliminar un modelo
   * @param modelo - El modelo que se desea eliminar
   * - Guarda referencia al modelo a eliminar
   * - Muestra modal de confirmación
   */
  confirmarEliminar(modelo: Modelo): void {
    this.modeloAEliminar = modelo;
    this.mostrarConfirmacionEliminar = true;
  }

  /**
   * Cierra el formulario de creación de modelo
   * - Oculta el formulario de creación
   */
  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  /**
   * Cierra el formulario de edición de modelo
   * - Oculta el formulario de edición
   * - Limpia la referencia al modelo que se estaba editando
   */
  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.modeloEditando = null;
  }

  /**
   * Cierra el formulario de detalles de modelo
   * - Oculta el formulario de detalles
   * - Limpia la referencia al modelo del cual se mostraban detalles
   */
  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.modeloDetalle = null;
  }

  /**
   * Cancela la operación de eliminación
   * - Oculta el modal de confirmación
   * - Limpia la referencia al modelo a eliminar
   */
  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.modeloAEliminar = null;
  }

  /**
   * Maneja el evento de guardado exitoso de un nuevo modelo
   * @param modelo - El modelo que fue guardado
   * - Recarga los datos de la tabla para mostrar el nuevo registro
   * - Cierra el formulario de creación
   * - Muestra mensaje de éxito
   */
  guardarModelo(modelo: Modelo): void {
    this.cargarDatos();
    this.cerrarFormulario();
    this.mostrarMensaje('success', 'Modelo guardado exitosamente');
  }

  /**
   * Maneja el evento de actualización exitosa de un modelo
   * @param modelo - El modelo que fue actualizado
   * - Recarga los datos de la tabla para mostrar los cambios
   * - Cierra el formulario de edición
   * - Muestra mensaje de éxito
   */
  actualizarModelo(modelo: Modelo): void {
    this.cargarDatos();
    this.cerrarFormularioEdicion();
    this.mostrarMensaje('success', 'Modelo actualizado exitosamente');
  }

  /**
   * Ejecuta la eliminación de un modelo
   * - Verifica que exista un modelo seleccionado para eliminar
   * - Envía petición HTTP POST al backend
   * - Maneja diferentes tipos de respuesta (exitosa, error)
   * - Muestra mensajes apropiados según el resultado
   * - Recarga los datos si la eliminación fue exitosa
   */
  eliminar(): void {
    if (!this.modeloAEliminar) return;

    this.http.post(`${environment.apiBaseUrl}/Modelo/Eliminar?id=${this.modeloAEliminar.mode_Id}`, {}, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        const resultado = this.extraerResultadoSP(response);
        
        if (resultado.code_Status === 1) {
          this.mostrarMensaje('success', resultado.message_Status || 'Modelo eliminado correctamente.');
          this.cargarDatos();
          this.cancelarEliminar();
        } else {
          this.mostrarMensaje('error', resultado.message_Status || 'Error al eliminar el modelo.');
          this.cancelarEliminar();
        }
      },
      error: (error) => {
        console.error('Error al eliminar modelo:', error);
        this.mostrarMensaje('error', this.obtenerMensajeError(error));
        this.cancelarEliminar();
      }
    });
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
   * Extrae el resultado de un procedimiento almacenado
   * @param response - Respuesta del servidor
   * @returns Objeto con el resultado extraído
   * - Maneja diferentes formatos de respuesta del backend
   * - Normaliza la estructura de datos
   */
  private extraerResultadoSP(response: any): any {
    if (response.data && typeof response.data === 'object') {
      return response.data;
    } else if (Array.isArray(response) && response.length > 0) {
      return response[0];
    }
    return response;
  }

  /**
   * Obtiene un mensaje de error amigable basado en el código de estado HTTP
   * @param error - Objeto de error de la petición HTTP
   * @returns Mensaje de error descriptivo para el usuario
   * - Traduce códigos de estado HTTP a mensajes comprensibles
   * - Proporciona mensajes genéricos para errores desconocidos
   */
  private obtenerMensajeError(error: any): string {
    if (error.status === 404) return 'El endpoint no fue encontrado.';
    if (error.status === 401) return 'No autorizado. Verifica tu API Key.';
    if (error.status === 400) return 'Petición incorrecta.';
    if (error.status === 500) return 'Error interno del servidor.';
    if (error.error?.message) return error.error.message;
    return 'Error de comunicación con el servidor.';
  }

  /**
   * Carga las acciones disponibles para el usuario desde localStorage
   * - Obtiene los permisos del usuario desde localStorage
   * - Busca el módulo de Modelos por ID de pantalla
   * - Extrae las acciones permitidas para este módulo
   * - Normaliza los nombres de las acciones
   */
  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        
        if (Array.isArray(permisos)) {
          modulo = permisos.find((m: any) => m.Pant_Id === 15);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Modelos'] || permisos['modelos'] || null;
        }
        
        if (modulo?.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones
            .map((a: any) => a.Accion)
            .filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
        console.error('Error al parsear permisosJson:', e);
      }
    }
    
    this.accionesDisponibles = accionesArray
      .filter(a => typeof a === 'string' && a.length > 0)
      .map(a => a.trim().toLowerCase());
  }

  /**
   * Carga los datos de modelos desde el backend
   * - Realiza petición HTTP GET al endpoint de listado
   * - Asigna números secuenciales a cada modelo
   * - Actualiza la tabla con los datos obtenidos
   * - Se ejecuta al inicializar el componente y después de operaciones CRUD
   */
  private cargarDatos(): void {
    this.http.get<Modelo[]>(`${environment.apiBaseUrl}/Modelo/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      console.log('Datos recargados:', data);

      data.forEach((modelo, index) => {
        modelo.No = index + 1;
      });

      this.table.setData(data);
    });
  }
}