/**
 * Componente para listar y gestionar tipos de vendedores
 * Proporciona funcionalidades de listado, creación, edición, visualización de detalles,
 * eliminación y exportación de datos de tipos de vendedores
 */

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
import { TipoVendedores } from 'src/app/Modelos/general/TipoVendedores.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { ExportService, ExportConfig } from 'src/app/shared/export.service';

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
  styleUrls: ['./list.component.scss'],
  animations: [
    trigger('fadeExpand', [
      transition(':enter', [
        style({
          height: '0',
          opacity: 0,
          transform: 'scaleY(0.90)',
          overflow: 'hidden'
        }),
        animate(
          '300ms ease-out',
          style({
            height: '*',
            opacity: 1,
            transform: 'scaleY(1)',
            overflow: 'hidden'
          })
        )
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate(
          '300ms ease-in',
          style({
            height: '0',
            opacity: 0,
            transform: 'scaleY(0.95)'
          })
        )
      ])
    ])
  ]
})
export class ListComponent implements OnInit {
  // Propiedades de control de UI
  /** Controla la visibilidad del overlay de carga durante las peticiones HTTP */
  mostrarOverlayCarga = false;
  
  /**
   * Método del ciclo de vida de Angular que se ejecuta al inicializar el componente
   * Configura el breadcrumb y carga los permisos del usuario
   */
  ngOnInit(): void {
    // Configuración del breadcrumb para la navegación
    this.breadCrumbItems = [
      { label: 'General' },
      { label: 'Tipo de Vendedores', active: true }
    ];
    // Carga las acciones permitidas para el usuario desde localStorage
    this.cargarAccionesUsuario();
  }
  /** Items del breadcrumb para la navegación */
  breadCrumbItems!: Array<{}>;

  // Propiedades de permisos y acciones
  /** Array de acciones disponibles para el usuario según sus permisos */
  accionesDisponibles: string[] = [];

  /**
   * Valida si una acción específica está permitida para el usuario actual
   * @param accion Nombre de la acción a validar
   * @returns true si la acción está permitida, false en caso contrario
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  /** Índice de la fila con el menú de acciones activo */
  activeActionRow: number | null = null;

  /**
   * Maneja los clics fuera del dropdown de acciones para cerrarlo
   * @param event Evento del mouse
   * @param rowIndex Índice de la fila activa
   */
  onDocumentClick(event: MouseEvent, rowIndex: number) {
    const target = event.target as HTMLElement;
    // Busca el dropdown abierto
    const dropdowns = document.querySelectorAll('.dropdown-action-list');
    let clickedInside = false;
    dropdowns.forEach((dropdown, idx) => {
      if (dropdown.contains(target) && this.activeActionRow === rowIndex) {
        clickedInside = true;
      }
    });
    if (!clickedInside && this.activeActionRow === rowIndex) {
      this.activeActionRow = null;
    }
  }

