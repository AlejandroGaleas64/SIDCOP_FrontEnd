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
import { Devoluciones } from 'src/app/Modelos/ventas/Devoluciones.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/export.service';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';

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
  private readonly exportConfig = {
        // Configuración básica
        title: 'Listado de Devoluciones',                    // Título del reporte
        filename: 'Devoluciones',                           // Nombre base del archivo
        department: 'Ventas',                         // Departamento
         
        // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
        columns: [
          { key: 'No', header: 'No', width: 15, align: 'left' as const },
          { key: 'clie_NombreNegocio ', header: 'Nombre Negocio', width: 40, align: 'left' as const },
          { key: 'fact_Numero', header: 'Número de Factura', width: 50, align: 'left' as const },
          { key: 'devo_Fecha', header: 'Fecha', width: 40, align: 'left' as const },
          { key: 'devo_Motivo', header: 'Motivo', width: 40, align: 'left' as const }
          
        ] as ExportColumn[],
        
        // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
        dataMapping: (devoluciones: Devoluciones, index: number) => ({
          'No': devoluciones?.devo_Id || (index + 1),
          'clie_NombreNegocio': this.limpiarTexto(devoluciones?.clie_NombreNegocio),
          'fact_Numero': this.limpiarTexto(devoluciones?.fact_Numero),
          'devo_Fecha': this.limpiarTexto(devoluciones?.devo_Fecha),
          'devo_Motivo': this.limpiarTexto(devoluciones?.devo_Motivo),
        })
      };



  // bread crumb items
  breadCrumbItems!: Array<{}>;

  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showTrasladar = true;
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;

  // Propiedades para alertas
  mostrarOverlayCarga = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  accionesDisponibles: string[] = [];

  DevolucionesEditando: Devoluciones | null = null;
  DevolucionesDetalle: Devoluciones | null = null;
  DevolucionesATrasladar: Devoluciones | null = null;

  // Estado de exportación
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  mostrarConfirmacionTrasladar = false;

  constructor(
    public table: ReactiveTableService<Devoluciones>, 
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargardatos(true);
  }

  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Devoluciones', active: true }
    ];
    this.cargarAccionesUsuario();

  // this.showEdit = this.accionPermitida('editar');
  // this.showDelete = this.accionPermitida('Trasladar');
  // this.showDetails = this.accionPermitida('detalle');
  }

  // Permisos
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Ajusta el Pant_Id según corresponda para Proveedores
          modulo = permisos.find((m: any) => m.Pant_Id === 35);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Devoluciones'] || permisos['devoluciones'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
        // Error parseando permisos
      }
    }
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLowerCase());
  }

  onActionMenuClick(event: MouseEvent, data: Devoluciones) {
    this.floatingMenuService.open(event, data);
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  editar(devoluciones: Devoluciones): void {
    this.DevolucionesEditando = { ...devoluciones };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  detalles(devoluciones: Devoluciones): void {
    this.DevolucionesDetalle = { ...devoluciones };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.activeActionRow = null;
  }

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.DevolucionesEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.DevolucionesDetalle = null;
  }

  guardarDevoluciones(devoluciones: Devoluciones): void {
    this.cargardatos(false);
    this.cerrarFormulario();
  }

  actualizarDevoluciones(devoluciones: Devoluciones): void {
    this.cargardatos(false);
    this.cerrarFormularioEdicion();
  }

  confirmarTrasladar(devoluciones: Devoluciones): void {
    this.DevolucionesATrasladar = devoluciones;
    //console.log('Devolución a Trasladar:', this.DevolucionesATrasladar);
    this.mostrarConfirmacionTrasladar = true;
    this.activeActionRow = null;
  }

  cancelarTrasladar(): void {
    this.mostrarConfirmacionTrasladar = false;
    this.DevolucionesATrasladar = null;
  }

  trasladar(): void {
    if (!this.DevolucionesATrasladar) return;
    
    //console.log('Trasladando devolución:', this.DevolucionesATrasladar);
    
    const fechaActual = new Date();

    const trasladar = {
      devo_Id: this.DevolucionesATrasladar.devo_Id,
      fact_Id: 0,
      devo_Fecha: fechaActual.toISOString(),
      devo_Motivo: '',
      usua_Creacion: 0,
      devo_FechaCreacion: fechaActual.toISOString(),
      usua_Modificacion: getUserId(),
      devo_FechaModificacion: fechaActual.toISOString(),
      devo_Estado: true,
      devo_EnSucursal: true,
      nombre_Completo: '',
      clie_NombreNegocio: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      devoDetalle_XML: ''
    };

    this.http.post(`${environment.apiBaseUrl}/Devoluciones/Trasladar`, trasladar, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        //console.log('Respuesta del servidor:', response);
        
        // Verificar el código de estado en la respuesta
        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            // Éxito: eliminado correctamente
            //console.log('Proceso completado exitosamente');
            this.mensajeExito = `Operación completada exitosamente.`;
            this.mostrarAlertaExito = true;
            
            // Ocultar la alerta después de 3 segundos
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 3000);
            

            this.cargardatos(false);
            this.cancelarTrasladar();
          } else if (response.data.code_Status === -1) {
            //result: está siendo utilizado
            //console.log('Ya se completo esta devolución.');
            this.mostrarAlertaWarning = true;
            this.mensajeWarning = response.data.message_Status || 'Ya se completo esta devolución..';
            
            setTimeout(() => {
              this.mostrarAlertaWarning = false;
              this.mensajeWarning = '';
            }, 5000);
            
            // Cerrar el modal de confirmación
            this.cancelarTrasladar();
          } else if (response.data.code_Status === 0) {
            // Error general
            //console.log('Error al completar la operación.');
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'Error al completar la operación.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            // Cerrar el modal de confirmación
            this.cancelarTrasladar();
          }
        } else {
          // Respuesta inesperada
          //console.log('Respuesta inesperada del servidor');
          this.mostrarAlertaError = true;
          this.mensajeError = response.message || 'Error inesperado al completar la supu operación.';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          
          // Cerrar el modal de confirmación
          this.cancelarTrasladar();
        }
      },
    });
  }

  // Declaramos un estado en el cargarDatos, esto para hacer el overlay
  // segun dicha funcion de recargar, ya que si vienes de hacer una accion
  // es innecesario mostrar el overlay de carga
  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Devoluciones[]>(`${environment.apiBaseUrl}/Devoluciones/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: data => {
        const tienePermisoListar = this.accionPermitida && this.accionPermitida('listar');
        const userId = typeof getUserId === 'function' ? getUserId() : null;

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(p => p.usua_Creacion?.toString() === userId?.toString());

        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          this.table.setData(datosFiltrados);
        }, 500);

        // Asignar numeración de filas
        datosFiltrados.forEach((devoluciones, index) => {
          devoluciones.No = index + 1;
        });
      },
      error: error => {
        console.error('Error al cargar proveedores:', error);
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          this.table.setData([]);
        }, 500);
      }
    });
  }

  //Exportar reportes
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
        department: this.exportConfig.department,      }
    };
  }

  /**
   * Obtiene y prepara los datos para exportación
   */
 private obtenerDatosExport(): any[] {
  try {
    const datos = this.table.data$.value;// Use the array for cards

    if (!Array.isArray(datos) || datos.length === 0) {
      throw new Error('No hay datos disponibles para exportar');
    }

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
}