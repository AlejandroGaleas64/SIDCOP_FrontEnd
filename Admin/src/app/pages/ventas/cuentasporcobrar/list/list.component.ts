import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { CuentasPorCobrarService } from 'src/app/servicios/ventas/cuentas-por-cobrar.service';
import { CuentasPorCobrarDataService } from 'src/app/servicios/ventas/cuentas-por-cobrar-data.service';
import { ExportService, ExportConfig } from 'src/app/shared/export.service';

interface AlertaConfig {
  tipo: 'exito' | 'error' | 'warning';
  mensaje: string;
  duracion?: number;
}

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BreadcrumbsComponent,
    TableModule,
    PaginationModule
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  // Subject para manejar las suscripciones
  private destroy$ = new Subject<void>();
  
  // Bread crumb items
  breadCrumbItems: Array<{}> = [];
  activeTab: number = 1;
  // Acciones disponibles para el usuario en esta pantalla
  accionesDisponibles: string[] = [];

  // Variables para resumen de antigüedad
  resumenAntiguedad: any[] = [];
  resumenAntiguedadFiltrado: any[] = [];
  resumenSearchTerm: string = '';
  resumenSortField: string = '';
  resumenSortDirection: 'asc' | 'desc' = 'asc';

  // Variables para acciones de fila
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showPayment = true;
  
  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  cuentaPorCobrarAEliminar: CuentaPorCobrar | null = null;
  
  // Propiedad para mostrar overlay de carga
  mostrarOverlayCarga = false;

  // Propiedades para exportación de la tabla principal
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  // Propiedades para exportación de la tabla de resumen
  exportandoResumen = false;
  tipoExportacionResumen: 'excel' | 'pdf' | 'csv' | null = null;

  constructor(
    public table: ReactiveTableService<CuentaPorCobrar>, 
    private router: Router, 
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private cuentasPorCobrarDataService: CuentasPorCobrarDataService,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.cargarAccionesUsuario();
    this.cargardatos();
  }

  ngOnDestroy(): void {
    // Completar el subject para cancelar todas las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
    
    // Limpiar todos los timeouts pendientes
  }

  // MÉTODO PARA VALIDAR SI UNA ACCIÓN ESTÁ PERMITIDA
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => 
      a.trim().toLowerCase() === accion.trim().toLowerCase()
    );
  }

  private initializeBreadcrumbs(): void {
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Cuentas por Cobrar', active: true }
    ];
  }

  // Método centralizado para mostrar alertas
  private mostrarAlerta(config: AlertaConfig): void {
    const { tipo, mensaje, duracion = tipo === 'exito' ? 3000 : 5000 } = config;
    
    // Cerrar alertas previas
    this.cerrarAlerta();
    
    switch (tipo) {
      case 'exito':
        this.mostrarAlertaExito = true;
        this.mensajeExito = mensaje;
        break;
      case 'error':
        this.mostrarAlertaError = true;
        this.mensajeError = mensaje;
        break;
      case 'warning':
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        break;
    }

    // Programar cierre automático
    const timeoutId = setTimeout(() => {
      this.cerrarAlerta();
    }, duracion);
    

  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  confirmarEliminar(cuentaPorCobrar: CuentaPorCobrar): void {
    this.cuentaPorCobrarAEliminar = cuentaPorCobrar;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.cuentaPorCobrarAEliminar = null;
  }

  eliminar(): void {
    if (!this.cuentaPorCobrarAEliminar?.cpCo_Id) {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: 'No se puede eliminar: datos inválidos.'
      });
      return;
    }
    
    this.cuentasPorCobrarService
      .eliminarCuentaPorCobrar(this.cuentaPorCobrarAEliminar.cpCo_Id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.procesarRespuestaEliminacion(response);
        },
        error: (error) => {
          console.error('Error al eliminar:', error);
          this.mostrarAlerta({
            tipo: 'error',
            mensaje: 'Error al comunicarse con el servidor. Por favor, inténtelo de nuevo más tarde.'
          });
          this.cancelarEliminar();
        }
      });
  }

  private procesarRespuestaEliminacion(response: any): void {
    if (!response?.success || !response?.data) {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: response?.message || 'Error inesperado al eliminar la cuenta por cobrar.'
      });
      this.cancelarEliminar();
      return;
    }

    const { code_Status, message_Status } = response.data;

    switch (code_Status) {
      case 1:
        this.mostrarAlerta({
          tipo: 'exito',
          mensaje: 'Cuenta por cobrar eliminada exitosamente'
        });
        this.cargardatos();
        this.cancelarEliminar();
        break;
        
      case -1:
        this.mostrarAlerta({
          tipo: 'error',
          mensaje: message_Status || 'No se puede eliminar: la cuenta por cobrar está siendo utilizada.'
        });
        this.cancelarEliminar();
        break;
        
      case 0:
      default:
        this.mostrarAlerta({
          tipo: 'error',
          mensaje: message_Status || 'Error al eliminar la cuenta por cobrar.'
        });
        this.cancelarEliminar();
        break;
    }
  }

  private cargarAccionesUsuario(): void {
    try {
      const permisosRaw = localStorage.getItem('permisosJson');
      if (!permisosRaw) {
        this.accionesDisponibles = [];
        return;
      }

      const permisos = JSON.parse(permisosRaw);
      const modulo = this.encontrarModuloCuentasPorCobrar(permisos);
      
      if (modulo?.Acciones && Array.isArray(modulo.Acciones)) {
        this.accionesDisponibles = modulo.Acciones
          .map((a: any) => a.Accion)
          .filter((a: any) => typeof a === 'string' && a.length > 0)
          .map((a: string) => a.trim().toLowerCase());
      } else {
        this.accionesDisponibles = [];
      }
    } catch (error) {
      console.error('Error al cargar acciones del usuario:', error);
      this.accionesDisponibles = [];
    }
  }

  private encontrarModuloCuentasPorCobrar(permisos: any): any {
    if (Array.isArray(permisos)) {
      return permisos.find((m: any) => 
        m.Pant_Id === 34 || 
        (m.Nombre && m.Nombre.toLowerCase().includes('cuentas por cobrar'))
      );
    } else if (typeof permisos === 'object' && permisos !== null) {
      return permisos['Cuentas por Cobrar'] || 
             permisos['cuentas por cobrar'] || 
             Object.values(permisos).find((m: any) => 
               m?.Nombre && m.Nombre.toLowerCase().includes('cuentas por cobrar')
             );
    }
    return null;
  }

  // Métodos para navegación desde el menú flotante
  irAEditar(id: number): void {
    if (id && this.accionPermitida('editar')) {
      this.router.navigate(['/ventas/cuentasporcobrar/edit', id]);
      this.floatingMenuService.close();
    }
  }

