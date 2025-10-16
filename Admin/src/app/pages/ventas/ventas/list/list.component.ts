import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { getUserId } from 'src/app/core/utils/user-utils';
import { CreateComponent } from '../create/create.component';
import { DetailsComponent } from '../details/details.component';

import {
  ExportService,
  ExportConfig,
  ExportColumn,
} from 'src/app/shared/exportHori.service';
import {
  Factura,
  VentaInsertar,
  VentaDetalle,
} from 'src/app/Modelos/ventas/Facturas.model';
import { Respuesta } from 'src/app/Modelos/apiresponse.model';

/**
 * Componente para la gestión y visualización de ventas (facturas).
 * Permite listar, filtrar, exportar, crear, ver detalles y controlar acciones según permisos del usuario.
 * Incluye paginación, overlay de carga y sistema de alertas.
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
    DetailsComponent,
  ],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
})
export class ListComponent implements OnInit {
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de ventas', // Título del reporte
    filename: 'Ventas', // Nombre base del archivo
    department: 'Ventas', // Departamento

    // Columnas a exportar
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Numero', header: 'Número', width: 20, align: 'center' as const },
      {
        key: 'TipoDocumento',
        header: 'Tipo Documento',
        width: 25,
        align: 'left' as const,
      },
      {
        key: 'FechaEmision',
        header: 'Fecha Emisión',
        width: 20,
        align: 'center' as const,
      },
      {
        key: 'TipoVenta',
        header: 'Tipo Venta',
        width: 15,
        align: 'left' as const,
      },
      {
        key: 'ClienteNombre',
        header: 'Cliente',
        width: 40,
        align: 'left' as const,
      },
      {
        key: 'ClienteNegocio',
        header: 'Negocio',
        width: 40,
        align: 'left' as const,
      },
      {
        key: 'Vendedor',
        header: 'Vendedor',
        width: 40,
        align: 'left' as const,
      },
      {
        key: 'Subtotal',
        header: 'Subtotal',
        width: 18,
        align: 'right' as const,
      },
      {
        key: 'Impuesto15',
        header: 'Imp. 15%',
        width: 18,
        align: 'right' as const,
      },
      {
        key: 'Impuesto18',
        header: 'Imp. 18%',
        width: 18,
        align: 'right' as const,
      },
      { key: 'Total', header: 'Total', width: 18, align: 'right' as const },
    ] as ExportColumn[],

    // Mapeo de datos
    dataMapping: (factura: Factura, index: number) => ({
      No: factura?.secuencia || index + 1,
      Numero: this.limpiarTexto(factura?.fact_Numero),
      TipoDocumento: this.limpiarTexto(factura?.fact_TipoDeDocumento),
      FechaEmision: factura?.fact_FechaEmision
        ? this.formatearFecha(factura.fact_FechaEmision)
        : '',
      TipoVenta: this.limpiarTexto(factura?.fact_TipoVenta),
      ClienteNombre: this.limpiarTexto(factura?.clie_NombreCompleto),
      ClienteNegocio: this.limpiarTexto(factura?.clie_NombreNegocio),
      Vendedor: this.limpiarTexto(factura?.vend_NombreCompleto),
      Subtotal: factura?.fact_Subtotal ?? 0,
      Impuesto15: factura?.fact_TotalImpuesto15 ?? 0,
      Impuesto18: factura?.fact_TotalImpuesto18 ?? 0,
      Total: factura?.fact_Total ?? 0,
    }),
  };

  // bread crumb items
  /**
   * Items para el breadcrumb de navegación.
   */
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario en esta pantalla
  /**
   * Acciones permitidas para el usuario en la pantalla.
   */
  accionesDisponibles: string[] = [];

  // METODO PARA VALIDAR SI UNA ACCIÓN ESTÁ PERMITIDA
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(
      (a) => a.trim().toLowerCase() === accion.trim().toLowerCase()
    );
  }

  // Estado de exportación
  /**
   * Estado de exportación y tipo de exportación actual.
   */
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  ngOnInit(): void {
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Ventas', active: true },
    ];

    // OBTENER ACCIONES DISPONIBLES DEL USUARIO
    this.cargarAccionesUsuario();
  }

  // // Métodos para los botones de acción principales (crear, editar, detalles)
  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(factura: Factura): void {
    // Usar el ID para cargar datos actualizados desde el API
    this.facturaIdDetalle = factura.fact_Id;
    this.facturaDetalle = null; // Limpiar datos previos

    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  constructor(
    public table: ReactiveTableService<Factura>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private exportService: ExportService,
    public floatingMenuService: FloatingMenuService
  ) {
    this.cargardatos();
  }

  private formatearFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';

    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '';

    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getFullYear();

    return `${dia}/${mes}/${anio}`;
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
   * Limpia texto para exportación de manera más eficiente
   */
  private limpiarTexto(texto: any): string {
    if (!texto) return '';

    return String(texto).trim().substring(0, 150);
  }

  /**
   * Sistema de mensajes mejorado con tipos adicionales
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

  /**
   * Fila activa para mostrar acciones flotantes.
   */
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  /**
   * Control de visibilidad para los formularios de creación, edición y detalles.
   */
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;
  /**
   * Factura en edición y factura en detalles.
   */
  facturaEditando: Factura | null = null;
  facturaDetalle: Factura | null = null;
  /**
   * Identificador de la factura para el componente de detalles.
   */
  facturaIdDetalle: number | null = null;

  // Propiedades para overlay de carga
  /**
   * Muestra el overlay de carga mientras se obtienen datos.
   */
  mostrarOverlayCarga = false;

  // Propiedades para alertas
  /**
   * Control de visibilidad y mensajes para alertas de éxito, error y advertencia.
   */
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  /**
   * Cierra el formulario de creación de factura.
   */
  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  /**
   * Cierra el formulario de edición de factura.
   */
  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.facturaEditando = null;
  }

  /**
   * Cierra el formulario de detalles de factura.
   */
  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.facturaDetalle = null;
    this.facturaIdDetalle = null; // Limpiar también el ID
  }

  /**
   * Guarda una factura nueva y recarga los datos de la tabla.
   * Si se solicita, muestra el formulario de detalles.
   * @param datos Datos de la factura guardada
   */
  guardarFactura(datos: any): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      // Recargar los datos de la tabla
      this.cargardatos();

      // Cerrar el formulario de creación
      this.showCreateForm = false;

      // Mostrar mensaje de éxito
      this.mensajeExito = `Factura guardada exitosamente`;
      this.mostrarAlertaExito = true;

      // Si se solicitó mostrar detalles y tenemos un ID válido
      if (datos.mostrarDetalles && datos.fact_Id > 0) {
        // Configurar el ID para el componente de detalles
        this.facturaIdDetalle = datos.fact_Id;
        this.facturaDetalle = null; // Limpiar datos previos

        // Mostrar el formulario de detalles
        this.showDetailsForm = true;
      }

      // Ocultar el mensaje de éxito después de un tiempo
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
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

  // AQUI EMPIEZA LO BUENO PARA LAS ACCIONES
  /**
   * Carga las acciones permitidas para el usuario desde los permisos almacenados.
   */
  private cargarAccionesUsuario(): void {
    // OBTENEMOS PERMISOSJSON DEL LOCALSTORAGE
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // BUSCAMOS EL MÓDULO DE TRASLADOS
        let modulo = null;
        if (Array.isArray(permisos)) {
          // BUSCAMOS EL MÓDULO DE TRASLADOS POR ID (cambiar ID según corresponda)
          modulo = permisos.find((m: any) => m.Pant_Id === 57); // Ajustar ID según el módulo de facturas
        } else if (typeof permisos === 'object' && permisos !== null) {
          // ESTO ES PARA CUANDO LOS PERMISOS ESTÁN EN UN OBJETO CON CLAVES
          modulo = permisos['Facturas'] || permisos['facturas'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          // AQUI SACAMOS SOLO EL NOMBRE DE LA ACCIÓN
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter(
            (a: any) => typeof a === 'string'
          );
        }
      } catch (e) {}
    }
    // AQUI FILTRAMOS Y NORMALIZAMOS LAS ACCIONES
    this.accionesDisponibles = accionesArray
      .filter((a) => typeof a === 'string' && a.length > 0)
      .map((a) => a.trim().toLowerCase());
  }

  // Declaramos un estado en el cargarDatos, esto para hacer el overlay
  // segun dicha funcion de recargar, ya que si vienes de hacer una accion
  // es innecesario mostrar el overlay de carga
  /**
   * Carga los datos de ventas (facturas) desde el API y los prepara para la tabla.
   */
  private cargardatos(): void {
    this.mostrarOverlayCarga = true;

    this.http
      .get<Respuesta<Factura[]>>(`${environment.apiBaseUrl}/Facturas/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (response) => {
          const tienePermisoListar = this.accionPermitida('listar');
          const userId = getUserId();

          // Asegurar que response.data sea un array
          const lista: Factura[] = Array.isArray(response.data)
            ? response.data
            : [];

          // Filtrar datos si no tiene permiso para ver todo
          let datosFiltrados = tienePermisoListar
            ? lista
            : lista.filter(
                (f) => f.usua_Creacion?.toString() === userId.toString()
              );

          // Ajustar datos para presentación pero manteniendo el tipo Factura
          datosFiltrados = datosFiltrados.map((factura, index) => {
            factura.secuencia = index + 1;
            factura.fact_Numero = this.limpiarTexto(factura.fact_Numero);
            factura.fact_TipoDeDocumento = this.limpiarTexto(
              factura.fact_TipoDeDocumento
            );
            factura.fact_TipoVenta = this.limpiarTexto(factura.fact_TipoVenta);
            factura.clie_NombreCompleto = this.limpiarTexto(
              factura.clie_NombreCompleto || ''
            );
            factura.clie_NombreNegocio = this.limpiarTexto(
              factura.clie_NombreNegocio || ''
            );
            factura.vend_NombreCompleto = this.limpiarTexto(
              factura.vend_NombreCompleto || ''
            );
            return factura;
          });

          setTimeout(() => {
            this.mostrarOverlayCarga = false;
            this.table.setData(datosFiltrados); // ahora sí es Factura[]
          }, 500);
        },
        error: (error) => {
          this.mostrarOverlayCarga = false;
          this.table.setData([]);
        },
      });
  }
}
