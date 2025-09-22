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
import { MarcasVehiculos } from 'src/app/Modelos/general/MarcasVehiculos.model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
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
    CreateComponent,
    EditComponent,
    DetailsComponent
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  // Variable para controlar el estado de carga
  mostrarOverlayCarga = false;

  // bread crumb items
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario en esta pantalla
  accionesDisponibles: string[] = [];

  // Método robusto para validar si una acción está permitida
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  ngOnInit(): void {
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'General' },
      { label: 'Marcas De Vehiculos', active: true }
    ];
    // Obtener acciones disponibles del usuario
    this.cargarAccionesUsuario();
    //console.log('Acciones disponibles:', this.accionesDisponibles);
  }

  // Método para cargar las acciones disponibles del usuario
  private cargarAccionesUsuario(): void {
    // Obtener permisosJson del localStorage
    const permisosRaw = localStorage.getItem('permisosJson');
    //console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // Buscar el módulo de Marcas de Vehiculos (ajusta el ID si es diferente)
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla (ajusta el ID si cambia en el futuro)
          modulo = permisos.find((m: any) => m.Pant_Id === 16); // ID para Marcas de Vehiculos
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo = permisos['MarcasVehiculos'] || permisos['marcasvehiculos'] || null;
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
    //console.log('Acciones finales:', this.accionesDisponibles);
  }

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
  // Métodos para los botones de acción principales (crear, editar, detalles)
  crear(): void {
    //console.log('Toggleando formulario de creación...');
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  editar(marcasVehiculos: MarcasVehiculos): void {
 
    this.marcasVehiculosEditando = { ...marcasVehiculos }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(marcasVehiculos: MarcasVehiculos): void {
    //console.log('Abriendo detalles para:', marcasVehiculos);
    this.marcasVehiculosDetalle = { ...marcasVehiculos }; // Hacer copia profunda
    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false; // Control del collapse
  showEditForm = false; // Control del collapse de edición
  showDetailsForm = false; // Control del collapse de detalles
  marcasVehiculosEditando: MarcasVehiculos | null = null;
  marcasVehiculosDetalle: MarcasVehiculos | null = null;
  
  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  marcasVehiculosAEliminar: MarcasVehiculos | null = null;
formatearNumero(valor: number): string {
  return Math.floor(valor).toString();
}

  private readonly exportConfig = {
    
    // Configuración básica
    title: 'Listado de Marcas de Vehículos',
    filename: 'MarcasVehiculos',
    department: 'General',
    // additionalInfo: 'Sistema de Gestión',
    
    // Columnas a exportar
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Marca', header: 'Marca', width: 35, align: 'left' as const },
      // { key: 'FechaCreacion', header: 'Fecha Creación', width: 25, align: 'center' as const },
      // { key: 'Estado', header: 'Estado', width: 15, align: 'center' as const }
    ] as ExportColumn[],
    
    // Mapeo de datos para la entidad MarcasVehiculos
    dataMapping: (marca: MarcasVehiculos, index: number) => ({
      'No': this.formatearNumero(marca?.secuencia || (index + 1)),
      'Marca': this.limpiarTexto(marca?.maVe_Marca),
      // 'FechaCreacion': marca?.maVe_FechaCreacion ? new Date(marca.maVe_FechaCreacion).toLocaleDateString() : '',
      // 'Estado': marca?.maVe_Estado ? 'Activo' : 'Inactivo'
    })
  };

  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  constructor(public table: ReactiveTableService<MarcasVehiculos>, 
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute, 
    private exportService: ExportService,
    public floatingMenuService: FloatingMenuService) {
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
    this.marcasVehiculosEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.marcasVehiculosDetalle = null;
  }

  guardarMarcasVehiculos(marcasVehiculos: MarcasVehiculos): void {
    //console.log('Marcas vehículos guardado exitosamente desde create component:', marcasVehiculos);
    // Recargar los datos de la tabla
    this.cargardatos();
    this.cerrarFormulario();
  }

  actualizarMarcasVehiculos(marcasVehiculos: MarcasVehiculos): void {
    //console.log('Marcas vehículos actualizado exitosamente desde edit component:', marcasVehiculos);
    // Recargar los datos de la tabla
    this.cargardatos();
    this.cerrarFormularioEdicion();
  }

  confirmarEliminar(marcasVehiculos: MarcasVehiculos): void {
    //console.log('Solicitando confirmación para eliminar:', marcasVehiculos);
    this.marcasVehiculosAEliminar = marcasVehiculos;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.marcasVehiculosAEliminar = null;
  }

  eliminar(): void {
    if (!this.marcasVehiculosAEliminar) return;
    
    //console.log('Eliminando marcas vehículos:', this.marcasVehiculosAEliminar);
    
    this.http.post(`${environment.apiBaseUrl}/MarcasVehiculos/Eliminar/${this.marcasVehiculosAEliminar.maVe_Id}`, {}, {
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
            //console.log('Marcas vehículos eliminado exitosamente');
            this.mensajeExito = `Marcas vehículos "${this.marcasVehiculosAEliminar!.maVe_Marca}" eliminado exitosamente`;
            this.mostrarAlertaExito = true;
            
            // Ocultar la alerta después de 3 segundos
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 3000);
            

            this.cargardatos();
            this.cancelarEliminar();
          } else if (response.data.code_Status === -1) {
            //result: está siendo utilizado
            //console.log('Marcas vehículos está siendo utilizado');
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'No se puede eliminar: las marcas vehículos está siendo utilizado.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            // Cerrar el modal de confirmación
            this.cancelarEliminar();
          } else if (response.data.code_Status === 0) {
            // Error general
            //console.log('Error general al eliminar marcas vehículos');
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'Error al eliminar las marcas vehículos.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            // Cerrar el modal de confirmación
            this.cancelarEliminar();
          }
        } else {
          // Respuesta inesperada
          //console.log('Respuesta inesperada del servidor');
          this.mostrarAlertaError = true;
          this.mensajeError = response.message || 'Error inesperado al eliminar las marcas vehículos.';
          
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
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
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
        break;
      case 'error':
        this.mostrarAlertaError = true;
        this.mensajeError = mensaje;
        break;
      case 'warning':
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        break;
      case 'info':
        // Podrías implementar un tipo adicional de alerta si lo necesitas
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        break;
    }
    
    setTimeout(() => this.cerrarAlerta(), duracion);
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
      columns: this.exportConfig.columns,
      metadata: {
        department: this.exportConfig.department,
        // additionalInfo: this.exportConfig.additionalInfo
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
      return datos.map((marca, index) => 
        this.exportConfig.dataMapping.call(this, marca, index)
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

  private cargardatos(): void {
    this.mostrarOverlayCarga = true;
    this.http.get<MarcasVehiculos[]>(`${environment.apiBaseUrl}/MarcasVehiculos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        //console.log('Datos recargados:', data);
        this.table.setData(data);
      },
      error: (error) => {
        console.error('Error al cargar los datos:', error);
        this.mostrarOverlayCarga = false;
      },
      complete: () => {
        this.mostrarOverlayCarga = false;
      }
    });
  }
}