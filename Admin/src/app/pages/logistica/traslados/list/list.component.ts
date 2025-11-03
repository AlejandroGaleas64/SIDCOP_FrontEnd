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
import { Traslado } from 'src/app/Modelos/logistica/TrasladoModel';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { getUserId } from 'src/app/core/utils/user-utils';
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
    DetailsComponent,
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {

private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Traslados',                    // Título del reporte
    filename: 'Traslados',                           // Nombre base del archivo
    department: 'Logistica',                         // Departamento
    
    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Origen', header: 'Origen', width: 25, align: 'left' as const },
      { key: 'Destino', header: 'Destino', width: 50, align: 'left' as const },
      { key: 'Fecha', header: 'Fecha', width: 20, align: 'center' as const },
      { key: 'Observaciones', header: 'Observaciones', width: 50, align: 'left' as const }
    ] as ExportColumn[],
    
    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (traslados: Traslado, index: number) => ({
      'No': traslados?.No || (index + 1),
      'Origen': this.limpiarTexto(traslados?.origen),
      'Destino': this.limpiarTexto(traslados?.destino),
      'Fecha': this.limpiarTexto(traslados?.tras_Fecha),
        'Observaciones': (traslados?.tras_Observaciones == null || this.limpiarTexto(traslados?.tras_Observaciones) === '')
    ? 'Sin Observaciones'
    : this.limpiarTexto(traslados?.tras_Observaciones),
      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(modelo?.campo),
    })
  };


  breadCrumbItems!: Array<{}>;

  /**
   * Acciones disponibles para el usuario en esta pantalla
   */
  accionesDisponibles: string[] = [];

  /**
   * Valida si una acción específica está permitida para el usuario actual
   * @param accion - Nombre de la acción a validar (ej: 'crear', 'editar', 'eliminar')
   * @returns true si la acción está permitida, false en caso contrario
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  /**
   * Estado de exportación
   */
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  // Propiedades para control de formularios
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;
  trasladoEditando: Traslado | null = null;
  trasladoDetalle: Traslado | null = null;
  trasladoIdDetalle: number | null = null;
  
  // Propiedades para overlay de carga
  mostrarOverlayCarga = false;
  
  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  trasladoAEliminar: Traslado | null = null;

  /**
   * Inicializa el componente configurando breadcrumbs y cargando permisos de usuario
   */
  ngOnInit(): void {
    // Configurar navegación breadcrumb
    this.breadCrumbItems = [
      { label: 'Logística' },
      { label: 'Traslados', active: true }
    ];

    // Cargar acciones disponibles según permisos del usuario
    this.cargarAccionesUsuario();
  }
  
  /**
   * Abre/cierra el formulario de creación de traslados
   * Cierra otros formularios abiertos para evitar conflictos
   */
  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  /**
   * Abre el formulario de edición para un traslado específico
   * @param traslado - Objeto traslado a editar
   */
  editar(traslado: Traslado): void {
    this.trasladoEditando = { ...traslado }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  /**
   * Abre el formulario de detalles para un traslado específico
   * @param traslado - Objeto traslado del cual mostrar detalles
   */
  detalles(traslado: Traslado): void {
    // Usar el ID para cargar datos actualizados desde el API
    this.trasladoIdDetalle = traslado.tras_Id;
    this.trasladoDetalle = null; // Limpiar datos previos
    
    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }
  
  /**
   * Constructor del componente
   * Inyecta servicios y componentes necesarios
   */
  constructor(public table: ReactiveTableService<Traslado>, 
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute,
    private exportService: ExportService,
    public floatingMenuService: FloatingMenuService
  ) {
    this.cargardatos();
  }   

  /**
   * Método unificado para exportar datos en diferentes formatos
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
      console.error(`Error en exportación ${tipo}:`, error);
      this.mostrarMensaje('error', `Error al exportar archivo ${tipo.toUpperCase()}`);
    } finally {
      this.exportando = false;
      this.tipoExportacion = null;
    }
  }

  /**
   * Exporta los datos de traslados a formato Excel
   */
  async exportarExcel(): Promise<void> {
    await this.exportar('excel');
  }

  /**
   * Exporta los datos de traslados a formato PDF
   */
  async exportarPDF(): Promise<void> {
    await this.exportar('pdf');
  }

  /**
   * Exporta los datos de traslados a formato CSV
   */
  async exportarCSV(): Promise<void> {
    await this.exportar('csv');
  }

  /**
   * Verifica si se puede exportar datos en un formato específico
   * @param tipo - Formato de exportación a verificar (opcional)
   * @returns true si se puede exportar, false en caso contrario
   */
  puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
    if (this.exportando) {
      return tipo ? this.tipoExportacion !== tipo : false;
    }
    return this.table.data$.value?.length > 0;
  }

  /**
   * Crea la configuración de exportación de forma dinámica
   * @returns Configuración de exportación
   */
  private crearConfiguracionExport(): ExportConfig {
    return {
      title: this.exportConfig.title,
      filename: this.exportConfig.filename,
      data: this.obtenerDatosExport(),
      columns: this.exportConfig.columns,
      metadata: {
        department: this.exportConfig.department,
      }
    };
  }

  /**
   * Obtiene y prepara los datos para exportación
   * @returns Datos preparados para exportación
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
   * @param resultado - Resultado de la exportación
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
   * @returns true si se puede exportar, false en caso contrario
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
   * @param texto - Texto a limpiar
   * @returns Texto limpio
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
   * Muestra un mensaje al usuario
   * @param tipo - Tipo de mensaje (success, error, warning, info)
   * @param mensaje - Mensaje a mostrar
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
   * Cierra todas las alertas activas y limpia sus mensajes
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
   * Cierra el formulario de creación de traslados
   */
  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  /**
   * Cierra el formulario de edición y limpia los datos temporales
   */
  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.trasladoEditando = null;
  }

  /**
   * Cierra el formulario de detalles y limpia los datos temporales
   */
  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.trasladoDetalle = null;
    this.trasladoIdDetalle = null;
  }

  /**
   * Maneja el evento de guardado exitoso de un nuevo traslado
   * @param traslado - Objeto traslado que fue guardado
   */
  guardarTraslado(traslado: Traslado): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos();
      this.showCreateForm = false;
      this.mensajeExito = `Traslado guardado exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  /**
   * Maneja el evento de actualización exitosa de un traslado
   * @param traslado - Objeto traslado que fue actualizado
   */
  actualizarTraslado(traslado: Traslado): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos();
      this.showEditForm = false;
      this.mensajeExito = `Traslado actualizado exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  /**
   * Muestra el modal de confirmación para eliminar un traslado
   * @param traslado - Objeto traslado a eliminar
   */
  confirmarEliminar(traslado: Traslado): void {
    this.trasladoAEliminar = traslado;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }

  /**
   * Cancela la operación de eliminación y cierra el modal de confirmación
   */
  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.trasladoAEliminar = null;
  }

  /**
   * Ejecuta la eliminación del traslado seleccionado
   * Realiza validaciones y maneja la respuesta del servidor
   */
  eliminar(): void {
    if (!this.trasladoAEliminar) return;
    
    if (this.mostrarOverlayCarga) return;
    
    this.mostrarOverlayCarga = true;
    
    const trasladoTemp = { ...this.trasladoAEliminar };
    this.mostrarConfirmacionEliminar = false;
    
    this.http.post(`${environment.apiBaseUrl}/Traslado/Eliminar/${trasladoTemp.tras_Id}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          this.trasladoAEliminar = null;
          
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              this.mensajeExito = `Traslado del "${trasladoTemp.origen}" al "${trasladoTemp.destino}" eliminado exitosamente`;
              this.mostrarAlertaExito = true;
              
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);
              
              this.cargardatos();
            } else if (response.data.code_Status === -1) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'No se puede eliminar: el traslado está siendo utilizado.';
              
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            } else if (response.data.code_Status === 0) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'Error al eliminar el traslado.';
              
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            }
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = response.message || 'Error inesperado al eliminar el traslado.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        }, 1000);
      },
      error: (error) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          this.trasladoAEliminar = null;
          console.error('Error en la petición:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error de conexión al eliminar el traslado.';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }, 1000);
      }
    });
  }

  /**
   * Carga las acciones disponibles para el usuario desde localStorage
   * Busca permisos específicos del módulo de traslados
   */
  private cargarAccionesUsuario(): void {
    // OBTENEMOS PERMISOSJSON DEL LOCALSTORAGE
    const permisosRaw = localStorage.getItem('permisosJson');
    //console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // BUSCAMOS EL MÓDULO DE TRASLADOS
        let modulo = null;
        if (Array.isArray(permisos)) {
          // BUSCAMOS EL MÓDULO DE TRASLADOS POR ID (cambiar ID según corresponda)
          modulo = permisos.find((m: any) => m.Pant_Id === 15); // Ajustar ID según el módulo de traslados
        } else if (typeof permisos === 'object' && permisos !== null) {
          // ESTO ES PARA CUANDO LOS PERMISOS ESTÁN EN UN OBJETO CON CLAVES
          modulo = permisos['Traslados'] || permisos['traslados'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          // AQUI SACAMOS SOLO EL NOMBRE DE LA ACCIÓN
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
          //console.log('Acciones del módulo:', accionesArray);
        }
      } catch (e) {
        console.error('Error al parsear permisosJson:', e);
      }
    } 
    // AQUI FILTRAMOS Y NORMALIZAMOS LAS ACCIONES
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLowerCase());
    //console.log('Acciones finales:', this.accionesDisponibles);
  }

  /**
   * Carga los datos de traslados desde el API
   * Aplica filtros de permisos según el usuario
   */
  private cargardatos(): void {
    this.mostrarOverlayCarga = true;

    this.http.get<Traslado[]>(`${environment.apiBaseUrl}/Traslado/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: data => {
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(t => t.usua_Creacion?.toString() === userId.toString());

        // Asignar numeración de filas
        datosFiltrados.forEach((traslado, index) => {
          traslado.No = index + 1;
          traslado.tras_Observaciones =
            traslado.tras_Observaciones == null ||
            this.limpiarTexto(traslado.tras_Observaciones) === ''
              ? 'Sin Observaciones'
              : traslado.tras_Observaciones;
        });

        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          this.table.setData(datosFiltrados);
        }, 500);
      },
      error: error => {
        console.error('Error al cargar traslados:', error);
        this.mostrarOverlayCarga = false;
        this.table.setData([]);
      }
    });
}
}