  /**
   * Carga las acciones disponibles del usuario desde localStorage
   * Lee los permisos del usuario y extrae las acciones permitidas para este módulo
   */
  private cargarAccionesUsuario(): void {
      // Obtiene los permisos almacenados en localStorage
      const permisosRaw = localStorage.getItem('permisosJson');
      let accionesArray: string[] = [];
      if (permisosRaw) {
        try {
          const permisos = JSON.parse(permisosRaw);
          // Buscar el módulo de Tipo de Vendedores
          let modulo = null;
          if (Array.isArray(permisos)) {
            // Buscar por ID de pantalla (ajusta el ID según corresponda)
            modulo = permisos.find((m: any) => m.Pant_Id === 82);
          } else if (typeof permisos === 'object' && permisos !== null) {
            // Si es objeto, buscar por clave
            modulo = permisos['TipoVendedores'] || permisos['tipovendedores'] || null;
          }
          if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
            // Extraer solo el nombre de la acción
            accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
          }
        } catch (e) {
          console.error('Error al parsear permisosJson:', e);
        }
      }
      this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLowerCase());
    }

  /**
   * Abre el formulario de creación de un nuevo tipo de vendedor
   * Cierra otros formularios abiertos (edición y detalles)
   */
  crear(): void {
    if (!this.accionPermitida('crear')) return;
    
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  /**
   * Abre el formulario de edición para un tipo de vendedor específico
   * Cierra otros formularios abiertos (creación y detalles)
   * @param tipoVendedor Objeto con los datos del tipo de vendedor a editar
   */
  editar(tipoVendedor: TipoVendedores): void {
    if (!this.accionPermitida('editar')) return;
    
    this.tipoVendedorEditando = { ...tipoVendedor }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  /**
   * Abre la vista de detalles para un tipo de vendedor específico
   * Cierra otros formularios abiertos (creación y edición)
   * @param tipoVendedor Objeto con los datos del tipo de vendedor a visualizar
   */
  detalles(tipoVendedor: TipoVendedores): void {
    if (!this.accionPermitida('detalle')) return;
    
    this.tipoVendedorDetalle = { ...tipoVendedor }; // Hacer copia profunda
    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  // Propiedades para control de estado de la UI
  /** Controla la visibilidad del botón de editar */
  showEdit = true;
  /** Controla la visibilidad del botón de detalles */
  showDetails = true;
  /** Controla la visibilidad del botón de eliminar */
  showDelete = true;
  /** Controla la visibilidad del formulario de creación */
  showCreateForm = false;
  /** Controla la visibilidad del formulario de edición */
  showEditForm = false;
  /** Controla la visibilidad del formulario de detalles */
  showDetailsForm = false;
  /** Almacena los datos del tipo de vendedor que se está editando */
  tipoVendedorEditando: TipoVendedores | null = null;
  /** Almacena los datos del tipo de vendedor que se está visualizando */
  tipoVendedorDetalle: TipoVendedores | null = null;

  // Propiedades para control de alertas
  /** Controla la visibilidad de la alerta de éxito */
  mostrarAlertaExito = false;
  /** Mensaje que se muestra en la alerta de éxito */
  mensajeExito = '';
  /** Controla la visibilidad de la alerta de error */
  mostrarAlertaError = false;
  /** Mensaje que se muestra en la alerta de error */
  mensajeError = '';
  /** Controla la visibilidad de la alerta de advertencia */
  mostrarAlertaWarning = false;
  /** Mensaje que se muestra en la alerta de advertencia */
  mensajeWarning = '';

  // Propiedades para confirmación de eliminación
  /** Controla la visibilidad del modal de confirmación de eliminación */
  mostrarConfirmacionEliminar = false;
  /** Almacena el tipo de vendedor que se va a eliminar */
  tipoVendedorAEliminar: TipoVendedores | null = null;

  // Propiedades para exportación
  /** Indica si hay una exportación en progreso */
  exportando = false;
  /** Tipo de exportación actual (excel, pdf o csv) */
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  /**
   * Configuración para la exportación de datos
   * Define el título, columnas y nombre del archivo para Excel, PDF y CSV
   */
  private exportConfig = {
    title: 'Listado de Tipo de Vendedores',
    filename: 'TipoVendedores',
    columns: [
      { header: 'No.', key: 'secuencia' },
      { header: 'Tipo de Vendedor', key: 'tiVe_TipoVendedor' }
    ],
    data: [] as any[]
  };

  /**
   * Constructor del componente
   * Inicializa los servicios necesarios y carga los datos iniciales
   * @param table Servicio para gestionar la tabla reactiva
   * @param http Cliente HTTP para peticiones al API
   * @param router Servicio de enrutamiento
   * @param route Ruta activa
   * @param floatingMenuService Servicio para menú flotante
   * @param exportService Servicio para exportación de datos
   */
  constructor(
    public table: ReactiveTableService<TipoVendedores>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargardatos();
  }

  /**
   * Maneja el clic en el menú de acciones de una fila
   * Alterna la visibilidad del menú de acciones
   * @param rowIndex Índice de la fila
   */
  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  /**
   * Cierra el formulario de creación
   */
  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  /**
   * Cierra el formulario de edición y limpia los datos
   */
  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.tipoVendedorEditando = null;
  }

  /**
   * Cierra el formulario de detalles y limpia los datos
   */
  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.tipoVendedorDetalle = null;
  }

  /**
   * Callback ejecutado cuando se guarda exitosamente un tipo de vendedor desde el componente de creación
   * Recarga los datos de la tabla y cierra el formulario
   * @param tipoVendedor Tipo de vendedor guardado
   */
  guardarTipoVendedor(tipoVendedor: TipoVendedores): void {
    // Ocultar la alerta después de 3 segundos
    setTimeout(() => {
      this.mostrarAlertaExito = false;
      this.mensajeExito = '';
    }, 3000);
    
    // Recargar los datos de la tabla
    this.cargardatos();
    this.cerrarFormulario();
  }

  /**
   * Callback ejecutado cuando se actualiza exitosamente un tipo de vendedor desde el componente de edición
   * Recarga los datos de la tabla y cierra el formulario
   * @param tipoVendedor Tipo de vendedor actualizado
   */
  actualizarTipoVendedor(tipoVendedor: TipoVendedores): void {
    // Ocultar la alerta después de 3 segundos
    setTimeout(() => {
      this.mostrarAlertaExito = false;
      this.mensajeExito = '';
    }, 3000);
    
    // Recargar los datos de la tabla
    this.cargardatos();
    this.cerrarFormularioEdicion();
  }

  /**
   * Muestra el modal de confirmación para eliminar un tipo de vendedor
   * @param tipoVendedor Tipo de vendedor a eliminar
   */
  confirmarEliminar(tipoVendedor: TipoVendedores): void {
    this.tipoVendedorAEliminar = tipoVendedor;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  /**
   * Cancela el proceso de eliminación
   * Cierra el modal de confirmación y limpia los datos
   */
  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.tipoVendedorAEliminar = null;
  }

  /**
   * Elimina un tipo de vendedor del sistema
   * Realiza una petición POST al API y maneja diferentes códigos de respuesta
   * Muestra alertas de éxito o error según el resultado
   */
  eliminar(): void {
    if (!this.tipoVendedorAEliminar) return;
    
    this.mostrarOverlayCarga = true;
    
    // Realiza la petición POST al API para eliminar el tipo de vendedor
    this.http.post(`${environment.apiBaseUrl}/TiposDeVendedor/Eliminar/${this.tipoVendedorAEliminar.tiVe_Id}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      // Maneja la respuesta del servidor
      next: (response: any) => {
        // Verificar el código de estado en la respuesta
        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            // Éxito: eliminado correctamente
            this.mensajeExito = `Tipo de vendedor "${this.tipoVendedorAEliminar!.tiVe_TipoVendedor}" eliminado exitosamente`;
            this.mostrarAlertaExito = true;
            
            // Ocultar la alerta después de 3 segundos
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 3000);
            
            this.cargardatos();
            this.cancelarEliminar();
          } else if (response.data.code_Status === -1) {
            // Está siendo utilizado
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'No se puede eliminar: el tipo de vendedor está siendo utilizado.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            this.cancelarEliminar();
          } else if (response.data.code_Status === 0) {
            // Error general
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'Error al eliminar el tipo de vendedor.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            this.cancelarEliminar();
          }
        } else {
          // Respuesta inesperada
          this.mostrarAlertaError = true;
          this.mensajeError = response.message || 'Error inesperado al eliminar el tipo de vendedor.';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          
          this.cancelarEliminar();
        }
      },
      error: (error) => {
        console.error('Error en la petición de eliminación:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error de conexión al intentar eliminar el tipo de vendedor. Por favor, intente nuevamente.';
        
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
        
        this.cancelarEliminar();
      },
      complete: () => {
        this.mostrarOverlayCarga = false;
      }
    });
  }

  /**
   * Cierra todas las alertas activas (éxito, error y advertencia)
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
   * Exporta los datos a formato Excel
   * @returns Promise que se resuelve cuando la exportación finaliza
   */
  exportarExcel(): Promise<void> {
    return this.exportar('excel');
  }

  /**
   * Exporta los datos a formato PDF
   * @returns Promise que se resuelve cuando la exportación finaliza
   */
  exportarPDF(): Promise<void> {
    return this.exportar('pdf');
  }

  /**
   * Exporta los datos a formato CSV
   * @returns Promise que se resuelve cuando la exportación finaliza
   */
  exportarCSV(): Promise<void> {
    return this.exportar('csv');
  }

  /**
   * Verifica si se puede realizar una exportación
   * Valida que no haya una exportación en progreso y que existan datos
   * @param tipo Tipo de exportación (opcional)
   * @returns true si se puede exportar, false en caso contrario
   */
  puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
    if (this.exportando) return false;
    if (!this.table.data$.value || this.table.data$.value.length === 0) return false;
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
   * Exporta los datos de la tabla en el formato especificado
   * Valida los datos, muestra mensajes de progreso y maneja errores
   * @param tipo Formato de exportación: 'excel', 'pdf' o 'csv'
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
   * Crea la configuración de exportación de forma dinámica
   */
  private crearConfiguracionExport(): ExportConfig {
    return {
      title: this.exportConfig.title,
      filename: this.exportConfig.filename,
      data: this.obtenerDatosExport(),
      columns: this.exportConfig.columns
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
      return datos.map((tipoVendedor, index) => ({
        secuencia: tipoVendedor.secuencia,
        tiVe_TipoVendedor: this.limpiarTexto(tipoVendedor.tiVe_TipoVendedor)
      }));
      
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
   * Muestra un mensaje de alerta al usuario
   * @param tipo Tipo de mensaje: 'success', 'error', 'warning' o 'info'
   * @param mensaje Texto del mensaje a mostrar
   */
  private mostrarMensaje(tipo: 'success' | 'error' | 'warning' | 'info', mensaje: string): void {
    this.cerrarAlerta();
    
    const duracion = tipo === 'error' ? 5000 : 3000;
    
    switch (tipo) {
      case 'success':
        this.mostrarAlertaExito = true;
        this.mensajeExito = mensaje;
        break;
      case 'error':
        this.mostrarAlertaError = true;
        this.mensajeError = mensaje;
        break;
      case 'warning':
      case 'info':
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        break;
    }
    
    setTimeout(() => this.cerrarAlerta(), duracion);
  }

  /**
   * Carga los datos de tipos de vendedores desde el API
   * Muestra un overlay de carga durante la petición
   * Actualiza la tabla con los datos recibidos
   */
  private cargardatos(): void {
    this.mostrarOverlayCarga = true;
    this.http.get<TipoVendedores[]>(`${environment.apiBaseUrl}/TiposDeVendedor/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.table.setData(data);
      },
      error: (error) => {
        console.error('Error al cargar los datos:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los datos de los tipos de vendedores. Por favor, intente nuevamente.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      },
      complete: () => {
        this.mostrarOverlayCarga = false;
      }
    });
  }
}
