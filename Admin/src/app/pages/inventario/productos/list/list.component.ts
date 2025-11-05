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
import { Producto } from 'src/app/Modelos/inventario/Producto.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { set } from 'lodash';
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
        title: 'Listado de Productos',                    // Título del reporte
        filename: 'Productos',                           // Nombre base del archivo
        department: 'Inventario',                         // Departamento
        
        // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
        columns: [
          { key: 'No', header: 'No.', width: 3, align: 'center' as const },
          { key: 'Código', header: 'Código', width: 12, align: 'center' as const },
          { key: 'Descripción', header: 'Descripción', width: 50, align: 'center' as const },
          { key: 'Marca', header: 'Marca', width: 20, align: 'center' as const },
          { key: 'Categoria', header: 'Categoria', width: 30, align: 'center' as const },
          { key: 'Subcategoria', header: 'Subcategoria', width: 30, align: 'center' as const },
          { key: 'Precio', header: 'Precio', width: 15, align: 'center' as const }
        ] as ExportColumn[],
        
        // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
        dataMapping: (producto: Producto, index: number) => ({
          'No': producto?.No || (index + 1),
          'Código': this.limpiarTexto(producto?.prod_Codigo),
          'Descripción': this.limpiarTexto(producto?.prod_DescripcionCorta),
          'Marca': this.limpiarTexto(producto?.marc_Descripcion),
          'Categoria': this.limpiarTexto(producto?.cate_Descripcion),
          'Subcategoria': this.limpiarTexto(producto?.subc_Descripcion),
          'Precio': this.limpiarTexto('L.' + (producto?.prod_PrecioUnitario ?? 0).toFixed(2)),
        })
      };
  // bread crumb items
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario en esta pantalla
  accionesDisponibles: string[] = [];

  busqueda: string = '';
  productosFiltrados: any[] = [];

  // Estado de exportación
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  // Método robusto para validar si una acción está permitida
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  ngOnInit(): void {
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'Inventario' },
      { label: 'Productos', active: true }
    ];

    // Obtener acciones disponibles del usuario (ejemplo: desde API o localStorage)
    this.cargarAccionesUsuario();
    //console.log('Acciones disponibles:', this.accionesDisponibles);
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

    async exportarExcel(): Promise<void> {
      await this.exportar('excel');
    }
  
    async exportarPDF(): Promise<void> {
      await this.exportar('pdf');
    }
  
    async exportarCSV(): Promise<void> {
      await this.exportar('csv');
    }

    puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
      if (this.exportando) {
        return tipo ? this.tipoExportacion !== tipo : false;
      }
      return this.productoGrid?.length > 0;
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
      const datos = this.productoGrid; // Use the array for cards
  
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
      const datos = this.productoGrid;
      
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

  editar(producto: Producto): void {
   
    this.productoEditando = { ...producto }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(producto: Producto): void {
    //console.log('Abriendo detalles para:', producto);
    this.productoDetalle = { ...producto }; // Hacer copia profunda
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
  productoEditando: Producto | null = null;
  productoDetalle: Producto | null = null;

  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarOverlayCarga = false;
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  productoAEliminar: Producto | null = null;

  constructor(public table: ReactiveTableService<Producto>, private http: HttpClient, private router: Router, private route: ActivatedRoute, private exportService: ExportService) {
    this.cargardatos(true);
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
    this.productoEditando = null;
  }
  
  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.productoDetalle = null;
  }
  
  guardarProducto(producto: Producto): void {
    this.mostrarOverlayCarga = true;
    setTimeout(()=> {
      this.cargardatos(false);
      this.showCreateForm = false;
      this.mensajeExito = 'Producto guardado exitosamente';
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  actualizarProducto(producto: Producto): void {
     this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos(false);
      this.showEditForm = false;
      this.mensajeExito = 'Producto actualizado exitosamente';
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }
  
  confirmarEliminar(producto: Producto): void {
    //console.log('Solicitando confirmación para eliminar:', producto);
    this.productoAEliminar = producto;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.productoAEliminar = null;
  }

  eliminar(): void {
    if (!this.productoAEliminar) return;

    this.mostrarOverlayCarga = true;
    this.http.post(`${environment.apiBaseUrl}/Productos/Eliminar/${this.productoAEliminar.prod_Id}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          //console.log('Respuesta del servidor:', response);
        
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              // Éxito: eliminado correctamente
              this.mensajeExito = `Producto "${this.productoAEliminar!.prod_DescripcionCorta}" eliminado exitosamente`;
              this.mostrarAlertaExito = true;
              
              // Ocultar la alerta después de 3 segundos
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);
              

              this.cargardatos(false);
              this.cancelarEliminar();
            } else if (response.data.code_Status === -1) {
              //result: está siendo utilizado
              //console.log('Rol está siendo utilizado');
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'No se puede eliminar: el rol está siendo utilizado.';
              
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
              
              // Cerrar el modal de confirmación
              this.cancelarEliminar();
            } else if (response.data.code_Status === 0) {
              // Error general
              //console.log('Error general al eliminar');
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'Error al eliminar el rol.';
              
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
            this.mensajeError = response.message || 'Error inesperado al eliminar el rol.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            // Cerrar el modal de confirmación
            this.cancelarEliminar();
          }
        })
      },
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
    //console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // Buscar el módulo de Productos (ajusta el nombre si es diferente)
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla (ajusta el ID si cambia en el futuro)
          modulo = permisos.find((m: any) => m.Pant_Id === 25);
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo = permisos['Productos'] || permisos['productos'] || null;
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

  productoGrid: any = [];
  productos: any = [];

  filtradorProductos(): void {
    const termino = this.busqueda.trim().toLowerCase();
    
    if (!termino) {
      // Si no hay término de búsqueda, mostrar todos los productos
      this.productosFiltrados = [...this.productoGrid];
    } else {
      // Filtrar productos según el término de búsqueda
      this.productosFiltrados = this.productoGrid.filter((producto: any) =>
        (producto.prod_DescripcionCorta || '').toLowerCase().includes(termino) ||
        (producto.prod_CodigoBarra || '').toLowerCase().includes(termino) ||
        (producto.prod_Descripcion || '').toLowerCase().includes(termino) ||
        (producto.marc_Descripcion || '').toLowerCase().includes(termino) ||
        (producto.cate_Descripcion || '').toLowerCase().includes(termino) ||
        (producto.subc_Descripcion || '').toLowerCase().includes(termino) ||
        (producto.prod_Codigo || '').toLowerCase().includes(termino) ||
        (producto.prod_PrecioUnitario || '').toString().toLowerCase().includes(termino)
      );
    }
    
    // Resetear la página actual a 1 cuando se filtra
    this.currentPage = 1;
    
    // Actualizar los productos visibles basados en la paginación
    this.actualizarProductosVisibles();
  }

  // Método auxiliar para actualizar los productos visibles
  private actualizarProductosVisibles(): void {
    const startItem = (this.currentPage - 1) * this.itemsPerPage;
    const endItem = this.currentPage * this.itemsPerPage;
    this.productos = this.productosFiltrados.slice(startItem, endItem);
  }

  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Producto[]>(`${environment.apiBaseUrl}/Productos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();
        data.forEach((item: any) => {
          item.prod_Imagen = item.prod_Imagen.includes("http") ? item.prod_Imagen : environment.apiBaseUrl + item.prod_Imagen;
        });

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());
        
        this.productoGrid = datosFiltrados || [];
        
        // Resetear filtros y paginación al cargar nuevos datos
        this.busqueda = '';
        this.currentPage = 1;
        this.itemsPerPage = 8; // Asegurar que siempre sean 8 items por página
        this.productosFiltrados = [...this.productoGrid];
        
        // IMPORTANTE: NO llamar a filtradorProductos() aquí
        this.actualizarProductosVisibles();
        
      }, 500);
    });
  }

  currentPage: number = 1;
  itemsPerPage: number = 8;

  get startIndex(): number {
    return this.productosFiltrados?.length ? ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
  }

  get endIndex(): number {
    if (!this.productosFiltrados?.length) return 0;
    const end = this.currentPage * this.itemsPerPage;
    return end > this.productosFiltrados.length ? this.productosFiltrados.length : end;
  }

  pageChanged(event: any): void {
    this.currentPage = event.page;
    this.actualizarProductosVisibles();
  }

  trackByProductoId(index: number, item: any): any {
    return item.prod_Id;
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/agotado.png';
  }
}