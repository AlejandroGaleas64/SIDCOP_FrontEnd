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
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { formatDate } from '@angular/common';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs, 'es-ES');


// Importar el servicio de exportación optimizado
import {
  ExportService,
  ExportConfig,
  ExportColumn,
} from 'src/app/shared/exportHori.service';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { set } from 'lodash';

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
    DetailsComponent,
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
          overflow: 'hidden',
        }),
        animate(
          '300ms ease-out',
          style({
            height: '*',
            opacity: 1,
            transform: 'scaleY(1)',
            overflow: 'hidden',
          })
        ),
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate(
          '300ms ease-in',
          style({
            height: '0',
            opacity: 0,
            transform: 'scaleY(0.95)',
          })
        ),
      ]),
    ]),
  ],
  //Animaciones para collapse
})
export class ListComponent implements OnInit {

  // ===== CONFIGURACIÓN DE EXPORTACIÓN =====
  // Configuración centralizada para todos los tipos de exportación (Excel, PDF, CSV)
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Pedidos', // Título del reporte
    filename: 'Pedidos', // Nombre base del archivo
    department: 'Ventas', // Departamento
    additionalInfo: '', // Información adicional

    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Codigo', header: 'Código', width: 18, align: 'left' as const },
      { key: 'Negocio', header: 'Negocio', width: 30, align: 'left' as const },
      {
        key: 'Vendedor',
        header: 'Vendedor',
        width: 50,
        align: 'left' as const,
      },
      {
        key: 'Fecha Entrega',
        header: 'Fecha Entrega',
        width: 75,
        align: 'left' as const,
      },
      {
        key: 'Fecha Pedido',
        header: 'Fecha Pedido',
        width:  85,
        align: 'left' as const,
      },
    ] as ExportColumn[],

    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (modelo: Pedido, index: number) => ({
      No: modelo?.secuencia || index + 1,
      Negocio: this.limpiarTexto(modelo?.clie_NombreNegocio),
      Codigo: this.limpiarTexto(modelo.pedi_Codigo),
      Vendedor: this.limpiarTexto(
        modelo?.vend_Nombres + ' ' + modelo?.vend_Apellidos
      ),
      'Fecha Entrega': this.formatearFecha(modelo?.pedi_FechaEntrega),
      'Fecha Pedido': this.formatearFecha(modelo?.pedi_FechaPedido),
      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(modelo?.campo),
    }),
  };

  private formatearFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '';

    const dateObj = new Date(fecha);

    if (isNaN(dateObj.getTime())) return '';

    const dia = dateObj.getDate().toString().padStart(2, '0');
    const mes = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const anio = dateObj.getFullYear();

    return `${dia}/${mes}/${anio}`; // <-- formato dd/MM/yyyy
  }

  // ===== PROPIEDADES DE EXPORTACIÓN =====
  // Control del estado de exportación para evitar múltiples exportaciones simultáneas
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  // ===== MÉTODOS PRINCIPALES DE EXPORTACIÓN =====
  /**
   * Método principal de exportación que maneja todos los formatos
   * Incluye validaciones, control de estado y manejo de errores
   * @param tipo - Formato de exportación: 'excel', 'pdf' o 'csv'
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
      ////(`Error en exportación ${tipo}:`, error);
      this.mostrarMensaje(
        'error',
        `Error al exportar archivo ${tipo.toUpperCase()}`
      );
    } finally {
      this.exportando = false;
      this.tipoExportacion = null;
    }
  }

  /**
   * Métodos específicos para cada tipo de exportación
   * Estos métodos son llamados directamente desde el template
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
   * Previene exportaciones cuando ya hay una en progreso
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
        additionalInfo: this.exportConfig.additionalInfo,
      },
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
      //('Error obteniendo datos:', error);
      throw error;
    }
  }

  /**
   * Maneja el resultado de las exportaciones
   */
  private manejarResultadoExport(resultado: {
    success: boolean;
    message: string;
  }): void {
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
   * Limpia y formatea texto para exportación
   * Previene errores de formato y limita longitud para archivos de exportación
   */
  private limpiarTexto(texto: any): string {
    if (!texto) return '';

    return String(texto)
      .trim()
      .substring(0, 150);
  }

  /**
   * Sistema centralizado de notificaciones al usuario
   * Maneja diferentes tipos de mensajes con duración automática
   */
  private mostrarMensaje(
    tipo: 'success' | 'error' | 'warning' | 'info',
    mensaje: string
  ): void {
    this.cerrarAlerta();

    const duracion = tipo === 'error' ? 5000 : 3000;

    switch (tipo) {
      case 'success':
        this.mostrarAlertaExito = true;
        this.mensajeExito = mensaje;
        setTimeout(() => (this.mostrarAlertaExito = false), duracion);
        break;

      case 'error':
        this.mostrarAlertaError = true;
        this.mensajeError = mensaje;
        setTimeout(() => (this.mostrarAlertaError = false), duracion);
        break;

      case 'warning':
      case 'info':
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        setTimeout(() => (this.mostrarAlertaWarning = false), duracion);
        break;
    }
  }

  // ===== NAVEGACIÓN Y BREADCRUMBS =====
  breadCrumbItems!: Array<{}>;

  // ===== CONTROL DE PERMISOS Y ACCIONES =====
  // Acciones disponibles para el usuario en esta pantalla basadas en permisos
  accionesDisponibles: string[] = [];

  /**
   * Valida si el usuario tiene permisos para realizar una acción específica
   * Compara de forma insensible a mayúsculas/minúsculas
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(
      (a) => a.trim().toLowerCase() === accion.trim().toLowerCase()
    );
  }

  // ===== INICIALIZACIÓN DEL COMPONENTE =====
  ngOnInit(): void {
    /**
     * Configuración inicial de breadcrumbs para navegación
     */
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Pedidos', active: true },
    ];

    /**
     * Carga permisos del usuario y configuración inicial
     */
    this.cargarAccionesUsuario();
    ////console.log('Acciones disponibles:', this.accionesDisponibles);
  }

  // Cierra el dropdown si se hace click fuera

  // ===== ACCIONES PRINCIPALES DE CRUD =====
  
  /**
   * Abre el formulario de creación de nuevo pedido
   * Cierra otros formularios para evitar conflictos de UI
   */
  crear(): void {
    //console.log('Toggleando formulario de creación...');
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  /**
   * Abre el formulario de edición para un pedido específico
   * Crea una copia del objeto para evitar mutaciones directas
   */
  editar(pedido: Pedido): void {
   
    this.PedidoEditando = { ...pedido }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  /**
   * Abre la vista de detalles para un pedido específico
   * Modo de solo lectura para visualizar información completa
   */
  detalles(pedido: Pedido): void {
    //console.log('Abriendo detalles para:', pedido);
    this.PedidoDetalle = { ...pedido }; // Hacer copia profunda
    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  // ===== CONTROL DE MENÚS DE ACCIONES =====
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false; // Control del collapse
  showEditForm = false; // Control del collapse de edición
  showDetailsForm = false; // Control del collapse de detalles
  // ===== OBJETOS DE TRABAJO TEMPORAL =====
  PedidoEditando: Pedido | null = null;
  PedidoDetalle: Pedido | null = null;

  // ===== SISTEMA DE ALERTAS Y NOTIFICACIONES =====
  mostrarOverlayCarga = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // ===== CONFIRMACIONES DE ACCIONES CRÍTICAS =====
  mostrarConfirmacionEliminar = false;
  PedidoEliminar: Pedido | null = null;

  // ===== CONSTRUCTOR E INYECCIÓN DE DEPENDENCIAS =====
  constructor(
    public table: ReactiveTableService<Pedido>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    /**
     * Inicialización automática de datos al crear el componente
     */
    this.cargardatos(true);
  }

  // ===== GESTIÓN DE FORMULARIOS =====
  
  /**
   * Cierra el formulario de creación y resetea estado
   */
  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  /**
   * Cierra el formulario de edición y limpia objeto temporal
   */
  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.PedidoEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.PedidoDetalle = null;
  }

  guardarPedido(pedido: Pedido): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos(false);
      this.showCreateForm = false;
      this.mensajeExito = `Pedido guardado exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  actualizarPedido(pedido: Pedido): void {
 
    // Recargar los datos de la tabla
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos(false);
      this.showEditForm = false;
      this.mensajeExito = `Pedido actualizado exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  confirmarEliminar(pedido: Pedido): void {
    //console.log('Solicitando confirmación para eliminar:', pedido);
    this.PedidoEliminar = pedido;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.PedidoEliminar = null;
  }

  eliminar(): void {
    if (!this.PedidoEliminar) return;

    //console.log('Eliminando estado civil:', this.PedidoEliminar);
    this.mostrarOverlayCarga = true;
    this.http
      .post(
        `${environment.apiBaseUrl}/Pedido/Eliminar/${this.PedidoEliminar.pedi_Id}`,
        {},
        {
          headers: {
            'X-Api-Key': environment.apiKey,
            accept: '*/*',
          },
        }
      )
      .subscribe({
        next: (response: any) => {
          //console.log('Respuesta del servidor:', response);

          // Verificar el código de estado en la respuesta
          if (response.success && response.data) {
            //console.log('Respuesta exitosa del servidor:', response.data);
            if (response.data.code_Status === 1) {
              // Éxito: eliminado correctamente
              //console.log('Punto de Emision exitosamente');
              this.mensajeExito = `Pedido de "${
                this.PedidoEliminar!.clie_NombreNegocio
              }" eliminado exitosamente`;
              this.mostrarAlertaExito = true;

              // Ocultar la alerta después de 3 segundos
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);

              this.cargardatos(false);
              this.cancelarEliminar();
              this.mostrarOverlayCarga = false;
            } else if (response.data.code_Status === -1) {
              //result: está siendo utilizado
              //console.log('Pedido está siendo utilizado');
              this.mostrarAlertaError = true;
              this.mensajeError =
                response.data.message_Status ||
                'No se puede eliminar: el pedido está siendo utilizado.';

              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);

              // Cerrar el modal de confirmación
              this.cancelarEliminar();
              this.mostrarOverlayCarga = false;
            } else if (response.data.code_Status === 0) {
              // Error general
              //console.log('Error general al eliminar');
              this.mostrarAlertaError = true;
              this.mensajeError =
                response.data.message_Status || 'Error al eliminar el pedido.';

              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);

              // Cerrar el modal de confirmación
              this.cancelarEliminar();
              this.mostrarOverlayCarga = false;
            }
          } else {
            // Respuesta inesperada
            //console.log('Respuesta inesperada del servidor');
            this.mostrarAlertaError = true;
            this.mensajeError =
              response.message ||
              'Error inesperado al eliminar el estado civil.';

            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);

            // Cerrar el modal de confirmación
            this.cancelarEliminar();
          }
        },
      });
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  private cargarAccionesUsuario(): void {
    // Obtener permisosJson del localStorage
    const permisosRaw = localStorage.getItem('permisosJson');
    //console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // Buscar el módulo de Estados Civiles (ajusta el nombre si es diferente)
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla (ajusta el ID si cambia en el futuro)
          modulo = permisos.find((m: any) => m.Pant_Id === 38);
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo =
            permisos['Estados Civiles'] || permisos['estados civiles'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          // Extraer solo el nombre de la acción
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter(
            (a: any) => typeof a === 'string'
          );
        }
      } catch (e) {
        //('Error al parsear permisosJson:', e);
      }
    }
    this.accionesDisponibles = accionesArray
      .filter((a) => typeof a === 'string' && a.length > 0)
      .map((a) => a.trim().toLowerCase());
    //console.log('Acciones finales:', this.accionesDisponibles);
  }

  // ...existing code...