irADetalles(id: number): void {
    // Buscar el cliente en los datos cargados
    const clienteTabla = this.cuentasPorCobrarDataService.buscarClientePorId(id);
    const clienteResumen = this.cuentasPorCobrarDataService.buscarClienteEnResumenPorId(id);
    
    // Guardar el cliente seleccionado en el servicio compartido
    if (clienteTabla) {
      this.cuentasPorCobrarDataService.setClienteSeleccionado(clienteTabla);
    } else if (clienteResumen) {
      this.cuentasPorCobrarDataService.setClienteSeleccionado(clienteResumen);
    }
    
    // Navegar a la página de detalles
    this.router.navigate(['/ventas/cuentasporcobrar/details', id]);
    this.floatingMenuService.close();
  }

  irARegistrarPago(id: number): void {
    if (id && this.accionPermitida('pagar')) {
      this.router.navigate(['/ventas/cuentasporcobrar/payment', id]);
      this.floatingMenuService.close();
    }
  }

  private cargardatos(): void {
    this.mostrarOverlayCarga = true;
    
    const tienePermisoListar = this.accionPermitida('listar');
    const userId = getUserId();

    const cuentasPorCobrar$ = this.cuentasPorCobrarService.obtenerCuentasPorCobrar(true, false);
    const resumenAntiguedad$ = this.cuentasPorCobrarService.obtenerResumenAntiguedad();

    // Usar forkJoin para cargar ambos datos simultáneamente
    forkJoin({
      cuentas: cuentasPorCobrar$,
      resumen: resumenAntiguedad$
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (results) => {
        this.procesarCuentasPorCobrar(results.cuentas, tienePermisoListar, userId);
        this.procesarResumenAntiguedad(results.resumen);
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.mostrarAlerta({
          tipo: 'error',
          mensaje: 'Error al cargar los datos. Por favor, recargue la página.'
        });
      },
      complete: () => {
        this.mostrarOverlayCarga = false;
      }
    });
  }

  private procesarCuentasPorCobrar(response: any, tienePermisoListar: boolean, userId: any): void {
    if (response?.success && response?.data) {
      const data = response.data;

      // Agregar secuencia
      data.forEach((item: CuentaPorCobrar, index: number) => {
        item.secuencia = index + 1;
      });

      const datosFiltrados = tienePermisoListar
        ? data
        : data.filter((item: CuentaPorCobrar) =>
            item.usua_Creacion === userId || 
            item.usua_Creacion?.toString() === userId.toString()
          );

      // Guardar los datos en el servicio compartido
      this.cuentasPorCobrarDataService.setListaCuentasPorCobrar(datosFiltrados);
      
      this.table.setData(datosFiltrados);
    } else {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: 'No se pudieron cargar las cuentas por cobrar correctamente.'
      });
    }
  }

  private procesarResumenAntiguedad(response: any): void {
    if (response?.success && response?.data) {
      const data = response.data;

      data.forEach((item: any, index: number) => {
        item.secuencia = index + 1;
      });

      // Guardar los datos en el servicio compartido
      this.cuentasPorCobrarDataService.setResumenAntiguedad(data);
      
      this.resumenAntiguedad = data;
      this.filtrarResumenAntiguedad();
    } else {
      this.resumenAntiguedad = [];
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'No se pudo cargar el resumen de antigüedad.'
      });
    }
  }

