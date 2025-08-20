import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
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
import { Sucursales } from 'src/app/Modelos/general/Sucursales.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/exportHori.service';


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
        style({ opacity: 0, height: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, height: 0 }))
      ])
    ])
  ]
})
export class ListComponent implements OnInit {
  private readonly exportConfig = {
        // Configuración básica
        title: 'Listado de Sucursales',                    // Título del reporte
        filename: 'Sucursales',                           // Nombre base del archivo
  
        // Columnas a exportar - TODOS LOS DATOS DE SUCURSALES
        columns: [
          { key: 'No', header: 'No.', width: 8, align: 'center' as const },
          { key: 'ID', header: 'ID', width: 10, align: 'center' as const },
          { key: 'Descripción', header: 'Descripción', width: 25, align: 'left' as const },
          { key: 'Colonia', header: 'Colonia', width: 20, align: 'left' as const },
          { key: 'Dirección', header: 'Dirección', width: 30, align: 'left' as const },
          { key: 'Teléfono 1', header: 'Teléfono 1', width: 15, align: 'left' as const },
          { key: 'Teléfono 2', header: 'Teléfono 2', width: 15, align: 'left' as const },
          { key: 'Código', header: 'Código', width: 15, align: 'left' as const },
          { key: 'Correo', header: 'Correo', width: 25, align: 'left' as const },
        ] as ExportColumn[],

        // Mapeo de datos - TODOS LOS DATOS DE SUCURSALES
        dataMapping: (modelo: Sucursales, index: number) => ({
          'No': modelo?.secuencia || (index + 1),
          'ID': modelo?.sucu_Id ?? '',
          'Descripción': this.limpiarTexto(modelo?.sucu_Descripcion),
          'Colonia': modelo?.colo_Id ?? '',
          'Dirección': this.limpiarTexto(modelo?.sucu_DireccionExacta),
          'Teléfono 1': this.limpiarTexto(modelo?.sucu_Telefono1),
          'Teléfono 2': this.limpiarTexto(modelo?.sucu_Telefono2),
          'Código': this.limpiarTexto(modelo?.sucu_Codigo),
          'Correo': this.limpiarTexto(modelo?.sucu_Correo),
        })
      };
  // Overlay de carga animado
  mostrarOverlayCarga = false;
  breadCrumbItems!: Array<{}>;
  accionesDisponibles: string[] = [];

  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'General' },
      { label: 'Sucursales', active: true }
    ];
    this.cargarAccionesUsuario();
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

  // Dropdown y control de formularios
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;
  sucursalEditando: Sucursales | null = null;
  sucursalDetalle: Sucursales | null = null;
  exportando = false;

  // Alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  sucursalAEliminar: Sucursales | null = null;

  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  // Ordenamiento
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    public table: ReactiveTableService<Sucursales>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargarDatos(true);
  }

  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  editar(sucursal: Sucursales): void {
    this.sucursalEditando = { ...sucursal };
    console.log('Editar sucursal:', this.sucursalEditando);
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  detalles(sucursal: Sucursales): void {
    this.sucursalDetalle = { ...sucursal };
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
    this.sucursalEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.sucursalDetalle = null;
  }

  guardarSucursal(sucursal: Sucursales): void {
    this.cargarDatos(false);
    this.cerrarFormulario();
  }
  actualizarSucursal(sucursal: Sucursales): void {
    this.cargarDatos(false);
    this.cerrarFormularioEdicion();
  }

  confirmarEliminar(sucursal: Sucursales): void {
    this.sucursalAEliminar = sucursal;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }


  eliminar(): void {
    if (!this.sucursalAEliminar) return;
    this.mostrarOverlayCarga = true;
    this.http.post<any>(`${environment.apiBaseUrl}/Sucursales/Eliminar/${this.sucursalAEliminar.sucu_Id}`, {}, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            this.mensajeExito = `Sucursal "${this.sucursalAEliminar!.sucu_Descripcion}" eliminada exitosamente`;
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 3000);
            this.cargarDatos(false);
            this.cancelarEliminar();
          } else if (response.data.code_Status === -1) {
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'No se puede eliminar: la sucursal está siendo utilizada.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            this.cancelarEliminar();
          } else if (response.data.code_Status === 0) {
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'Error al eliminar la sucursal.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            this.cancelarEliminar();
          }
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response.message || 'Error inesperado al eliminar la sucursal.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          this.cancelarEliminar();
        }
      },
      error: (err) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          const codeStatus = err?.error?.data?.code_Status;
          const messageStatus = err?.error?.data?.message_Status;
          this.mostrarAlertaError = true;
          if (codeStatus === -1) {
            this.mensajeError = messageStatus || 'No se puede eliminar: la sucursal está siendo utilizada.';
          } else if (codeStatus === 0) {
            this.mensajeError = messageStatus || 'Error al eliminar la sucursal.';
          } else {
            this.mensajeError = err?.error?.message || 'Error al eliminar la sucursal. Intenta de nuevo.';
          }
          setTimeout(() => {  
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          this.cancelarEliminar();
        }, 1000);
      }
    });
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.sucursalAEliminar = null;
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
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        if (Array.isArray(permisos)) {
          modulo = permisos.find((m: any) => m.Pant_Id === 20); // Ajusta el ID si es diferente
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Sucursales'] || permisos['sucursales'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
        // Silenciar error de parseo de permisosJson
      }
    }
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLowerCase());
  }

  private cargarDatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Sucursales[]>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      setTimeout(() => {
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());

        this.table.setData(datosFiltrados);
        this.table.setData(data);
        this.mostrarOverlayCarga = false;
      }, 500);
    });
  }
}