private cargardatos(state: boolean): void {
  this.mostrarOverlayCarga = state;

  this.http
    .get<Pedido[]>(`${environment.apiBaseUrl}/Pedido/Listar`, {
      headers: { 'x-api-key': environment.apiKey },
    })
    .subscribe((data) => {
      const tienePermisoListar = this.accionPermitida('listar');
      const userId = getUserId();

      const datosFiltrados = tienePermisoListar
        ? data
        : data.filter(
            (r) => r.usua_Creacion?.toString() === userId.toString()
          );

      // Enriquecer solo para búsqueda, sin modificar nombres originales
      const datosBusqueda = datosFiltrados.map((pedido) => ({
        ...pedido,
        _busquedaNombreCliente: `${pedido.clie_Nombres ?? ''} ${pedido.clie_Apellidos ?? ''}`.trim(),
        _busquedaNombreVendedor: `${pedido.vend_Nombres ?? ''} ${pedido.vend_Apellidos ?? ''}`.trim(),
        _busquedaFechaPedido: pedido.pedi_FechaPedido
          ? formatDate(pedido.pedi_FechaPedido, 'dd/MM/yyyy', 'es-ES')
          : '',
        _busquedaFechaEntrega: pedido.pedi_FechaEntrega
          ? formatDate(pedido.pedi_FechaEntrega, 'dd/MM/yyyy', 'es-ES')
          : '',
      }));

      setTimeout(() => {
        this.table.setData(datosBusqueda);
        this.mostrarOverlayCarga = false;
      }, 500);
    });
}
// ...existing code...
}
