import { Component, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { ModalModule, ModalDirective } from 'ngx-bootstrap/modal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { TabsModule } from 'ngx-bootstrap/tabs';
import { RatingModule } from 'ngx-bootstrap/rating';
import { NgSelectModule } from '@ng-select/ng-select';
import { FlatpickrModule } from 'angularx-flatpickr';
import { SimplebarAngularModule } from 'simplebar-angular';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Cliente } from 'src/app/Modelos/general/Cliente.Model';
import { CreateComponent } from '../create/create.component';
import { DetailsComponent } from '../details/details.component';
import { EditComponent } from '../edit/edit.component';
import {
  trigger,
  style,
  transition,
  animate
} from '@angular/animations';
import { Router, ActivatedRoute } from '@angular/router';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/exportHori.service';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

@Component({
  standalone: true,
  selector: 'app-grid',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
  providers: [DecimalPipe],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ModalModule,
    PaginationModule,
    BsDropdownModule,
    TabsModule,
    RatingModule,
    NgSelectModule,
    FlatpickrModule,
    SimplebarAngularModule,
    DropzoneModule,
    BreadcrumbsComponent,
    CreateComponent,
    EditComponent,
    DetailsComponent,
  ],
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

export class ListComponent {
  mostrarErrores: boolean = false;
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Clientes',                    // Título del reporte
    filename: 'Clientes',                           // Nombre base del archivo
    department: 'General',                         // Departamento

    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 3, align: 'center' as const },
      { key: 'Codigo', header: 'Codigo', width: 15, align: 'left' as const },
      { key: 'RTN', header: 'RTN', width: 30, align: 'left' as const },
      { key: 'Nombres', header: 'Nombres', width: 50, align: 'left' as const },
      { key: 'Apellidos', header: 'Apellidos', width: 50, align: 'left' as const },
      { key: 'Nombre del Negocio', header: 'Nombre del Negocio', width: 50, align: 'left' as const },
      { key: 'Telefono', header: 'Teléfono', width: 30, align: 'left' as const }
    ] as ExportColumn[],

    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (cliente: Cliente, index: number) => ({
      'No': cliente?.No || (index + 1),
      'Codigo': this.limpiarTexto(cliente?.clie_Codigo),
      'RTN': this.limpiarTexto(cliente?.clie_RTN),
      'Nombres': this.limpiarTexto(cliente?.clie_Nombres),
      'Apellidos': this.limpiarTexto(cliente?.clie_Apellidos),
      'Nombre del Negocio': this.limpiarTexto(cliente?.clie_NombreNegocio),
      'Telefono': this.limpiarTexto(cliente?.clie_Telefono)
    })
  };


  busqueda: string = '';
  clientesFiltrados: any[] = [];

  listadoClientesSinConfirmar = false;
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false; // Control del collapse
  showEditForm = false; // Control del collapse de edición
  showDetailsForm = false; // Control del collapse de detalles
  isLoading = true;

  // Propiedades para alertas
  cargandoDatos = false;
  mostrarAlertaExito = false;
  mostrarOverlayCarga = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarModalActivacion = false;


  clienteDetalle: Cliente | null = null;
  clienteEditando: Cliente | null = null;
  clienteSeleccionado: Cliente | null = null;

  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  clienteAEliminar: Cliente | null = null;

  // Estado de exportación
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

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

  clienteGrid: any = [];
  clientes: any = [];

  term: any;
  breadCrumbItems!: Array<{}>;
  instuctoractivity: any;
  files: File[] = [];
  deleteID: any;

  GridForm!: UntypedFormGroup;
  submitted = false;
  masterSelected: boolean = false;
  @ViewChild('addInstructor', { static: false }) addInstructor?: ModalDirective;
  @ViewChild('deleteRecordModal', { static: false }) deleteRecordModal?: ModalDirective;
  editData: any = null;

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Instructors', active: true },
      { label: 'Grid View', active: true }
    ];
    this.GridForm = this.formBuilder.group({
      id: [''],
      name: ['', [Validators.required]],
      email: ['', [Validators.required]],
      total_course: ['', [Validators.required]],
      experience: ['', [Validators.required]],
      students: ['', [Validators.required]],
      contact: ['', [Validators.required]],
      status: ['', [Validators.required]],
      img: ['']
    });

    this.cargarAccionesUsuario();
    this.cargarDatos(true);
    this.contador();
    document.getElementById('elmLoader')?.classList.add('d-none');
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
    return this.clientes?.length > 0;
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
      const datos = this.clientesFiltrados;

      if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error('No hay datos disponibles para exportar');
      }

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
    const datos = this.clientes;

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

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  accionesDisponibles: string[] = [];
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
          modulo = permisos.find((m: any) => m.Pant_Id === 10);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Clientes'] || permisos['clientes'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
        // console.error('Error al parsear permisosJson:', e);
      }
    }
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLocaleLowerCase());
  }


  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  editar(cliente: Cliente): void {
    this.clienteEditando = { ...cliente };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
    this.listadoClientesSinConfirmar = false;
    this.activeActionRow = null;
  }

  detalles(cliente: Cliente): void {
    this.clienteDetalle = { ...cliente };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.activeActionRow = null;
    this.listadoClientesSinConfirmar = false
  }

  filtradorClientes(): void {
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) {
      this.clientesFiltrados = [...this.clienteGrid];
    } else {
      this.clientesFiltrados = this.clienteGrid.filter((cliente: any) =>
        (cliente.clie_Codigo || '').toLowerCase().includes(termino) ||
        (cliente.clie_Nombres || '').toLowerCase().includes(termino) ||
        (cliente.clie_Apellidos || '').toLowerCase().includes(termino) ||
        (cliente.clie_DNI || '').toLowerCase().includes(termino) ||
        (cliente.clie_NombreNegocio || '').toLowerCase().includes(termino)
      );
    }
    this.currentPage = 1;
    this.actualizarClientesVisibles();
  }

  private actualizarClientesVisibles(): void {
    const startItem = (this.currentPage - 1) * this.itemsPerPage;
    const endItem = this.currentPage * this.itemsPerPage;
    this.clientes = this.clientesFiltrados.slice(startItem, endItem);
  }

  pageChanged(event: any): void {
    this.currentPage = event.page;
    this.actualizarClientesVisibles();
  }

  private cargarDatos(state: boolean): void {
    this.cargandoDatos = true;
    this.clienteGrid = [];
    this.clientes = [];
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.listadoClientesSinConfirmar = false;
    this.mostrarOverlayCarga = state;
    this.http.get<Cliente[]>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());

        this.clienteGrid = datosFiltrados || [];
        this.busqueda = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.clientesFiltrados = [...this.clienteGrid];
        this.cargandoDatos = false;
        this.actualizarClientesVisibles();
      }, 500);
    });
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private formBuilder: UntypedFormBuilder,
    private exportService: ExportService,
    private imageUploadService: ImageUploadService) {
    this.cargarDatos(true);
  }

  abrirListado() {
    this.listadoClientesSinConfirmar = true;
    this.cargarDatosSinConfirmar(true);
  }

  cerrarListado() {
    this.listadoClientesSinConfirmar = false;
    this.cargarDatos(true);
  }

  notificacionesSinConfirmar: number = 0;
  private contador(): void {
    this.http.get<Cliente[]>(`${environment.apiBaseUrl}/Cliente/ListarSinConfirmacion`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.notificacionesSinConfirmar = data.length;
    });
  }


  private cargarDatosSinConfirmar(state: boolean): void {
    this.cargandoDatos = true;
    this.clienteGrid = [];
    this.clientes = [];
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.listadoClientesSinConfirmar = true;
    this.mostrarOverlayCarga = state;
    this.http.get<Cliente[]>(`${environment.apiBaseUrl}/Cliente/ListarSinConfirmacion`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
        this.cargandoDatos = false;
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());

        this.clienteGrid = datosFiltrados || [];
        this.busqueda = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.clientesFiltrados = [...this.clienteGrid];
        this.filtradorClientes();
      }, 500);
    });
  }

  currentPage: number = 1;
  itemsPerPage: number = 10;

  get startIndex(): number {
    return this.clientesFiltrados?.length ? ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
  }

  get endIndex(): number {
    if (!this.clientesFiltrados?.length) return 0;
    const end = this.currentPage * this.itemsPerPage;
    return end > this.clientesFiltrados.length ? this.clientesFiltrados.length : end;
  }

  trackByClienteId(index: number, item: any): any {
    return item.clie_Id;
  }
  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/user-dummy-img.jpg';
  }

  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.cargarDatos(true);
    this.showEditForm = false;
    this.clienteEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.cargarDatos(true);
    this.showDetailsForm = false;
    this.clienteDetalle = null;
  }

  activar(cliente: Cliente): void {
    this.clienteSeleccionado = cliente;
    this.mostrarModalActivacion = true;
  }

  confirmarEdicion(): void {
    if (this.clienteSeleccionado) {
      this.editar(this.clienteSeleccionado);
      this.cerrarModalActivacion();
    }
  }

  cerrarModalActivacion(): void {
    this.mostrarModalActivacion = false;
    this.clienteSeleccionado = null;
  }

  guardarCliente(cliente: Cliente): void {
    this.mostrarOverlayCarga = true;
    // setTimeout(() => {
      this.cargarDatos(true);
      // this.mostrarOverlayCarga = false;
      // this.mensajeExito = 'Cliente guardado exitosamente.';
      // this.mostrarAlertaExito = true;
      // setTimeout(() => {
      //   this.mostrarAlertaExito = false;
      //   this.mensajeExito = '';
      // }, 3000);
    // }, 1000);
  }

  actualizarCliente(cliente: Cliente): void {
    this.mostrarOverlayCarga = true;
    // setTimeout(() => {
      this.cargarDatos(true);
      // this.mostrarOverlayCarga = false;
      // this.mensajeExito = `Cliente "${cliente.clie_Nombres} ${cliente.clie_Apellidos}" actualizado exitosamente.`;
      // this.mostrarAlertaExito = true;
      // setTimeout(() => {
      //   this.mostrarAlertaExito = false;
      //   this.mensajeExito = '';
      // }, 3000);
    // }, 1000);
  }

  confirmarEliminar(cliente: Cliente): void {
    this.clienteAEliminar = cliente;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.clienteAEliminar = null;
  }

  cambiarEstadoCliente(clienteId: number) {
    const body = {
      Clie_Id: clienteId,
      FechaActual: new Date().toISOString(),
      code_Status: 0,
      message_Status: "string"
    };
    this.http.post<any>(`${environment.apiBaseUrl}/Cliente/CambiarEstado`, body, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (resp) => {
        if (resp.code_Status === 1) {
          // Éxito: muestra mensaje y refresca la lista
          const nuevoEstado = !this.esClienteActivo(this.clienteAEliminar); // Cambia el estado actual
        const accion = nuevoEstado ? 'activó' : 'desactivó';
        this.mensajeExito = `Cliente "${this.clienteAEliminar?.clie_Nombres} ${this.clienteAEliminar?.clie_Apellidos}" se ${accion} exitosamente`;
        this.mostrarAlertaExito = true;
        this.mostrarErrores = false;

            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 4000);
          this.cargarDatos(true);
          this.cancelarEliminar();
        } else {
          // Error de negocio: muestra mensaje de error
          this.mostrarAlertaError = true;
          this.mensajeError = resp.message_Status || 'No se pudo cambiar el estado.';
        }
      },
      error: () => {
        // Error de red o servidor
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cambiar el estado del cliente.';
      }
    });
  }

  esClienteActivo(cliente: any): boolean {
    return cliente.clie_Estado === 1 || cliente.clie_Estado === true;
  }

  /**
   * Construye la URL completa para mostrar la imagen
   */
  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
  }

  /**
   * Obtiene la imagen a mostrar para un cliente
   */
  getClienteImageToDisplay(cliente: any): string {
    if (cliente?.clie_ImagenDelNegocio && cliente.clie_ImagenDelNegocio.trim()) {
      return this.getImageDisplayUrl(cliente.clie_ImagenDelNegocio);
    }
    return 'assets/images/imagenes/full-logo.png';
  }

}