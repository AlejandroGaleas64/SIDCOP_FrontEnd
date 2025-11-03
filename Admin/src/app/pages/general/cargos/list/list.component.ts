import { Component, OnInit } from '@angular/core';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/export.service';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
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
import { Cargos } from 'src/app/Modelos/general/Cargos.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';

/**
 * Componente para la lista de cargos, incluye funcionalidades de exportación, 
 * edición, eliminación y detalles de cada cargo.
 */
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
  // Animación de entrada/salida para contenedores colapsables
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
  /**
   * Formatea número/secuencia para visualización/exportación.
   * @param valor Número a formatear.
   * @returns Número formateado como string.
   */
  formatearNumero(valor: number): string {
    return valor % 1 === 0 ? valor.toString() : valor.toFixed(2).replace(/\.?0+$/, '');
  }

  // Overlay de carga animado
  mostrarOverlayCarga = false;

  // bread crumb items
  breadCrumbItems!: Array<{}>;

  // Permisos por acción cargados desde localStorage
  accionesDisponibles: string[] = [];
  /**
   * Verifica si una acción específica está permitida según permisos cargados.
   * @param accion Acción a verificar.
   * @returns True si la acción está permitida, false de lo contrario.
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }
  // Configuración de exportación (cabecera, columnas y mapeo de datos)
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Cargos',                    // Título del reporte
    filename: 'Cargos',                           // Nombre base del archivo
    department: 'General',                         // Departamento
    // additionalInfo: 'Sistema de Gestión',         // Información adicional
    
    // Columnas a exportar - Configuradas para Cargos
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Descripcion', header: 'Descripción', width: 40, align: 'left' as const },
      // { key: 'FechaCreacion', header: 'Fecha Creación', width: 25, align: 'center' as const },
      // { key: 'Estado', header: 'Estado', width: 15, align: 'center' as const }
    ] as ExportColumn[],


    // Mapeo de datos para la entidad Cargos
    dataMapping: (cargo: Cargos, index: number) => ({
      'No': this.formatearNumero(cargo?.secuencia || (index + 1)),
      'Descripcion': this.limpiarTexto(cargo?.carg_Descripcion),
      // 'FechaCreacion': cargo?.carg_FechaCreacion ? new Date(cargo.carg_FechaCreacion).toLocaleDateString() : '',
      // 'Estado': cargo?.carg_Estado ? 'Activo' : 'Inactivo'
    })
  };

  // Flags de exportación (estado y tipo en progreso)
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;
  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'General' },
      { label: 'Cargos', active: true }
    ];
    this.cargarAccionesUsuario();
    
  }

  // Id de la pantalla (para resolver permisos por módulo)
  private readonly PANTALLA_CARGOS_ID = 9;

  // Flags de UI para toggling de formularios y acciones de fila
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;
  cargoEditando: Cargos | null = null;
  cargoDetalle: Cargos | null = null;

  // Sistema de alertas en pantalla
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Eliminación con confirmación
  mostrarConfirmacionEliminar = false;
  cargoEliminar: Cargos | null = null;

  // Paginación actual
  page: number = 1;

  constructor(
    public table: ReactiveTableService<Cargos>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private exportService: ExportService,
    // Servicio para menú contextual flotante en la tabla
    public floatingMenuService: FloatingMenuService // <-- Agrega el servicio aquí
    
  ) {
    // Carga inicial y configuración de columnas para la tabla reactiva
    this.cargardatos();
    this.table.setConfig(['secuencia', 'carg_Descripcion']);
  }

  /**
   * Actualiza página y sincroniza con el servicio de tabla.
   * @param nuevaPagina Número de página a mostrar.
   */
  cambiarPagina(nuevaPagina: number): void {
    this.page = nuevaPagina;
    this.table.setPage(nuevaPagina);
  }

  // Toggle formulario de creación
  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
    // Elimina activeActionRow
  }

  /**
   * Abre formulario de edición con el registro seleccionado.
   * @param cargo Cargo a editar.
   */
  editar(cargo: Cargos): void {
    this.cargoEditando = { ...cargo };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
    // Elimina activeActionRow
  }

  /**
   * Orquesta la exportación según tipo solicitado con manejo de estado.
   * @param tipo Tipo de archivo a exportar (excel, pdf, csv).
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
   * Crea la configuración de exportación de forma dinámica.
   * @returns Configuración de exportación.
   */
  private crearConfiguracionExport(): ExportConfig {
    return {
      title: this.exportConfig.title,
      filename: this.exportConfig.filename,
      data: this.obtenerDatosExport(),
      columns: this.exportConfig.columns,
      metadata: {
        department: this.exportConfig.department,
        // additionalInfo: this.exportConfig.additionalInfo
      }
    };
  }

  /**
   * Obtiene y prepara los datos para exportación.
   * @returns Datos preparados para exportación.
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
   * Maneja el resultado de las exportaciones.
   * @param resultado Resultado de la exportación.
   */
  private manejarResultadoExport(resultado: { success: boolean; message: string }): void {
    if (resultado.success) {
      this.mostrarMensaje('success', resultado.message);
    } else {
      this.mostrarMensaje('error', resultado.message);
    }
  }

  /**
   * Valida datos antes de exportar.
   * @returns True si se puede exportar, false de lo contrario.
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
   * Limpia texto para exportación de manera más eficiente.
   * @param texto Texto a limpiar.
   * @returns Texto limpio.
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
   * Sistema de mensajes mejorado con tipos adicionales.
   * @param tipo Tipo de mensaje (success, error, warning, info).
   * @param mensaje Mensaje a mostrar.
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

  /**
   * Métodos específicos para cada tipo (para usar en templates).
   */
  async exportarExcel(): Promise<void> {
    await this.exportar('excel');
  }

  async exportarPDF(): Promise<void> {
    await this.exportar('pdf');
  }

  async exportarCSV(): Promise<void> {
    await this.exportar('csv');
  }

  /**
   * Verifica si se puede exportar un tipo específico.
   * @param tipo Tipo de archivo a exportar.
   * @returns True si se puede exportar, false de lo contrario.
   */
  puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
    if (this.exportando) {
      return tipo ? this.tipoExportacion !== tipo : false;
    }
    return this.table.data$.value?.length > 0;
  }

  /**
   * Abre panel de detalles para el elemento seleccionado.
   * @param cargo Cargo a mostrar detalles.
   */
  detalles(cargo: Cargos): void {
    this.cargoDetalle = { ...cargo };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    // Elimina activeActionRow
  }

  /**
   * Callbacks de cierre para cada formulario embebido.
   */
  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.cargoEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.cargoDetalle = null;
  }

  /**
   * Callbacks de éxito desde child components para recargar data.
   */
  guardarCargo(cargo: Cargos): void {
    this.cargardatos();
    this.cerrarFormulario();
  }

  actualizarCargo(cargo: Cargos): void {
    this.cargardatos();
    this.cerrarFormularioEdicion();
  }

  /**
   * Flujo de eliminación con confirmación modal.
   */
  confirmarEliminar(cargo: Cargos): void {
    this.cargoEliminar = cargo;
    this.mostrarConfirmacionEliminar = true;
    // Elimina activeActionRow
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.cargoEliminar = null;
  }

  /**
   * Llama a API de eliminación (PUT definido por backend) y muestra resultado.
   */
  eliminar(): void {
    if (!this.cargoEliminar) return;
    // Si tu API requiere POST, cambia PUT por POST aquí
    this.http.put(`${environment.apiBaseUrl}/Cargo/Eliminar/${this.cargoEliminar.carg_Id}`, {}, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            this.mensajeExito = `Cargo "${this.cargoEliminar!.carg_Descripcion}" eliminado exitosamente`;
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 3000);
            this.cargardatos();
            this.cancelarEliminar();
          } else if (response.data.code_Status === -1) {
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'No se puede eliminar: el cargo, está siendo utilizado.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            this.cancelarEliminar();
          } else if (response.data.code_Status === 0) {
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'Error al eliminar el cargo.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            this.cancelarEliminar();
          }
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response.message || 'Error inesperado al eliminar el cargo.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          this.cancelarEliminar();
        }
      },
    });
  }

  /**
   * Resetea todas las alertas visibles.
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
   * Carga datos desde API, filtra por permiso y los inyecta al servicio de tabla.
   */
  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    try {
      if (!permisosRaw) return;
      const permisos = JSON.parse(permisosRaw);
      let modulo = null;
      if (Array.isArray(permisos)) {
        modulo = permisos.find((m: any) => m.Pant_Id === this.PANTALLA_CARGOS_ID);
      } else if (typeof permisos === 'object' && permisos !== null) {
        modulo = permisos['Cargos'] || permisos['cargos'] || null;
      }
      if (modulo && Array.isArray(modulo.Acciones)) {
        this.accionesDisponibles = modulo.Acciones
          .map((a: any) => a.Accion?.trim().toLowerCase())
          .filter((a: string) => !!a);
      }
    } catch (error) {
      this.accionesDisponibles = [];
    }
  }

  /**
   * Carga datos desde API y los inyecta al servicio de tabla.
   */
  private cargardatos(): void {
    this.mostrarOverlayCarga = true;
    this.http.get<Cargos[]>(`${environment.apiBaseUrl}/Cargo/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: data => {
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());

        this.table.setData(datosFiltrados);
        this.mostrarOverlayCarga = false;
      },
      error: error => {
        console.error('Error al cargar roles:', error);
        this.table.setData([]);
        this.mostrarOverlayCarga = false;
      }
    });
  }
}