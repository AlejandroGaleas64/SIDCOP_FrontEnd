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

/**
 * Configuración para mostrar alertas en el componente.
 */
interface AlertaConfig {
  tipo: 'exito' | 'error' | 'warning';
  mensaje: string;
  duracion?: number;
}

/**
 * Componente para la gestión y visualización de cuentas por cobrar.
 * Permite listar, filtrar, exportar, eliminar y navegar entre detalles y pagos de cuentas por cobrar.
 * Incluye resumen de antigüedad y control de acciones según permisos del usuario.
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
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements OnInit, OnDestroy {
  // Subject para manejar las suscripciones
  /**
   * Subject para manejar la destrucción de suscripciones.
   */
  private destroy$ = new Subject<void>();

  // Bread crumb items
  /**
   * Items para el breadcrumb de navegación.
   */
  breadCrumbItems: Array<{}> = [];
  /**
   * Pestaña activa en la vista.
   */
  activeTab: number = 1;
  /**
   * Acciones permitidas para el usuario en la pantalla.
   */
  accionesDisponibles: string[] = [];

  // Variables para resumen de antigüedad
  /**
   * Datos del resumen de antigüedad de cuentas por cobrar.
   */
  resumenAntiguedad: any[] = [];
  /**
   * Datos filtrados del resumen de antigüedad.
   */
  resumenAntiguedadFiltrado: any[] = [];
  /**
   * Término de búsqueda para filtrar el resumen.
   */
  resumenSearchTerm: string = '';
  /**
   * Campo por el que se ordena el resumen.
   */
  resumenSortField: string = '';
  /**
   * Dirección de ordenamiento del resumen.
   */
  resumenSortDirection: 'asc' | 'desc' = 'asc';

  // Variables para paginación de resumen de antigüedad
  /**
   * Página actual del resumen de antigüedad.
   */
  resumenPaginaActual: number = 1;
  /**
   * Tamaño de página para la paginación del resumen.
   */
  resumenTamanoPagina: number = 10;
  /**
   * Total de elementos en el resumen filtrado.
   */
  resumenTotalItems: number = 0;

  // Variables para acciones de fila
  /**
   * Fila activa para mostrar acciones flotantes.
   */
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showPayment = true;

  // Propiedades para alertas
  /**
   * Control de visibilidad y mensajes para alertas.
   */
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Propiedades para confirmación de eliminación
  /**
   * Control de visibilidad para el diálogo de confirmación de eliminación.
   */
  mostrarConfirmacionEliminar = false;
  /**
   * Cuenta por cobrar seleccionada para eliminar.
   */
  cuentaPorCobrarAEliminar: CuentaPorCobrar | null = null;

  // Propiedad para mostrar overlay de carga
  /**
   * Muestra el overlay de carga mientras se obtienen datos.
   */
  mostrarOverlayCarga = false;

  // Propiedades para exportación de la tabla principal
  /**
   * Estado de exportación de la tabla principal.
   */
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  // Propiedades para exportación de la tabla de resumen
  /**
   * Estado de exportación de la tabla de resumen.
   */
  exportandoResumen = false;
  tipoExportacionResumen: 'excel' | 'pdf' | 'csv' | null = null;

  /**
   * Constructor: Inyecta servicios para gestión de datos, navegación, menú flotante y exportación.
   */
  constructor(
    public table: ReactiveTableService<CuentaPorCobrar>,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private cuentasPorCobrarDataService: CuentasPorCobrarDataService,
    private exportService: ExportService
  ) {}

  /**
   * Inicializa el componente, carga breadcrumbs, acciones y datos principales.
   */
  ngOnInit(): void {
    this.initializeBreadcrumbs();
    this.cargarAccionesUsuario();
    this.cargardatos();
  }

  /**
   * Destruye el componente y cancela suscripciones activas.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Limpiar todos los timeouts pendientes
  }

  // MÉTODO PARA VALIDAR SI UNA ACCIÓN ESTÁ PERMITIDA
  /**
   * Verifica si una acción está permitida para el usuario actual.
   * @param accion Nombre de la acción a validar
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(
      (a) => a.trim().toLowerCase() === accion.trim().toLowerCase()
    );
  }

  /**
   * Inicializa los items del breadcrumb de navegación.
   */
  private initializeBreadcrumbs(): void {
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Cuentas por Cobrar', active: true },
    ];
  }

  // Método centralizado para mostrar alertas
  /**
   * Muestra una alerta en pantalla según la configuración.
   * @param config Configuración de la alerta
   */
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

  /**
   * Cierra todas las alertas activas.
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
   * Muestra el diálogo de confirmación para eliminar una cuenta por cobrar.
   * @param cuentaPorCobrar Cuenta seleccionada para eliminar
   */
  confirmarEliminar(cuentaPorCobrar: CuentaPorCobrar): void {
    this.cuentaPorCobrarAEliminar = cuentaPorCobrar;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }

  /**
   * Cancela la acción de eliminación y oculta el diálogo.
   */
  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.cuentaPorCobrarAEliminar = null;
  }

  /**
   * Elimina la cuenta por cobrar seleccionada si es válida.
   */
  eliminar(): void {
    if (!this.cuentaPorCobrarAEliminar?.cpCo_Id) {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: 'No se puede eliminar: datos inválidos.',
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
          this.mostrarAlerta({
            tipo: 'error',
            mensaje:
              'Error al comunicarse con el servidor. Por favor, inténtelo de nuevo más tarde.',
          });
          this.cancelarEliminar();
        },
      });
  }

  /**
   * Procesa la respuesta del servidor tras intentar eliminar una cuenta por cobrar.
   * @param response Respuesta del servidor
   */
  private procesarRespuestaEliminacion(response: any): void {
    if (!response?.success || !response?.data) {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje:
          response?.message ||
          'Error inesperado al eliminar la cuenta por cobrar.',
      });
      this.cancelarEliminar();
      return;
    }

    const { code_Status, message_Status } = response.data;

    switch (code_Status) {
      case 1:
        this.mostrarAlerta({
          tipo: 'exito',
          mensaje: 'Cuenta por cobrar eliminada exitosamente',
        });
        this.cargardatos();
        this.cancelarEliminar();
        break;

      case -1:
        this.mostrarAlerta({
          tipo: 'error',
          mensaje:
            message_Status ||
            'No se puede eliminar: la cuenta por cobrar está siendo utilizada.',
        });
        this.cancelarEliminar();
        break;

      case 0:
      default:
        this.mostrarAlerta({
          tipo: 'error',
          mensaje: message_Status || 'Error al eliminar la cuenta por cobrar.',
        });
        this.cancelarEliminar();
        break;
    }
  }

  /**
   * Carga las acciones permitidas para el usuario desde los permisos almacenados.
   */
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
        this.accionesDisponibles = modulo.Acciones.map((a: any) => a.Accion)
          .filter((a: any) => typeof a === 'string' && a.length > 0)
          .map((a: string) => a.trim().toLowerCase());
      } else {
        this.accionesDisponibles = [];
      }
    } catch (error) {
      this.accionesDisponibles = [];
    }
  }

  /**
   * Busca el módulo de cuentas por cobrar en la estructura de permisos.
   * @param permisos Permisos obtenidos de localStorage
   */
  private encontrarModuloCuentasPorCobrar(permisos: any): any {
    if (Array.isArray(permisos)) {
      return permisos.find(
        (m: any) =>
          m.Pant_Id === 34 ||
          (m.Nombre && m.Nombre.toLowerCase().includes('cuentas por cobrar'))
      );
    } else if (typeof permisos === 'object' && permisos !== null) {
      return (
        permisos['Cuentas por Cobrar'] ||
        permisos['cuentas por cobrar'] ||
        Object.values(permisos).find(
          (m: any) =>
            m?.Nombre && m.Nombre.toLowerCase().includes('cuentas por cobrar')
        )
      );
    }
    return null;
  }

  // Métodos para navegación desde el menú flotante
  /**
   * Navega a la pantalla de edición de una cuenta por cobrar.
   * @param id Identificador de la cuenta
   */
  irAEditar(id: number): void {
    if (id && this.accionPermitida('editar')) {
      this.router.navigate(['/ventas/cuentasporcobrar/edit', id]);
      this.floatingMenuService.close();
    }
  }

  /**
   * Navega a la pantalla de detalles de una cuenta por cobrar.
   * @param id Identificador de la cuenta
   */
  irADetalles(id: number): void {
    // Buscar el cliente en los datos cargados
    const clienteTabla =
      this.cuentasPorCobrarDataService.buscarClientePorId(id);
    const clienteResumen =
      this.cuentasPorCobrarDataService.buscarClienteEnResumenPorId(id);

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

  /**
   * Navega a la pantalla de registro de pago de una cuenta por cobrar.
   * @param id Identificador de la cuenta
   */
  irARegistrarPago(id: number): void {
    if (id && this.accionPermitida('pagar')) {
      this.router.navigate(['/ventas/cuentasporcobrar/payment', id]);
      this.floatingMenuService.close();
    }
  }

  /**
   * Carga los datos principales de cuentas por cobrar y resumen de antigüedad.
   */
  private cargardatos(): void {
    this.mostrarOverlayCarga = true;

    const tienePermisoListar = this.accionPermitida('listar');
    const userId = getUserId();

    const cuentasPorCobrar$ =
      this.cuentasPorCobrarService.obtenerCuentasPorCobrar(true, false);
    const resumenAntiguedad$ =
      this.cuentasPorCobrarService.obtenerResumenAntiguedad();

    // Usar forkJoin para cargar ambos datos simultáneamente
    forkJoin({
      cuentas: cuentasPorCobrar$,
      resumen: resumenAntiguedad$,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.procesarCuentasPorCobrar(
            results.cuentas,
            tienePermisoListar,
            userId
          );
          this.procesarResumenAntiguedad(results.resumen);
        },
        error: (error) => {
          this.mostrarAlerta({
            tipo: 'error',
            mensaje:
              'Error al cargar los datos. Por favor, recargue la página.',
          });
        },
        complete: () => {
          this.mostrarOverlayCarga = false;
        },
      });
  }

  /**
   * Procesa y almacena los datos de cuentas por cobrar obtenidos del servicio.
   * @param response Respuesta del servicio
   * @param tienePermisoListar Si el usuario tiene permiso para listar todas las cuentas
   * @param userId Identificador del usuario actual
   */
  private procesarCuentasPorCobrar(
    response: any,
    tienePermisoListar: boolean,
    userId: any
  ): void {
    if (response?.success && response?.data) {
      const data = response.data;

      // Agregar secuencia
      data.forEach((item: CuentaPorCobrar, index: number) => {
        item.secuencia = index + 1;
      });

      const datosFiltrados = tienePermisoListar
        ? data
        : data.filter(
            (item: CuentaPorCobrar) =>
              item.usua_Creacion === userId ||
              item.usua_Creacion?.toString() === userId.toString()
          );

      // Guardar los datos en el servicio compartido
      this.cuentasPorCobrarDataService.setListaCuentasPorCobrar(datosFiltrados);

      this.table.setData(datosFiltrados);
    } else {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: 'No se pudieron cargar las cuentas por cobrar correctamente.',
      });
    }
  }

  /**
   * Procesa y almacena los datos del resumen de antigüedad obtenidos del servicio.
   * @param response Respuesta del servicio
   */
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
        mensaje: 'No se pudo cargar el resumen de antigüedad.',
      });
    }
  }

  /**
   * Filtra el resumen de antigüedad según el término de búsqueda y ordenamiento.
   */
  filtrarResumenAntiguedad(): void {
    let data = [...this.resumenAntiguedad];

    if (this.resumenSearchTerm) {
      const term = this.resumenSearchTerm.toLowerCase().trim();
      data = data.filter(
        (d) =>
          d.cliente?.toLowerCase().includes(term) ||
          d.total?.toString().includes(term) ||
          d._1_30?.toString().includes(term)
      );
    }

    this.resumenAntiguedadFiltrado = this.sortDataResumen(data);
    this.resumenTotalItems = this.resumenAntiguedadFiltrado.length;
  }

  /**
   * Cambia el campo y dirección de ordenamiento del resumen de antigüedad.
   * @param field Campo por el que se ordena
   */
  sortResumenBy(field: string): void {
    if (!field) return;

    if (this.resumenSortField === field) {
      this.resumenSortDirection =
        this.resumenSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.resumenSortField = field;
      this.resumenSortDirection = 'asc';
    }
    this.resumenAntiguedadFiltrado = this.sortDataResumen(
      this.resumenAntiguedadFiltrado
    );
  }

  /**
   * Ordena los datos del resumen de antigüedad según el campo y dirección seleccionados.
   * @param data Datos a ordenar
   */
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

  /**
   * Cambia la pestaña activa en la vista.
   * @param tabDestino Número de la pestaña destino
   */
  navegar(tabDestino: number) {
    this.activeTab = tabDestino;
  }

  // Getter para obtener solo los elementos de la página actual para el resumen de antigüedad
  /**
   * Obtiene los elementos del resumen de antigüedad para la página actual.
   */
  get resumenAntiguedadPaginado(): any[] {
    const startItem = (this.resumenPaginaActual - 1) * this.resumenTamanoPagina;
    const endItem = this.resumenPaginaActual * this.resumenTamanoPagina;
    return this.resumenAntiguedadFiltrado.slice(startItem, endItem);
  }

  // Método para cambiar de página en el resumen de antigüedad
  /**
   * Cambia la página actual del resumen de antigüedad.
   * @param event Evento de cambio de página
   */
  pageChangedResumen(event: any): void {
    this.resumenPaginaActual = event.page;
  }

  // Métodos para exportación de la tabla principal
  /**
   * Exporta los datos de la tabla principal en el formato seleccionado.
   * @param tipo Tipo de exportación ('excel', 'pdf', 'csv')
   */
  async exportar(tipo: 'excel' | 'pdf' | 'csv'): Promise<void> {
    if (this.exportando) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'Ya hay una exportación en progreso...',
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
        mensaje: `Generando archivo ${tipo.toUpperCase()}...`,
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
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: `Error al exportar archivo ${tipo.toUpperCase()}`,
      });
    } finally {
      this.exportando = false;
      this.tipoExportacion = null;
    }
  }

  /**
   * Valida si hay datos disponibles para exportar en la tabla principal.
   */
  private validarDatosParaExport(): boolean {
    const datos = this.table.data$.getValue();
    if (!datos || datos.length === 0) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'No hay datos para exportar',
      });
      return false;
    }
    return true;
  }

  /**
   * Crea la configuración para exportar los datos de la tabla principal.
   */
  private crearConfiguracionExport(): ExportConfig {
    const datos = this.table.data$.getValue();
    const usuario = localStorage.getItem('usuario') || 'Usuario';
    const empresa = localStorage.getItem('empresa') || 'SIDCOP';

    // Crear una copia de los datos para la exportación
    const datosExport = datos.map((item) => {
      // Crear un objeto con las propiedades formateadas para la exportación
      return {
        secuencia: item.secuencia,
        cliente: item.cliente,
        clie_NombreNegocio: item.clie_NombreNegocio,
        clie_Telefono: item.clie_Telefono,
        facturasPendientes: item.facturasPendientes,
        totalFacturado:
          typeof item.totalFacturado === 'number'
            ? `L ${this.formatearNumero(item.totalFacturado)}`
            : item.totalFacturado,
        totalPendiente:
          typeof item.totalPendiente === 'number'
            ? `L ${this.formatearNumero(item.totalPendiente)}`
            : item.totalPendiente,
        totalVencido:
          typeof item.totalVencido === 'number'
            ? `L ${this.formatearNumero(item.totalVencido)}`
            : item.totalVencido,
        ultimoPago: item.ultimoPago,
      };
    });

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
        { header: 'Último Pago', key: 'ultimoPago' },
      ],
      metadata: {
        user: usuario,
        department: empresa,
      },
      data: datosExport,
    };
  }

  // Método para formatear números con dos decimales
  /**
   * Formatea un número a dos decimales en formato local.
   * @param numero Número a formatear
   */
  private formatearNumero(numero: number | null | undefined): string {
    if (numero === null || numero === undefined || isNaN(numero)) {
      return '0.00';
    }
    return numero.toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Maneja el resultado de la exportación de la tabla principal.
   * @param resultado Resultado de la exportación
   */
  private manejarResultadoExport(resultado: any): void {
    if (resultado?.success) {
      this.mostrarAlerta({
        tipo: 'exito',
        mensaje: resultado.message || 'Archivo exportado exitosamente',
      });
    } else {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: resultado?.message || 'Error al exportar archivo',
      });
    }
  }

  // Métodos para exportación de la tabla de resumen
  /**
   * Exporta los datos del resumen de antigüedad en el formato seleccionado.
   * @param tipo Tipo de exportación ('excel', 'pdf', 'csv')
   */
  async exportarResumen(tipo: 'excel' | 'pdf' | 'csv'): Promise<void> {
    if (this.exportandoResumen) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'Ya hay una exportación en progreso...',
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
        mensaje: `Generando archivo ${tipo.toUpperCase()}...`,
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
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: `Error al exportar archivo ${tipo.toUpperCase()}`,
      });
    } finally {
      this.exportandoResumen = false;
      this.tipoExportacionResumen = null;
    }
  }

  /**
   * Valida si hay datos disponibles para exportar en el resumen de antigüedad.
   */
  private validarDatosParaExportResumen(): boolean {
    if (
      !this.resumenAntiguedadFiltrado ||
      this.resumenAntiguedadFiltrado.length === 0
    ) {
      this.mostrarAlerta({
        tipo: 'warning',
        mensaje: 'No hay datos de antigüedad para exportar',
      });
      return false;
    }
    return true;
  }

  /**
   * Crea la configuración para exportar los datos del resumen de antigüedad.
   */
  private crearConfiguracionExportResumen(): ExportConfig {
    const usuario = localStorage.getItem('usuario') || 'Usuario';
    const empresa = localStorage.getItem('empresa') || 'SIDCOP';

    // Crear una copia de los datos para la exportación con formato monetario
    const datosExport = this.resumenAntiguedadFiltrado.map((item) => {
      // Crear un objeto con las propiedades formateadas para la exportación
      return {
        secuencia: item.secuencia,
        cliente: item.cliente,
        clie_NombreNegocio: item.clie_NombreNegocio,
        actual:
          typeof item.actual === 'number'
            ? `L ${this.formatearNumero(item.actual)}`
            : item.actual,
        _1_30:
          typeof item._1_30 === 'number'
            ? `L ${this.formatearNumero(item._1_30)}`
            : item._1_30,
        _31_60:
          typeof item._31_60 === 'number'
            ? `L ${this.formatearNumero(item._31_60)}`
            : item._31_60,
        _61_90:
          typeof item._61_90 === 'number'
            ? `L ${this.formatearNumero(item._61_90)}`
            : item._61_90,
        mayor90:
          typeof item.mayor90 === 'number'
            ? `L ${this.formatearNumero(item.mayor90)}`
            : item.mayor90,
        total:
          typeof item.total === 'number'
            ? `L ${this.formatearNumero(item.total)}`
            : item.total,
      };
    });

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
        { header: 'Total', key: 'total' },
      ],
      data: datosExport,
      metadata: {
        user: usuario,
        department: empresa,
      },
    };
  }

  /**
   * Maneja el resultado de la exportación del resumen de antigüedad.
   * @param resultado Resultado de la exportación
   */
  private manejarResultadoExportResumen(resultado: any): void {
    if (resultado?.success) {
      this.mostrarAlerta({
        tipo: 'exito',
        mensaje: resultado.message || 'Archivo exportado exitosamente',
      });
    } else {
      this.mostrarAlerta({
        tipo: 'error',
        mensaje: resultado?.message || 'Error al exportar archivo',
      });
    }
  }
}
