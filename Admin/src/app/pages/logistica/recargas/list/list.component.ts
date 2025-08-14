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
import { Recargas } from 'src/app/Modelos/logistica/Recargas.Model';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/export.service';
import { EditRecargaComponent } from 'src/app/pages/logistica/recargas/edit/edit.component';
import { DetailsComponent } from 'src/app/pages/logistica/recargas/details/details.component'; // Agregar este import

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
    EditRecargaComponent,
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

  
  //  Toda la config para los exports está aquí
  // =========================================
  private readonly exportConfig = {
    title: 'Listado de Recargas',
    filename: 'Recargas',
    department: 'Logistica',
    additionalInfo: '',
    
    columns: [
      { key: 'No', header: 'No.', width: 10, align: 'center' as const },
      { key: 'Bodega', header: 'Bodega', width: 60, align: 'left' as const },
      { key: 'Recarga Confirmación', header: 'Recarga Confirmación', width: 25, align: 'left' as const },
      { key: 'Fecha Recarga', header: 'Fecha Recarga', width: 20, align: 'left' as const },
      { key: 'Detalles', header: 'Detalles', width: 35, align: 'left' as const }
    ] as ExportColumn[],
    
    // Función que transforma los datos para la exportación
    dataMapping: (recargas: Recargas, index: number) => ({
      'No': recargas?.secuencia || (index + 1),
      'Bodega': this.limpiarTexto(recargas?.bode_Descripcion),
      'Recarga Confirmación': this.limpiarTexto(recargas?.reca_Confirmacion),
      'Fecha Recarga': this.limpiarTexto(recargas?.reca_Fecha),
      'Detalles': this.limpiarTexto(recargas?.detalles),
    })
  };

  // PROPIEDADES DEL COMPONENTE 
  // =========================================
  
  // Para el breadcrumb de navegación
  breadCrumbItems!: Array<{}>;
  
  // Control de permisos y datos del usuario logueado
  accionesDisponibles: string[] = [];
  currentUser: any = null;
  EsAdmin : boolean = false;
  
  // Para el menú de acciones en cada fila
  activeActionRow: number | null = null;

  // Control de formularios (crear, editar, detalles)
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;  // Ya existía

  // Variable para almacenar la recarga seleccionada para editar/ver
  recargaSeleccionada: Recargas | null = null;

  // Sistema de mensajes al usuario
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Estados de carga y exportación
  mostrarOverlayCarga = false;
  tieneRegistros = false;
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  //dependencias
  constructor(
    public table: ReactiveTableService<Recargas>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {}

  // INICIALIZACIÓN
  ngOnInit(): void {
    this.inicializarBreadcrumbs();
    this.inicializarUsuario();
    this.cargarDatosIniciales();
  }

  private inicializarBreadcrumbs(): void {
    this.breadCrumbItems = [
      { label: 'Logistica' },
      { label: 'Recargas', active: true }
    ];
  }

   // Carga datos del usuario y permisos
  private inicializarUsuario(): void {
    this.cargarDatosSesion();
    this.cargarAccionesUsuario();
  }

   //Carga los datos principales después de tener la info del usuario
  private cargarDatosIniciales(): void {
    if (!this.currentUser) {
      console.error('No se pueden cargar datos: usuario no inicializado');
      this.mostrarMensaje('error', 'Error de inicialización del usuario');
      return;
    }
    
    this.cargardatos(true);
  }

  private cargarDatosSesion(): void {
    try {
      const userId = getUserId();
      console.log('User ID from getUserId():', userId);
      
      // Get the currentUser object from localStorage
      const currentUserStr = localStorage.getItem('currentUser');
      let currentUser = null;
      let esAdmin = false;
      
      if (currentUserStr) {
        try {
          currentUser = JSON.parse(currentUserStr);
          esAdmin = currentUser?.usua_EsAdmin === true;
          console.log('Current user from localStorage:', currentUser);
          console.log('Is admin from currentUser:', esAdmin);
        } catch (e) {
          console.error('Error parsing currentUser:', e);
        }
      }
  
      if (!userId) {
        console.error('No se pudo obtener el ID del usuario');
        this.mostrarMensaje('error', 'Error al cargar datos del usuario');
        return;
      }
  
      // Set the current user with proper type conversion
      this.currentUser = {
        usua_Id: userId,
        sucu_Id: currentUser?.sucu_Id || 0,
        usua_EsAdmin: esAdmin
      };
  
      // Set the component property
      this.EsAdmin = this.currentUser.usua_EsAdmin;
      
      // Debug log to verify the value
      console.log('Final admin status:', this.EsAdmin);
      console.log('Current user object:', this.currentUser);
    } catch (error) {
      console.error('Error al cargar datos de sesión:', error);
      this.mostrarMensaje('error', 'Error al cargar configuración del usuario');
    }
  }

  
   //Carga las acciones/permisos disponibles del usuario para este módulo
    private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        
        // Buscar el módulo de recargas en los permisos
        if (Array.isArray(permisos)) {
          modulo = permisos.find((m: any) => m.Pant_Id === 33);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Recargas'] || permisos['recargas'] || null;
        }
        
        // Extraer acciones del módulo
        if (modulo?.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones
            .map((a: any) => a.Accion)
            .filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
        console.error('Error al parsear permisosJson:', e);
      }
    }
    
    // Normalizar acciones a minúsculas para comparación
    this.accionesDisponibles = accionesArray
      .filter(a => typeof a === 'string' && a.length > 0)
      .map(a => a.trim().toLowerCase());
  }

   //Checa si una acción específica está permitida para el usuario
  
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a === accion.trim().toLowerCase());
  }

  // MÉTODOS DE EXPORTACIÓN - Todo lo de exportar datos
  
   // Método principal para todas las exportaciones 
  async exportar(tipo: 'excel' | 'pdf' | 'csv'): Promise<void> {
    // No exportar si ya hay una en progreso
    if (this.exportando) {
      this.mostrarMensaje('warning', 'Ya hay una exportación en progreso...');
      return;
    }
    // Validar datos antes de exportar
    if (!this.validarDatosParaExport()) {
      return;
    }
    try {
      this.exportando = true;
      this.tipoExportacion = tipo;
      this.mostrarMensaje('info', `Generando archivo ${tipo.toUpperCase()}...`);
      
      const config = this.crearConfiguracionExport();
      let resultado;
      
      // Ejecutar exportación según el tipo
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

  // Métodos específicos para cada tipo 
  async exportarExcel(): Promise<void> { await this.exportar('excel'); }
  async exportarPDF(): Promise<void> { await this.exportar('pdf'); }
  async exportarCSV(): Promise<void> { await this.exportar('csv'); }

 //Verifica si se puede exportar (hay datos y no está exportando)
  puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
    if (this.exportando) {
      return tipo ? this.tipoExportacion !== tipo : false;
    }
    return this.table.data$.value?.length > 0;
  }


  // MÉTODOS DE EXPORTACIÓN
 
  private crearConfiguracionExport(): ExportConfig {
    return {
      title: this.exportConfig.title,
      filename: this.exportConfig.filename,
      data: this.obtenerDatosExport(),
      columns: this.exportConfig.columns,
      metadata: {
        department: this.exportConfig.department,
        additionalInfo: this.exportConfig.additionalInfo
      }
    };
  }

  
   //Obtiene y prepara los datos para exportación
  
  private obtenerDatosExport(): any[] {
    try {
      const datos = this.table.data$.value;
      
      if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error('No hay datos disponibles para exportar');
      }
      
      return datos.map((recargas, index) => 
        this.exportConfig.dataMapping.call(this, recargas, index)
      );
      
    } catch (error) {
      console.error('Error obteniendo datos:', error);
      throw error;
    }
  }

   //Maneja el resultado de las exportaciones
 
  private manejarResultadoExport(resultado: { success: boolean; message: string }): void {
    if (resultado.success) {
      this.mostrarMensaje('success', resultado.message);
    } else {
      this.mostrarMensaje('error', resultado.message);
    }
  }


 //Valida datos antes de exportar
 
  private validarDatosParaExport(): boolean {
    const datos = this.table.data$.value;
    
    if (!Array.isArray(datos) || datos.length === 0) {
      this.mostrarMensaje('warning', 'No hay datos disponibles para exportar');
      return false;
    }
    // Confirmación para grandes volúmenes de datos
    if (datos.length > 10000) {
      const continuar = confirm(
        `Hay ${datos.length.toLocaleString()} registros. ` +
        'La exportación puede tomar varios minutos. ¿Desea continuar?'
      );
      if (!continuar) return false;
    }
    
    return true;
  }

   // Limpia texto para exportación - quita caracteres raros

  private limpiarTexto(texto: any): string {
    if (!texto) return '';
    
    return String(texto)
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:()\[\]]/g, '')
      .trim()
      .substring(0, 150);
  }


  // MÉTODOS CRUD

  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  // MÉTODO EDITAR ACTUALIZADO
  editar(recargas: Recargas): void {
    // Crear una copia de la recarga para evitar modificar el original
    this.recargaSeleccionada = { ...recargas };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
    
    // Opcional: scroll hacia arriba para ver el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('Editando recarga:', this.recargaSeleccionada);
  }

  // MÉTODO DETALLES ACTUALIZADO
  detalles(recargas: Recargas): void {
    // Crear una copia de la recarga para mostrar detalles
    this.recargaSeleccionada = { ...recargas };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.activeActionRow = null;
    
    // Opcional: scroll hacia arriba para ver los detalles
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    console.log('Mostrando detalles de recarga:', this.recargaSeleccionada);
  }

  // Métodos para cerrar formularios 
  cerrarFormulario(): void { 
    this.showCreateForm = false;
    this.cerrarAlerta(); // Limpiar alertas al cerrar
  }
  
  // MÉTODO CERRAR FORMULARIO EDICIÓN ACTUALIZADO
  cerrarFormularioEdicion(): void { 
    this.showEditForm = false; 
    this.recargaSeleccionada = null; // Limpiar la selección
  }
  
  // MÉTODO CERRAR DETALLES ACTUALIZADO
  cerrarDetalles(): void { 
    this.showDetailsForm = false; 
    this.recargaSeleccionada = null; // Limpiar la selección
  }

  // MÉTODO OBSOLETO - mantener por compatibilidad pero usar cerrarDetalles()
  cerrarFormularioDetalles(): void { 
    this.cerrarDetalles();
  }

  // cuando se guardan cambios
  guardarRecarga(recargas: Recargas): void {
    this.cargardatos(false);
    this.cerrarFormulario();
    this.mostrarMensaje('success', 'Recarga guardada exitosamente');
  }

  actualizarRecarga(recargas: Recargas): void {
    this.cargardatos(false);
    this.cerrarFormularioEdicion();
    this.mostrarMensaje('success', 'Recarga actualizada exitosamente');
  }

  // CONTROL DE MENÚ DE ACCIONES

  onActionMenuClick(rowIndex: number): void {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  onDocumentClick(event: MouseEvent, rowIndex: number): void {
    const target = event.target as HTMLElement;
    const dropdowns = document.querySelectorAll('.dropdown-action-list');
    let clickedInside = false;
    
    dropdowns.forEach((dropdown) => {
      if (dropdown.contains(target) && this.activeActionRow === rowIndex) {
        clickedInside = true;
      }
    });
    
    if (!clickedInside && this.activeActionRow === rowIndex) {
      this.activeActionRow = null;
    }
  }

  // SISTEMA DE MENSAJES Y ALERTAS 
  
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
  
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // CARGA DE DATOS DESDE API 

  /**
   * Carga los datos de recargas desde la API
   * @param state - Indica si mostrar overlay de carga
   */
// REEMPLAZA TU MÉTODO cargardatos CON ESTE
private cargardatos(state: boolean): void {
  this.mostrarOverlayCarga = state;

  // Verificar que tenemos datos de usuario cargados
  if (!this.currentUser) {
    console.error('Error: No hay datos de usuario disponibles');
    this.mostrarMensaje('error', 'Error al cargar datos de usuario');
    this.mostrarOverlayCarga = false;
    return;
  }

  // Usar los datos del usuario actual
  const sucuId = this.currentUser.sucu_Id || 0;
  const esAdmin = this.currentUser.usua_EsAdmin || false;
  console.log(`Cargando datos para Sucursal ID: ${sucuId}, Es Admin: ${esAdmin}`);

  this.http.get<Recargas[]>(`${environment.apiBaseUrl}/Recargas/ListarsPorSucursal/${sucuId}/${esAdmin}`, {
    headers: { 'x-api-key': environment.apiKey }
  }).subscribe({
    
    next: (data) => {
      console.log("Datos recibidos:", data);
      console.log("XML de primera recarga:", data[0]?.detalleProductos);
      
      // Agregar secuencia a cada recarga
      data.forEach((recarga, index) => {
        recarga.secuencia = index + 1;
      });

      // Actualizar tabla y estado
      this.table.setData(data);
      this.tieneRegistros = data.length > 0;
    },
    error: (error) => {
      console.error('Error al cargar los datos:', error);
      this.mostrarOverlayCarga = false;
      this.mostrarMensaje('error', this.obtenerMensajeError(error));
      this.table.setData([]);
      this.tieneRegistros = false;
    },
    complete: () => {
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
      }, 500);
    }
  });
}
    //Maneja errores de carga de imágenes - pone imagen por defecto

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/user-dummy-img.jpg';
  }

  private obtenerMensajeError(error: any): string {
    if (error.status === 404) return 'El endpoint no fue encontrado.';
    if (error.status === 401) return 'No autorizado. Verifica tu API Key.';
    if (error.status === 400) return 'Petición incorrecta.';
    if (error.status === 500) return 'Error interno del servidor.';
    if (error.error?.message) return error.error.message;
    return 'Error de comunicación con el servidor.';
  }

  private extraerResultadoSP(response: any): any {
    if (response.data && typeof response.data === 'object') {
      return response.data;
    } else if (Array.isArray(response) && response.length > 0) {
      return response[0];
    }
    return response;
  }
}