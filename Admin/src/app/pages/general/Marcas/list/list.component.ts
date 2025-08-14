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
import { Marcas } from 'src/app/Modelos/general/Marcas.Model';
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
  // Variable para controlar el estado de carga
  mostrarOverlayCarga = false;
  ngOnInit(): void {
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'General' },
      { label: 'Marcas', active: true }
    ];
    // Obtener acciones disponibles del usuario
    this.cargarAccionesUsuario();
    console.log('Acciones disponibles:', this.accionesDisponibles);
  }
  // bread crumb items
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario en esta pantalla
  accionesDisponibles: string[] = [];

  // Método robusto para validar si una acción está permitida
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  // Estado para controlar el dropdown activo
  activeActionRow: number | null = null;

  // Cierra el dropdown si se hace click fuera
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

    // Método para cargar las acciones disponibles del usuario
    private cargarAccionesUsuario(): void {
      // Obtener permisosJson del localStorage
      const permisosRaw = localStorage.getItem('permisosJson');
      console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
      let accionesArray: string[] = [];
      if (permisosRaw) {
        try {
          const permisos = JSON.parse(permisosRaw);
          // Buscar el módulo de Estados Civiles (ajusta el nombre si es diferente)
          let modulo = null;
          if (Array.isArray(permisos)) {
            // Buscar por ID de pantalla (ajusta el ID si cambia en el futuro)
            modulo = permisos.find((m: any) => m.Pant_Id === 15);
          } else if (typeof permisos === 'object' && permisos !== null) {
            // Si es objeto, buscar por clave
            modulo = permisos['Marcas'] || permisos['marcas'] || null;
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
      console.log('Acciones finales:', this.accionesDisponibles);
    }

  // Métodos para los botones de acción principales (crear, editar, detalles)
  crear(): void {
    if (!this.accionPermitida('crear')) return;
    
    console.log('Toggleando formulario de creación...');
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  editar(marca: Marcas): void {
    if (!this.accionPermitida('editar')) return;
    
    console.log('Abriendo formulario de edición para:', marca);
    this.marcaEditando = { ...marca }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(marca: Marcas): void {
    if (!this.accionPermitida('detalle')) return;
    
    console.log('Abriendo detalles para:', marca);
    this.marcaDetalle = { ...marca }; // Hacer copia profunda
    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false; // Control del collapse
  showEditForm = false; // Control del collapse de edición
  showDetailsForm = false; // Control del collapse de detalles
  marcaEditando: Marcas | null = null;
  marcaDetalle: Marcas | null = null;

  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  marcaAEliminar: Marcas | null = null;

  // Variables para exportación
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  // Configuración de exportación
  private exportConfig = {
    title: 'Listado de Marcas',
    filename: 'Marcas',
    columns: [
      { header: 'No.', key: 'secuencia' },
      { header: 'Descripción', key: 'marc_Descripcion' }
    ],
    data: [] as any[]
  };

  constructor(
    public table: ReactiveTableService<Marcas>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargardatos();
  }

  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  // (navigateToCreate eliminado, lógica movida a crear)

  // (navigateToEdit y navigateToDetails eliminados, lógica movida a editar y detalles)

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.marcaEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.marcaDetalle = null;
  }

  guardarMarca(marca: Marcas): void {
    console.log('Marca guardada exitosamente desde create component:', marca);
    // Mostrar mensaje de éxito
    this.mensajeExito = `Marca "${marca.marc_Descripcion}" creada exitosamente`;
    this.mostrarAlertaExito = true;
    
    // Ocultar la alerta después de 3 segundos
    setTimeout(() => {
      this.mostrarAlertaExito = false;
      this.mensajeExito = '';
    }, 3000);
    
    // Recargar los datos de la tabla
    this.cargardatos();
    this.cerrarFormulario();
  }

  actualizarMarca(marca: Marcas): void {
    console.log('Marca actualizada exitosamente desde edit component:', marca);
    // Mostrar mensaje de éxito
    this.mensajeExito = `Marca "${marca.marc_Descripcion}" actualizada exitosamente`;
    this.mostrarAlertaExito = true;
    
    // Ocultar la alerta después de 3 segundos
    setTimeout(() => {
      this.mostrarAlertaExito = false;
      this.mensajeExito = '';
    }, 3000);
    
    // Recargar los datos de la tabla
    this.cargardatos();
    this.cerrarFormularioEdicion();
  }

  confirmarEliminar(marca: Marcas): void {
    console.log('Solicitando confirmación para eliminar:', marca);
    this.marcaAEliminar = marca;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.marcaAEliminar = null;
  }

  eliminar(): void {
    if (!this.marcaAEliminar) return;
    
    console.log('Eliminando marca:', this.marcaAEliminar);
    this.mostrarOverlayCarga = true;
    
    this.http.post(`${environment.apiBaseUrl}/Marcas/Eliminar/${this.marcaAEliminar.marc_Id}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        console.log('Respuesta del servidor:', response);
        
        // Verificar el código de estado en la respuesta
        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            // Éxito: eliminado correctamente
            console.log('Marca eliminada exitosamente');
            this.mensajeExito = `Marca "${this.marcaAEliminar!.marc_Descripcion}" eliminada exitosamente`;
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
            console.log('Marca está siendo utilizada');
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'No se puede eliminar: la marca está siendo utilizada.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            this.cancelarEliminar();
          } else if (response.data.code_Status === 0) {
            // Error general
            console.log('Error general al eliminar');
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'Error al eliminar la marca.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            this.cancelarEliminar();
          }
        } else {
          // Respuesta inesperada
          console.log('Respuesta inesperada del servidor');
          this.mostrarAlertaError = true;
          this.mensajeError = response.message || 'Error inesperado al eliminar la marca.';
          
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
        this.mensajeError = 'Error de conexión al intentar eliminar la marca. Por favor, intente nuevamente.';
        
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

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Métodos específicos para cada tipo de exportación
  exportarExcel(): Promise<void> {
    return this.exportar('excel');
  }

  exportarPDF(): Promise<void> {
    return this.exportar('pdf');
  }

  exportarCSV(): Promise<void> {
    return this.exportar('csv');
  }

  // Verifica si se puede exportar un tipo específico
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
      return datos.map((marca, index) => ({
        secuencia: marca.secuencia,
        marc_Descripcion: this.limpiarTexto(marca.marc_Descripcion)
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

  private cargardatos(): void {
    this.mostrarOverlayCarga = true;
    this.http.get<Marcas[]>(`${environment.apiBaseUrl}/Marcas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        console.log('Datos recargados:', data);
        this.table.setData(data);
      },
      error: (error) => {
        console.error('Error al cargar los datos:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los datos de las marcas. Por favor, intente nuevamente.';
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