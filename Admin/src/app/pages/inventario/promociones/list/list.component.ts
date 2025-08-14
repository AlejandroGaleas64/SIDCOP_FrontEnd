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
import { Promocion } from 'src/app/Modelos/inventario/PromocionModel';
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
            title: 'Listado de Promociones',                    // Título del reporte
            filename: 'Promociones',                           // Nombre base del archivo
            department: 'Invetario',  
            additionalInfo: '',                       // Departamento        
            
            // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
            columns: [
              { key: 'No', header: 'No.', width: 5, align: 'center' as const },
              { key: 'Codigo', header: 'Codigo', width: 25, align: 'left' as const },
              { key: 'Descripcion', header: 'Descripcion', width: 25, align: 'left' as const },
              { key: 'Descripcion Corta', header: 'Descripcion Corta', width: 25, align: 'left' as const },
              { key: 'Precio', header: 'Precio', width: 17, align: 'left' as const },
              { key: 'Esta Activo', header: 'Esta Activo', width: 17, align: 'left' as const },
              
              
            ] as ExportColumn[],
            
            // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
            dataMapping: (promocion: Promocion, index: number) => ({
              'No': promocion?.secuencia || (index + 1),
              'Codigo': this.limpiarTexto(promocion?.prod_Codigo),
              'Descripcion': this.limpiarTexto(promocion?.prod_Descripcion),
              'Descripcion Corta': this.limpiarTexto(promocion?.prod_DescripcionCorta),
              'Precio': this.limpiarTexto('L. ' + promocion?.prod_PrecioUnitario.toFixed(2) ),
              'Esta Activo': this.limpiarTexto(promocion?.prod_Estado? 'Si' : 'No'),

               // Combina dirección, municipio y departamento
              // Agregar más campos aquí según necesites:
              // 'Campo': this.limpiarTexto(modelo?.campo),
            })
          };
      
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
          console.log('this.productos: ',this.productos);
            console.log('this.productosFiltrados: ',this.productosFiltrados);
            console.log('this.productoGrid: ',this.productoGrid);
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
            // Usa productosFiltrados para exportar lo que ves en pantalla
            const datos = this.productos;
            

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
           const datos = this.productosFiltrados.length > 0 || this.busqueda.trim()
            ? this.productosFiltrados
            : this.productos;

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
    exportando = false;
      tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;
  // bread crumb items
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario en esta pantalla
  accionesDisponibles: string[] = [];

  busqueda: string = '';
  productosFiltrados: any[] = [];

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
    console.log('Acciones disponibles:', this.accionesDisponibles);
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
    console.log('Toggleando formulario de creación...');
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  editar(producto: Producto): void {
    console.log('Abriendo formulario de edición para:', producto);
    console.log('Datos específicos:', {
      id: producto.prod_Id,
      descripcion: producto.prod_Descripcion,
      completo: producto
    });
    this.productoEditando = { ...producto }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(producto: Producto): void {
    console.log('Abriendo detalles para:', producto);
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
      this.mensajeExito = 'Promocion guardada exitosamente';
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
      this.mensajeExito = 'Promocion actualizada exitosamente';
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }
  
  confirmarEliminar(producto: Producto): void {
    console.log('Solicitando confirmación para eliminar:', producto);
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
    this.http.put(`${environment.apiBaseUrl}/Promociones/CambiarEstado/${this.productoAEliminar.prod_Id}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          console.log('Respuesta del servidor:', response);
        
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              // Éxito: eliminado correctamente
              this.mensajeExito = response.data.message_Status;
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
              console.log('Rol está siendo utilizado');
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
              console.log('Error general al eliminar');
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
            console.log('Respuesta inesperada del servidor');
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
    console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
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
    console.log('Acciones finales:', this.accionesDisponibles);
  }

  productoGrid: any = [];
  productos: any = [];

  filtradorProductos(): void {
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) {
      this.productosFiltrados = this.productos;
    } else {
      this.productosFiltrados = this.productos.filter((producto: any) =>
        (producto.prod_DescripcionCorta || '').toLowerCase().includes(termino) ||
        (producto.prod_CodigoBarra || '').toLowerCase().includes(termino) ||
        (producto.prod_Descripcion || '').toLowerCase().includes(termino)
      );
    }
  }

  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Promocion[]>(`${environment.apiBaseUrl}/Promociones/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
         const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());
        this.productoGrid = datosFiltrados || [];
        this.productos = this.productoGrid.slice(0, 8);
        this.filtradorProductos();
      },500);
    });
  }

  currentPage: number = 1;
  itemsPerPage: number = 8;

  get startIndex(): number {
    return this.productoGrid?.length ? ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
  }

  get endIndex(): number {
    if (!this.productoGrid?.length) return 0;
    const end = this.currentPage * this.itemsPerPage;
    return end > this.productoGrid.length ? this.productoGrid.length : end;
  }

  pageChanged(event: any): void {
    this.currentPage = event.page;
    const startItem = (event.page - 1) * event.itemsPerPage;
    const endItem = event.page * event.itemsPerPage;
    this.productos = this.productoGrid.slice(startItem, endItem);
    this.filtradorProductos();
  }

  trackByProductoId(index: number, item: any): any {
    return item.prod_Id;
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/agotado.png';
  }
}