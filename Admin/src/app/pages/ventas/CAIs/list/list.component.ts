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
import { CAIs } from 'src/app/Modelos/ventas/CAIs.Model';
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


private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de CAIS',                    // Título del reporte
    filename: 'CAIS',                           // Nombre base del archivo
    department: 'Ventas',                         // Departamento
    
    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Codigo', header: 'Codigo', width: 25, align: 'left' as const },
      { key: 'Descripción', header: 'Descripción', width: 50, align: 'left' as const }
    ] as ExportColumn[],
    
    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (CAI: CAIs, index: number) => ({
      'No': CAI?.No || (index + 1),
      'Codigo': this.limpiarTexto(CAI.nCai_Codigo),
      'Descripción': this.limpiarTexto(CAI?.nCai_Descripcion)
      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(modelo?.campo),
    })
  };

  // bread crumb items
  breadCrumbItems!: Array<{}>;

    // Estado de exportación
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

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
      { label: 'CAIs', active: true }
    ];

    // Obtener acciones disponibles del usuario (ejemplo: desde API o localStorage)
    this.cargarAccionesUsuario();
    console.log('Acciones disponibles:', this.accionesDisponibles);
  }

  // Métodos para los botones de acción principales (crear, editar, detalles)
  crear(): void {
    console.log('Toggleando formulario de creación...');
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  editar(cai: CAIs): void {
    console.log('Abriendo formulario de edición para:', cai);
    console.log('Datos específicos:', {
      id: cai.nCai_Id,
      codigo: cai.nCai_Codigo,
      descripcion: cai.nCai_Descripcion,
      completo: cai
    });
    this.caiEditando = { ...cai }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(cai: CAIs): void {
    console.log('Abriendo detalles para:', cai);
    this.caiDetalle = { ...cai }; // Hacer copia profunda
    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  constructor(
    public table: ReactiveTableService<CAIs>, 
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargarDatos();
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
        department: this.exportConfig.department
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
      return datos.map((CAIS, index) => 
        this.exportConfig.dataMapping.call(this, CAIS, index)
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

  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false; // Control del collapse
  showEditForm = false; // Control del collapse de edición
  showDetailsForm = false; // Control del collapse de detalles
  caiEditando: CAIs | null = null;
  caiDetalle: CAIs | null = null;
  
  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  caiAEliminar: CAIs | null = null;

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.caiEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.caiDetalle = null;
  }

  guardarCai(cai: CAIs): void {
    console.log('CAI guardado exitosamente desde create component:', cai);
    // Recargar los datos de la tabla
    this.cargarDatos();
    this.cerrarFormulario();
  }

  actualizarCai(cai: CAIs): void {
    console.log('CAI actualizado exitosamente desde edit component:', cai);
    // Recargar los datos de la tabla
    this.cargarDatos();
    this.cerrarFormularioEdicion();
  }

  confirmarEliminar(cai: CAIs): void {
    console.log('Solicitando confirmación para eliminar:', cai);
    this.caiAEliminar = cai;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.caiAEliminar = null;
  }

  eliminar(): void {
  if (!this.caiAEliminar) return;
  
  console.log('Eliminando CAI:', this.caiAEliminar);
  
  // Cambiar de POST a PUT y ajustar la URL según el endpoint del backend
  this.http.put(`${environment.apiBaseUrl}/CaiS/Eliminar/${this.caiAEliminar.nCai_Id}`, {}, {
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
          console.log('CAI eliminado exitosamente');
          this.mensajeExito = `CAI "${this.caiAEliminar!.nCai_Descripcion}" eliminado exitosamente`;
          this.mostrarAlertaExito = true;
          
          // Ocultar la alerta después de 3 segundos
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.mensajeExito = '';
          }, 3000);
          
          this.cargarDatos();
          this.cancelarEliminar();
        } else if (response.data.code_Status === -1) {
          //result: está siendo utilizado
          console.log('CAI está siendo utilizado');
          this.mostrarAlertaError = true;
          this.mensajeError = response.data.message_Status || 'No se puede eliminar: el CAI está siendo utilizado.';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          
          // Cerrar el modal de confirmación
          this.cancelarEliminar();
        } else if (response.data.code_Status === 0) {
          // Error general
          console.log('Error general al eliminar');
          this.mostrarAlertaError = true;
          this.mensajeError = response.data.message_Status || 'Error al eliminar el CAI.';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          
          // Cerrar el modal de confirmación
          this.cancelarEliminar();
        }
      } else {
        // Respuesta inesperada
        console.log('Respuesta inesperada del servidor');
        this.mostrarAlertaError = true;
        this.mensajeError = response.message || 'Error inesperado al eliminar el CAI.';
        
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
        
        // Cerrar el modal de confirmación
        this.cancelarEliminar();
      }
    },
    error: (error) => {
      console.error('Error en la petición:', error);
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error de conexión al eliminar el CAI.';
      
      setTimeout(() => {
        this.mostrarAlertaError = false;
        this.mensajeError = '';
      }, 5000);
      
      // Cerrar el modal de confirmación
      this.cancelarEliminar();
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

  // Método para cargar las acciones disponibles del usuario
  private cargarAccionesUsuario(): void {
    // Obtener permisosJson del localStorage
    const permisosRaw = localStorage.getItem('permisosJson');
    console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // Buscar el módulo de CAIs (ajusta el ID de pantalla si es diferente)
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla - ajusta este ID según corresponda a CAIs
          modulo = permisos.find((m: any) => m.Pant_Id === 16); // Cambia el ID según tu configuración
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo = permisos['CAIs'] || permisos['cais'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          console.log('Acciones del módulo:', modulo.Acciones);
          // Extraer solo el nombre de la acción
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
          console.log('Acciones del módulo:', accionesArray);
        }
      } catch (e) {
        console.error('Error al parsear permisosJson:', e);
      }
    }
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLowerCase());
    console.log('Acciones finales:', this.accionesDisponibles);
  }

  private cargarDatos(): void {
    this.http.get<CAIs[]>(`${environment.apiBaseUrl}/CAIs/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      console.log('Datos recargados:', data);
      this.table.setData(data);
    });
  }
}