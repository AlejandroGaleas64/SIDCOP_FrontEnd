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
import { Impuestos } from 'src/app/Modelos/ventas/Impuestos.Model';
import { EditComponent } from '../edit/edit.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

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
    EditComponent,
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
  // ===== CONFIGURACIÓN FÁCIL DE EXPORTACIÓN =====
private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Impuestos',                     // Título del reporte
    filename: 'Impuestos',                             // Nombre base del archivo
    department: 'Ventas',                              // Departamento
    additionalInfo: 'Sistema de Gestión de Ventas',   // Información adicional
    
    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Descripcion', header: 'Descripción', width: 40, align: 'left' as const },
      { key: 'Separador', header: '', width: 5, align: 'center' as const },
      { key: 'Porcentaje', header: 'Porcentaje (%)', width: 10, align: 'right' as const },
    ] as ExportColumn[],
    
    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (impuesto: Impuestos, index: number) => ({
      'No': impuesto?.secuencia || (index + 1),
      'Descripcion': this.limpiarTexto(impuesto?.impu_Descripcion),
      'Separador': '',
      'Porcentaje': impuesto?.impu_Valor ? `${impuesto.impu_Valor}%` : '0%',
    })
  };
  // Breadcrumb items
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario
  accionesDisponibles: string[] = [];

  // Control de menú de acciones
  activeActionRow: number | null = null;

  // Form controls
  showEditForm = false;
  impuestoEditando: Impuestos | null = null;

  // Alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Confirmación eliminar
  mostrarConfirmacionEliminar = false;
  impuestoAEliminar: Impuestos | null = null;

  // Estado de carga y exportación
  mostrarOverlayCarga = false;
  tieneRegistros = false;
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  constructor(
    public table: ReactiveTableService<Impuestos>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargardatos(true);
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Impuestos', active: true }
    ];
    this.cargarAccionesUsuario();
    console.log('Acciones disponibles:', this.accionesDisponibles);
  }

  // ===== MÉTODOS DE EXPORTACIÓN OPTIMIZADOS =====

  /**
   * Método unificado para todas las exportaciones
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
   * Métodos específicos para cada tipo (para usar en templates)
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
   * Verifica si se puede exportar un tipo específico
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
        department: this.exportConfig.department,
        additionalInfo: this.exportConfig.additionalInfo
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
      return datos.map((impuesto, index) => 
        this.exportConfig.dataMapping.call(this, impuesto, index)
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
   * Formatea fechas para exportación
   */
  private formatearFecha(fecha: any): string {
    if (!fecha) return '';
    
    try {
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) return '';
      
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
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

  // ===== MÉTODOS CRUD Y NAVEGACIÓN =====

  /**
   * Valida si una acción está permitida
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  /**
   * Métodos principales de CRUD
   */
  crear(): void {
    this.showEditForm = false;
    this.activeActionRow = null;
    // Nota: Este componente no parece tener formulario de creación
    // Si necesitas implementarlo, agrega aquí la lógica correspondiente
  }

  editar(impuesto: Impuestos): void {
    this.impuestoEditando = { ...impuesto };
    this.showEditForm = true;
    this.activeActionRow = null;
  }

  confirmarEliminar(impuesto: Impuestos): void {
    this.impuestoAEliminar = impuesto;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }

  /**
   * Métodos para cerrar formularios
   */
  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.impuestoEditando = null;
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.impuestoAEliminar = null;
  }

  /**
   * Métodos de respuesta de componentes hijos
   */
  actualizarImpuesto(impuesto: Impuestos): void {
    console.log('Impuesto actualizado exitosamente desde edit component:', impuesto);
    this.cargardatos(false);
    this.cerrarFormularioEdicion();
    this.mostrarMensaje('success', 'Impuesto actualizado exitosamente');
  }

  /**
   * Método de eliminación (si es necesario implementarlo)
   */
  eliminar(): void {
    if (!this.impuestoAEliminar) return;

    this.http.post(`${environment.apiBaseUrl}/Impuestos/Eliminar?id=${this.impuestoAEliminar.impu_Id}`, {}, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        const resultado = this.extraerResultadoSP(response);
        
        if (resultado.code_Status === 1) {
          this.mostrarMensaje('success', resultado.message_Status || 'Impuesto eliminado correctamente.');
          this.cargardatos(false);
          this.cancelarEliminar();
        } else {
          this.mostrarMensaje('error', resultado.message_Status || 'Error al eliminar el impuesto.');
          this.cancelarEliminar();
        }
      },
      error: (error) => {
        console.error('Error al eliminar impuesto:', error);
        this.mostrarMensaje('error', this.obtenerMensajeError(error));
        this.cancelarEliminar();
      }
    });
  }

  /**
   * Control de menú de acciones
   */
  onActionMenuClick(rowIndex: number): void {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  onDocumentClick(event: MouseEvent, rowIndex: number): void {
    const target = event.target as HTMLElement;
    const dropdowns = document.querySelectorAll('.dropdown-action-list');
    let clickedInside = false;
    
    dropdowns.forEach((dropdown) => {
      if (dropdown.contains(target) && this.activeActionRow === rowIndex) {
        clickedInside = true;
      }
    });
    
    if (!clickedInside && this.activeActionRow === rowIndex) {
      this.activeActionRow = null;
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

  // ===== MÉTODOS PRIVADOS DE UTILIDAD =====

  /**
   * Extrae el resultado del stored procedure
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
   * Obtiene mensaje de error apropiado
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
   * Carga las acciones disponibles del usuario
   */
  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        
        if (Array.isArray(permisos)) {
          modulo = permisos.find((m: any) => m.Pant_Id === 37); // Ajusta el ID según corresponda
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Impuestos'] || permisos['impuestos'] || null;
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
    
    console.log('Acciones finales:', this.accionesDisponibles);
  }

  /**
   * Carga los datos desde la API
   */
  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;

    this.http.get<Impuestos[]>(`${environment.apiBaseUrl}/Impuestos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());

        // Agregar numeración secuencial
        datosFiltrados.forEach((impuesto, index) => {
          impuesto.secuencia = index + 1;
        });

        this.table.setData(datosFiltrados);
        this.tieneRegistros = datosFiltrados.length > 0;
      },
      error: (error) => {
        console.error('Error al cargar los datos:', error);
        this.mostrarOverlayCarga = false;
        this.mostrarMensaje('error', 'Error al cargar los datos. Por favor, inténtelo de nuevo más tarde.');
        this.table.setData([]);
        this.tieneRegistros = false;
      },
      complete: () => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
        }, 500);
      }
    });
  }
}