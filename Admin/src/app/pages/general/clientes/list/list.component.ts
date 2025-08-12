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
import { cloneDeep } from 'lodash';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { isTrustedHtml } from 'ngx-editor/lib/trustedTypesUtil';
import { Cliente } from 'src/app/Modelos/general/Cliente.Model';

import { CreateComponent } from '../create/create.component';
import { DetailsComponent } from '../details/details.component';
import { EditComponent } from '../edit/edit.component';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { Router, ActivatedRoute } from '@angular/router';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/exportHori.service';

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

// Grid Component

export class ListComponent {
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Clientes',                    // Título del reporte
    filename: 'Clientes',                           // Nombre base del archivo
    department: 'General',                         // Departamento
    additionalInfo: 'Sistema de Gestión',         // Información adicional
    
    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 3, align: 'center' as const },
      { key: 'Codigo', header: 'Codigo', width: 15, align: 'left' as const },
      { key: 'RTN', header: 'RTN', width: 30, align: 'left' as const },
      { key: 'Nombres', header: 'Nombres', width: 50, align: 'left' as const },
      { key: 'Apellidos', header: 'Apellidos', width: 50, align: 'left' as const },
      { key: 'Nombre del Negocio', header: 'Nombre del Negocio', width: 50, align: 'left' as const },
      { key: 'Telefono', header: 'Telefono', width: 30, align: 'left' as const }
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
      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(modelo?.campo),
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
  mostrarAlertaExito = false;
  mostrarOverlayCarga = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';


  clienteDetalle: Cliente | null = null;
  clienteEditando: Cliente | null = null;

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
  // bread crumb items
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
    const datos = this.clientes; // Use the array for cards

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

 cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // constructor(private formBuilder: UntypedFormBuilder, private http: HttpClient) { }
  accionesDisponibles: string[] = [];
    tieneRegistros: boolean = false;
  // Método robusto para validar si una acción está permitida
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
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

    // eliminar(): void {
    //     if(!this.clienteAEliminar) return;
    //     const clienteAEliminar: Cliente = {
    //       secuencia: 0,
    //       clie_Id: this.clienteAEliminar.clie_Id,
    //       clie_Codigo: '',
    //       clie_Nacionalidad: '',
    //       pais_Descripcion: '',
    //       clie_DNI: '',
    //       clie_RTN: '',
    //       clie_Nombres: '',
    //       clie_Apellidos: '',
    //       clie_NombreNegocio: '',
    //       clie_ImagenDelNegocio: '',
    //       clie_Telefono: '',
    //       clie_Correo: '',
    //       clie_Sexo: '',
    //       clie_FechaNacimiento: new Date(),
    //       tiVi_Id: 0,
    //       tiVi_Descripcion: '',
    //       cana_Id: 0,
    //       cana_Descripcion: '',
    //       esCv_Id: 0,
    //       esCv_Descripcion: '',
    //       ruta_Id: 0,
    //       ruta_Descripcion: '',
    //       clie_LimiteCredito: 0,
    //       clie_DiasCredito: 0,
    //       clie_Saldo: 0,
    //       clie_Vencido: true,
    //       clie_Observaciones:  '',
    //       clie_ObservacionRetiro: '',
    //       clie_Confirmacion: true,
    //       clie_Estado: true,
    //       usua_Creacion: getUserId(),
    //       clie_FechaCreacion: new Date(),
    //       usua_Modificacion: getUserId(),
    //       clie_FechaModificacion: new Date(),

    //       usuaC_Nombre: '',
    //       usuaM_Nombre: '',
    //       code_Status: 0,
    //       message_Status: '',
    //     }
    //     this.mostrarOverlayCarga = true;
    //     this.http.post(`${environment.apiBaseUrl}/Cliente/CambiarEstado`, clienteAEliminar,{
    //       headers:{
    //         'X-Api-Key': environment.apiKey,
    //         'accept': '*/*'
    //       }
    //     }).subscribe({
    //       next: (response: any) =>{
    //         setTimeout(() =>{
    //           this.mostrarOverlayCarga = false;
    //           if(response.success && response.data){
    //             if(response.data.code_Status === 1){
    //               if(this.clienteAEliminar!.clie_Estado) {
    //                 this.mensajeExito = `Cliente "${this.clienteAEliminar!.clie_Nombres}" desactivado exitosamente`;
    //                 this.mostrarAlertaExito = true;
    //               }
    //               if(!this.clienteAEliminar!.clie_Estado) {
    //                 this.mensajeExito = `Cliente "${this.clienteAEliminar!.clie_Nombres}" activado exitosamente`;
    //                 this.mostrarAlertaExito = true;
    //               }
    
    //               setTimeout(() => {
    //                 this.mostrarAlertaExito = false;
    //                 this.mensajeExito = '';
    //               }, 3000);
    
    //               this.cargarDatos(false);
    //               this.cancelarEliminar();
    //             }else if (response.data.code_Status === -1){
    //               this.mostrarAlertaError = true;
    //               this.mensajeError = response.data.message_Status;
    
    //               setTimeout(() => {
    //                 this.mostrarAlertaError = false;
    //                 this.mensajeError = '';
    //               }, 5000);
    
    //               this.cancelarEliminar();
    //             }
    //           } else {
    //             this.mostrarAlertaError = true;
    //             this.mensajeError = response.message || 'Error inesperado al cambiar el estado al cliente.';
    
    //             setTimeout(() => {
    //               this.mostrarAlertaError = false;
    //               this.mensajeError = '';
    //             }, 5000);
    
    //             this.cancelarEliminar();
    //           }
    //         },1000)
    //       }
    //     })
    //   }

  filtradorClientes(): void {
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) {
      this.clientesFiltrados = [...this.clienteGrid];
    } else {
      this.clientesFiltrados = this.clienteGrid.filter((cliente: any) =>
        (cliente.clie_Codigo || '').toLowerCase().includes(termino) ||
        (cliente.clie_Nombres || '').toLowerCase().includes(termino) ||
        (cliente.cana_Descripcion || '').toLowerCase().includes(termino)
      );
    }

        // Resetear la página actual a 1 cuando se filtra
    this.currentPage = 1;
    
    // Actualizar los productos visibles basados en la paginación
    this.actualizarClientesVisibles();
  }

  // Método auxiliar para actualizar los productos visibles
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
    this.mostrarOverlayCarga = state;
    this.http.get<Cliente[]>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      console.log('data',data);
      
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());
        
        this.clienteGrid = datosFiltrados || [];
        console.log(this.clienteGrid);
        // Resetear filtros y paginación al cargar nuevos datos
        this.busqueda = '';
        this.currentPage = 1;
        this.itemsPerPage = 10; // Asegurar que siempre sean 8 items por página
        this.clientesFiltrados = [...this.clienteGrid];
        
        // IMPORTANTE: NO llamar a filtradorProductos() aquí
        this.actualizarClientesVisibles();
        
      }, 500);
    });
  }
  
    constructor(
      private http: HttpClient,
      private router: Router,
      private route: ActivatedRoute,
      private formBuilder: UntypedFormBuilder,
      private exportService: ExportService
    ) {
      this.cargarDatos(true);
    }

  abrirListado(){
    this.listadoClientesSinConfirmar = true;
    this.cargarDatosSinConfirmar(false);
  }

  cerrarListado(){
    this.listadoClientesSinConfirmar = false;
    this.cargarDatos(false);
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
    this.clienteGrid = [];
    this.clientes = [];
    this.mostrarOverlayCarga = state;
    this.http.get<Cliente[]>(`${environment.apiBaseUrl}/Cliente/ListarSinConfirmacion`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
        this.clienteGrid = data || [];
        this.clientes = this.clienteGrid.slice(0, 10);
        this.filtradorClientes();
      },500);
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


  // File Upload
  public dropzoneConfig: DropzoneConfigInterface = {
    clickable: true,
    addRemoveLinks: true,
    previewsContainer: false,
  };

  uploadedFiles: any[] = [];

  // File Upload
  imageURL: any;
  onUploadSuccess(event: any) {
    setTimeout(() => {
      this.uploadedFiles.push(event[0]);
      this.GridForm.controls['img'].setValue(event[0].dataURL);
    }, 0);
  }

  // File Remove
  removeFile(event: any) {
    this.uploadedFiles.splice(this.uploadedFiles.indexOf(event), 1);
  }

  // Edit Data
  editList(id: any) {
    this.uploadedFiles = [];
    this.addInstructor?.show();
    const modaltitle = document.querySelector('.modal-title') as HTMLAreaElement;
    if (modaltitle) modaltitle.innerHTML = 'Edit Product';
    const modalbtn = document.getElementById('add-btn') as HTMLAreaElement;
    if (modalbtn) modalbtn.innerHTML = 'Update';
    // Si id es índice
    this.editData = this.clientes[id];
    if (this.editData) {
      this.uploadedFiles.push({ 'dataURL': this.editData.img, 'name': this.editData.img_alt, 'size': 1024 });
      this.GridForm.patchValue(this.clientes[id]);
    }
  }



  // Delete Product
  removeItem(id: any) {
    this.deleteID = id;
    this.deleteRecordModal?.show();
  }

  confirmDelete() {
    this.deleteRecordModal?.hide();
  }

  // filterdata
  filterdata() {
    if (this.term) {
      this.clientes = this.clienteGrid.filter((el: any) => el.name?.toLowerCase().includes(this.term.toLowerCase()));
    } else {
      this.clientes = this.clienteGrid.slice(0, 10);
    }
    // noResultElement
    this.updateNoResultDisplay();
  }

  // no result 
  updateNoResultDisplay() {
    const noResultElement = document.querySelector('.noresult') as HTMLElement;
    const paginationElement = document.getElementById('pagination-element') as HTMLElement;
    if (noResultElement && paginationElement) {
      if (this.term && this.clientes.length === 0) {
        noResultElement.style.display = 'block';
        paginationElement.classList.add('d-none');
      } else {
        noResultElement.style.display = 'none';
        paginationElement.classList.remove('d-none');
      }
    }
  }

  //Borrar
  // Page Changed
  // pageChanged(event: any): void {
  //   this.currentPage = event.page;
  //   const startItem = (event.page - 1) * event.itemsPerPage;
  //   const endItem = event.page * event.itemsPerPage;
  //   this.clientes = this.clienteGrid.slice(startItem, endItem);
  //   this.filtradorClientes();
  // }

  // Abre/cierra el menú de acciones para la fila seleccionada
  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }


  // Métodos para los botones de acción principales (crear, editar, detalles)
  // crear(): void {
  //   console.log('Toggleando formulario de creación...');
  //   this.showCreateForm = !this.showCreateForm;
  //   this.showEditForm = false; // Cerrar edit si está abierto
  //   this.showDetailsForm = false; // Cerrar details si está abierto
  //   this.activeActionRow = null; // Cerrar menú de acciones
  // }

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.clienteDetalle = null;
  }


  guardarCliente(cliente: Cliente): void {
    console.log('Cliente guardado exitosamente desde create component:', cliente);
    this.cargarDatos(false);
    this.cerrarFormulario();
  }

  confirmarEliminar(cliente: Cliente): void {
    console.log('Solicitando confirmación para eliminar:', cliente);
    this.clienteAEliminar = cliente;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.clienteAEliminar = null;
  }

  // eliminar(): void {
  //   if (!this.clienteAEliminar) return;

  //   console.log('Eliminando cliente:', this.clienteAEliminar);

  //   this.http.post(`${environment.apiBaseUrl}/Cliente/Eliminar/${this.clienteAEliminar.clie_Id}`, {}, {
  //     headers: {
  //       'X-Api-Key': environment.apiKey,
  //       'accept': '*/*'
  //     }
  //   }).subscribe({
  //     next: (response: any) => {
  //       console.log('Respuesta del servidor:', response);

  //       // Verificar el código de estado en la respuesta
  //       if (response.success && response.data) {
  //         if (response.data.code_Status === 1) {
  //           // Éxito: eliminado correctamente
  //           console.log('Cliente eliminado exitosamente');
  //           this.mensajeExito = `Cliente "${this.clienteAEliminar!.clie_Nombres}" eliminado exitosamente`;
  //           this.mostrarAlertaExito = true;

  //           // Ocultar la alerta después de 3 segundos
  //           setTimeout(() => {
  //             this.mostrarAlertaExito = false;
  //             this.mensajeExito = '';
  //           }, 3000);


  //           this.cargarDatos();
  //           this.cancelarEliminar();
  //         } else if (response.data.code_Status === -1) {
  //           //result: está siendo utilizado
  //           console.log('El cliente está siendo utilizado');
  //           this.mostrarAlertaError = true;
  //           this.mensajeError = response.data.message_Status || 'No se puede eliminar: el cliente está siendo utilizado.';

  //           setTimeout(() => {
  //             this.mostrarAlertaError = false;
  //             this.mensajeError = '';
  //           }, 5000);

  //           // Cerrar el modal de confirmación
  //           this.cancelarEliminar();
  //         } else if (response.data.code_Status === 0) {
  //           // Error general
  //           console.log('Error general al eliminar');
  //           this.mostrarAlertaError = true;
  //           this.mensajeError = response.data.message_Status || 'Error al eliminar el cliente.';

  //           setTimeout(() => {
  //             this.mostrarAlertaError = false;
  //             this.mensajeError = '';
  //           }, 5000);

  //           // Cerrar el modal de confirmación
  //           this.cancelarEliminar();
  //         }
  //       } else {
  //         // Respuesta inesperada
  //         console.log('Respuesta inesperada del servidor');
  //         this.mostrarAlertaError = true;
  //         this.mensajeError = response.message || 'Error inesperado al eliminar el cliente.';

  //         setTimeout(() => {
  //           this.mostrarAlertaError = false;
  //           this.mensajeError = '';
  //         }, 5000);

  //         // Cerrar el modal de confirmación
  //         this.cancelarEliminar();
  //       }
  //     },
  //   });
  // }



  //Detailss
  // detalles(cliente: Cliente): void {
  //   console.log('Abriendo detalles para:', cliente);
  //   this.clienteDetalle = { ...cliente }; // Hacer copia profunda
  //   this.showDetailsForm = true;
  //   this.showCreateForm = false; // Cerrar create si está abierto
  //   this.showEditForm = false; // Cerrar edit si está abierto
  //   this.activeActionRow = null; // Cerrar menú de acciones
  // }



  actualizarCliente(cliente: Cliente): void {
    console.log('Cliente actualizado exitosamente desde edit component:', cliente);
    this.cargarDatos(false);
    this.cerrarFormularioEdicion();
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.clienteEditando = null;
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
          this.mostrarAlertaExito = true;
          this.mensajeExito = resp.message_Status || 'Estado cambiado correctamente.';
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
}