filtrarResumenAntiguedad(): void {
  let data = [...this.resumenAntiguedad];

  if (this.resumenSearchTerm) {
    const term = this.resumenSearchTerm.toLowerCase().trim();
data = data.filter(d => 
  d.cliente?.toLowerCase().includes(term) ||
  d.total?.toString().includes(term) ||
  d._1_30?.toString().includes(term)
);

  }

  this.resumenAntiguedadFiltrado = this.sortDataResumen(data);
}


  sortResumenBy(field: string): void {
    if (!field) return;
    
    if (this.resumenSortField === field) {
      this.resumenSortDirection = this.resumenSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.resumenSortField = field;
      this.resumenSortDirection = 'asc';
    }
    this.resumenAntiguedadFiltrado = this.sortDataResumen(this.resumenAntiguedadFiltrado);
  }

  private sortDataResumen(data: any[]): any[] {
    if (!this.resumenSortField || !data.length) return data;
    
    return data.sort((a, b) => {
      let valA = a[this.resumenSortField];
      let valB = b[this.resumenSortField];
      
      // Manejar valores nulos o undefined
      if (valA == null && valB == null) return 0;
      if (valA == null) return this.resumenSortDirection === 'asc' ? 1 : -1;
      if (valB == null) return this.resumenSortDirection === 'asc' ? -1 : 1;
      
      // Convertir a string solo si es necesario
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.resumenSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.resumenSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  navegar(tabDestino: number) {
    this.activeTab = tabDestino;
  }

  // Métodos para exportación de la tabla principal
  async exportar(tipo: 'excel' | 'pdf' | 'csv'): Promise<void> {
    if (this.exportando) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'Ya hay una exportación en progreso...'
      });
      return;
    }
    if (!this.validarDatosParaExport()) {
      return;
    }
    try {
      this.exportando = true;
      this.tipoExportacion = tipo;
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: `Generando archivo ${tipo.toUpperCase()}...`
      });
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
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: `Error al exportar archivo ${tipo.toUpperCase()}`
      });
    } finally {
      this.exportando = false;
      this.tipoExportacion = null;
    }
  }

  private validarDatosParaExport(): boolean {
    const datos = this.table.data$.getValue();
    if (!datos || datos.length === 0) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'No hay datos para exportar'
      });
      return false;
    }
    return true;
  }

  private crearConfiguracionExport(): ExportConfig {
    const datos = this.table.data$.getValue();
    const usuario = localStorage.getItem('usuario') || 'Usuario';
    const empresa = localStorage.getItem('empresa') || 'SIDCOP';
    
    return {
      title: 'Cuentas por Cobrar',
      filename: 'Cuentas_por_Cobrar',
      columns: [
        { header: 'No.', key: 'secuencia' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Negocio', key: 'clie_NombreNegocio' },
        { header: 'Teléfono', key: 'clie_Telefono' },
        { header: 'Facturas Pendientes', key: 'facturasPendientes' },
        { header: 'Total Facturado', key: 'totalFacturado' },
        { header: 'Total Pendiente', key: 'totalPendiente' },
        { header: 'Total Vencido', key: 'totalVencido' },
        { header: 'Último Pago', key: 'ultimoPago' }
      ],
      metadata: {
        user: usuario,
        department: empresa
      },
      data: datos
    };
  }

  private manejarResultadoExport(resultado: any): void {
    if (resultado?.success) {
      this.mostrarAlerta({
        tipo: 'exito',
        mensaje: resultado.message || 'Archivo exportado exitosamente'
      });
    } else {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: resultado?.message || 'Error al exportar archivo'
      });
    }
  }

  // Métodos para exportación de la tabla de resumen
  async exportarResumen(tipo: 'excel' | 'pdf' | 'csv'): Promise<void> {
    if (this.exportandoResumen) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'Ya hay una exportación en progreso...'
      });
      return;
    }
    if (!this.validarDatosParaExportResumen()) {
      return;
    }
    try {
      this.exportandoResumen = true;
      this.tipoExportacionResumen = tipo;
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: `Generando archivo ${tipo.toUpperCase()}...`
      });
      const config = this.crearConfiguracionExportResumen();
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
      this.manejarResultadoExportResumen(resultado);
    } catch (error) {
      console.error(`Error en exportación ${tipo}:`, error);
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: `Error al exportar archivo ${tipo.toUpperCase()}`
      });
    } finally {
      this.exportandoResumen = false;
      this.tipoExportacionResumen = null;
    }
  }

  private validarDatosParaExportResumen(): boolean {
    if (!this.resumenAntiguedadFiltrado || this.resumenAntiguedadFiltrado.length === 0) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'No hay datos de antigüedad para exportar'
      });
      return false;
    }
    return true;
  }

  private crearConfiguracionExportResumen(): ExportConfig {
    const usuario = localStorage.getItem('usuario') || 'Usuario';
    const empresa = localStorage.getItem('empresa') || 'SIDCOP';
    
    return {
      title: 'Resumen de Antigüedad de Cuentas por Cobrar',
      filename: 'Resumen_Antiguedad_CxC',
      columns: [
        { header: 'No.', key: 'secuencia' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Negocio', key: 'clie_NombreNegocio' },
        { header: 'Actual', key: 'actual' },
        { header: '1-30 días', key: '_1_30' },
        { header: '31-60 días', key: '_31_60' },
        { header: '61-90 días', key: '_61_90' },
        { header: 'Mayor a 90 días', key: 'mayor90' },
        { header: 'Total', key: 'total' }
      ],
      data: this.resumenAntiguedadFiltrado,
      metadata: {
        user: usuario,
        department: empresa
      }
    };
  }

  private manejarResultadoExportResumen(resultado: any): void {
    if (resultado?.success) {
      this.mostrarAlerta({
        tipo: 'exito',
        mensaje: resultado.message || 'Archivo exportado exitosamente'
      });
    } else {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: resultado?.message || 'Error al exportar archivo'
      });
    }
  }
}