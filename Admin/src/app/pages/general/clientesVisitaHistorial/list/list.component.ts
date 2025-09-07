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
import { ClientesVisitaHistorial } from 'src/app/Modelos/general/ClientesVisitaHistorial.Model';
import { DetailsComponent } from '../details/details.component';
import { CreateComponent } from '../create/create.component';
import { Router, ActivatedRoute } from '@angular/router';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/exportHori.service';
import { VisitaClientePorVendedorDto } from 'src/app/Modelos/general/VisitaClientePorVendedorDto.Model';
import { Vendedor } from 'src/app/Modelos/ventas/Vendedor.Model';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';


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
    // EditComponent,
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

// Grid Component

export class ListComponent {
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Visitas de Clientes',                    // Título del reporte
    filename: 'Visita de Clientes',                           // Nombre base del archivo
    department: 'General',                         // Departamento
    additionalInfo: 'Sistema de Gestión',         // Información adicional

    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 3, align: 'center' as const },
      { key: 'Código Vendedor', header: 'Código Vendedor', width: 15, align: 'left' as const },
      { key: 'Vendedor', header: 'Vendedor', width: 30, align: 'left' as const },
      { key: 'Tipo', header: 'Tipo', width: 50, align: 'left' as const },
      { key: 'Ruta', header: 'Ruta', width: 50, align: 'left' as const },
      { key: 'Días de la semana', header: 'Días de la semana', width: 50, align: 'left' as const },
    ] as ExportColumn[],

    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (visita: VisitaClientePorVendedorDto, index: number) => ({
      'No': visita?.No || (index + 1),
      'Código Vendedor': this.limpiarTexto(visita?.vend_Codigo),
      'Vendedor': this.limpiarTexto(visita?.vend_Nombres + visita.vend_Apellidos),
      'Tipo': this.limpiarTexto(visita?.vend_Tipo),
      'Ruta': this.limpiarTexto(visita?.ruta_Descripcion),
      'Días de la semana': this.limpiarTexto(visita?.veRu_Dias),
    })
  };


  busqueda: string = '';
  vendedoresFiltrados: any[] = [];

  listadoClientesSinConfirmar = false;
  activeActionRow: number | null = null;
  showDetails = true;
  showCreateForm = false; // Control del collapse
  showDetailsForm = false; // Control del collapse de detalles
  isLoading = true;

  // Propiedades para alertas
  mostrarAlertaExito = false;
  mostrarOverlayCarga = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';


  vendedorDetalle: VisitaClientePorVendedorDto | null = null;
  visitasDetalle: VisitaClientePorVendedorDto[] = [];
  vendedores: any[] = [];

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

  vendedorGrid: any = [];

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
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'Instructors', active: true },
      { label: 'Grid View', active: true }
    ];

    /**
     * Form Validation
     */
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
    return this.vendedores?.length > 0;
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
        additionalInfo: this.exportConfig.additionalInfo
      }
    };
  }

  /**
   * Obtiene y prepara los datos para exportación
   */
   private obtenerDatosExport(): any[] {
    try {
      const datos = this.vendedores; // Use the array for cards

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
    const datos = this.vendedores;

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

  constructor(
    private http: HttpClient,
    private formBuilder: UntypedFormBuilder,
    private exportService: ExportService
  ) {
    this.cargarDatos(true);
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
          modulo = permisos.find((m: any) => m.Pant_Id === 71);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Visitas de Clientes'] || permisos['visitas de clientes'] || null;
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
    this.showCreateForm = true;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  detalles(vendedor: Vendedor): void {
    this.http.get<any>(`${environment.apiBaseUrl}/ClientesVisitaHistorial/ListarVisitasPorVendedor`,
      {
        headers: { 'x-api-key': environment.apiKey },
        params: { vend_Id: vendedor.vend_Id }
      }
    ).subscribe({
      next: (data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          this.visitasDetalle = data;
          this.showDetailsForm = true;
          this.showCreateForm = false;
          this.activeActionRow = null;
        } else {
          this.visitasDetalle = [];
          this.showDetailsForm = false;
          this.mostrarMensaje('warning', 'No se encontraron visitas para este vendedor.');
        }
      },
      error: (err) => {
        this.visitasDetalle = [];
        this.showDetailsForm = false;
        this.mostrarMensaje('error', 'No se pudo cargar el historial de visitas.');
      }
    });
  }

  filtradorVendedores(): void {
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) {
      this.vendedoresFiltrados = [...this.vendedorGrid];
    } else {
      this.vendedoresFiltrados = this.vendedorGrid.filter((vendedor: any) =>
        (vendedor.vend_Codigo || '').toLowerCase().includes(termino) ||
        (vendedor.vend_Nombres || '').toLowerCase().includes(termino) ||
        (vendedor.vend_Apellidos || '').toLowerCase().includes(termino)
      );
    }
    this.currentPage = 1;
    this.actualizarVendedoresVisibles();
  }

  private actualizarVendedoresVisibles(): void {
    const startItem = (this.currentPage - 1) * this.itemsPerPage;
    const endItem = this.currentPage * this.itemsPerPage;
    this.vendedores = this.vendedoresFiltrados.slice(startItem, endItem);
  }

  private cargarDatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Vendedor[]>(`${environment.apiBaseUrl}/Vendedores/ListarConVisitas`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());
        this.vendedorGrid = datosFiltrados || [];
        this.busqueda = '';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.vendedoresFiltrados = [...this.vendedorGrid];
        this.actualizarVendedoresVisibles();
      }, 500);
    });
  }

  currentPage: number = 1;
  itemsPerPage: number = 10;

  get startIndex(): number {
    return this.vendedoresFiltrados?.length ? ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
  }

  get endIndex(): number {
    if (!this.vendedoresFiltrados?.length) return 0;
    const end = this.currentPage * this.itemsPerPage;
    return end > this.vendedoresFiltrados.length ? this.vendedoresFiltrados.length : end;
  }

  pageChanged(event: any): void {
    this.currentPage = event.page;
    this.actualizarVendedoresVisibles();
  }

  trackByVendedorId(index: number, item: any): any {
    return item.vend_Id;
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

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.vendedorDetalle = null;
  }


  guardarVisita(visita: ClientesVisitaHistorial): void {
    this.cargarDatos(false);
    this.cerrarFormulario();
  }
}