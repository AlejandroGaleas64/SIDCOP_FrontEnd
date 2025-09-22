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
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { Municipio } from 'src/app/Modelos/general/Municipios.Model';
import { Departamento } from 'src/app/Modelos/general/Departamentos.Model';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
// Importar el servicio de exportación
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/export.service';

import { trigger, transition, style, animate } from '@angular/animations';

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
  styleUrl: './list.component.scss',
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

  activeActionRow: number | null = null;
  // Variables para control de alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  mostrarOverlayCarga = false;
  
  // Acciones disponibles para el usuario
  accionesDisponibles: string[] = [];
  showCreateForm = false; // Control del collapse
  showEditForm = false; // Control del collapse de edición
  showDetailsForm = false; // Control del collapse de detalles
  municipioEditando: Municipio | null = null;
  municipioDetalle: Municipio | null = null;
  departamentos: Departamento[] = [];

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
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  editar(municipio: Municipio): void {
    this.municipioEditando = { ...municipio }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

   detalles(municipio: Municipio): void {
    const depto = this.departamentos.find(d => d.depa_Codigo === municipio.depa_Codigo);
    this.municipioDetalle = { 
      ...municipio, 
      depa_Descripcion: depto ? depto.depa_Descripcion : 'N/A' 
    };
    this.showDetailsForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showEditForm = false; // Cerrar edit si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  // Propiedades para alertas (ya definidas al inicio de la clase)
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  municipioAEliminar: Municipio | null = null;

  private cargardatos(mostrarOverlay: boolean = true): void {
    this.mostrarOverlayCarga = true;
    this.http.get<Municipio[]>(`${environment.apiBaseUrl}/Municipios/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();        

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(r => r.usua_Creacion?.toString() === userId.toString());

        this.table.setData(datosFiltrados);
        
        this.mostrarOverlayCarga = false;
      },
      error: (error) => {
        this.mostrarOverlayCarga = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los municipios.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }

  constructor(public table: ReactiveTableService<Municipio>, 
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService) {
      this.cargardatos(true);
    }

  // ===== CONFIGURACIÓN FÁCIL DE EXPORTACIÓN =====
  private readonly exportConfig = {
    title: 'Listado de Municipios',
    filename: 'Municipios',
    department: 'General',
    additionalInfo: '',
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Código', header: 'Código', width: 25, align: 'left' as const },
      { key: 'Municipio', header: 'Municipio', width: 50, align: 'left' as const },
      { key: 'Departamento', header: 'Departamento', width: 50, align: 'left' as const }
    ] as ExportColumn[],
    dataMapping: (muni: Municipio, index: number) => ({
      'No': muni?.secuencia || (index + 1),
      'Código': this.limpiarTexto(muni?.muni_Codigo),
      'Municipio': this.limpiarTexto(muni?.muni_Descripcion),
      'Departamento': this.limpiarTexto(muni?.depa_Descripcion)
    })
  };

  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

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
  async exportarExcel(): Promise<void> { await this.exportar('excel'); }
  async exportarPDF(): Promise<void> { await this.exportar('pdf'); }
  async exportarCSV(): Promise<void> { await this.exportar('csv'); }
  puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
    if (this.exportando) {
      return tipo ? this.tipoExportacion !== tipo : false;
    }
    return this.table.data$.value?.length > 0;
  }
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
  private obtenerDatosExport(): any[] {
    try {
      const datos = this.table.data$.value;
      if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error('No hay datos disponibles para exportar');
      }
      return datos.map((muni, index) => this.exportConfig.dataMapping.call(this, muni, index));
    } catch (error) {
      throw error;
    }
  }
  private manejarResultadoExport(resultado: { success: boolean; message: string }): void {
    if (resultado.success) {
      this.mostrarMensaje('success', resultado.message);
    } else {
      this.mostrarMensaje('error', resultado.message);
    }
  }
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
  private limpiarTexto(texto: any): string {
    if (!texto) return '';
    return String(texto)
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:()\[\]]/g, '')
      .trim()
      .substring(0, 150);
  }
  private mostrarMensaje(tipo: 'success' | 'error' | 'warning' | 'info', mensaje: string): void {
    if (typeof this.cerrarAlerta === 'function') this.cerrarAlerta();
    const duracion = tipo === 'error' ? 5000 : 3000;
    switch (tipo) {
      case 'success':
        (this as any).mostrarAlertaExito = true;
        (this as any).mensajeExito = mensaje;
        setTimeout(() => (this as any).mostrarAlertaExito = false, duracion);
        break;
      case 'error':
        (this as any).mostrarAlertaError = true;
        (this as any).mensajeError = mensaje;
        setTimeout(() => (this as any).mostrarAlertaError = false, duracion);
        break;
      case 'warning':
      case 'info':
        (this as any).mostrarAlertaWarning = true;
        (this as any).mensajeWarning = mensaje;
        setTimeout(() => (this as any).mostrarAlertaWarning = false, duracion);
        break;
    }
  }


  // Verificar si una acción está permitida
  accionPermitida(accion: string): boolean {
    const accionBuscada = accion.toLowerCase();
    const accionesMapeadas: {[key: string]: string} = {
      'detalles': 'detalle',
      'nuevo': 'crear'
    };
    const accionReal = accionesMapeadas[accionBuscada] || accionBuscada;
    return this.accionesDisponibles.some(a => a === accionReal);
  }

  // Cargar acciones disponibles del usuario
  cargarAccionesUsuario() {
    let accionesArray: string[] = [];
    let modulo: any = null;
    const permisosJson = localStorage.getItem('permisosJson');
    if (permisosJson) {
      try {
        const permisos = JSON.parse(permisosJson);
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla (16 para municipios)
                    modulo = permisos.find((m: any) => m.Pant_Id === 18);
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo = permisos['Municipios'] || permisos['municipios'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones
            .map((a: any) => {
              const accion = a.Accion || a.accion || a;
              return typeof accion === 'string' ? accion.trim().toLowerCase() : '';
            })
            .filter((a: string) => a.length > 0);
        }
      } catch (e) {
      }
    }
    this.accionesDisponibles = accionesArray;
  }

  // Inicializar componente
  ngOnInit() {
    this.cargarAccionesUsuario();
    this.cargardatos();
    this.cargarDepartamentos();
  }

  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  private cargarDepartamentos(): void {
    this.http.get<Departamento[]>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.departamentos = data;
    }, error => {
    });
  }

  // (navigateToCreate eliminado, lógica movida a crear)

  // (navigateToEdit y navigateToDetails eliminados, lógica movida a editar y detalles)

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.municipioEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.municipioDetalle = null;
  }

  guardarMunicipio(municipio: Municipio): void {
    this.mostrarOverlayCarga = true;
    setTimeout(()=> {
      this.cargardatos(false);
      this.showCreateForm = false;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  actualizarMunicipio(municipio: Municipio): void {
    this.mostrarOverlayCarga = true;
    setTimeout(()=> {
      this.cargardatos(false);
      this.showEditForm = false;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  confirmarEliminar(municipio: Municipio): void {
    this.municipioAEliminar = municipio;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.municipioAEliminar = null;
  }

  eliminar(): void {
    if (!this.municipioAEliminar) return;
    this.mostrarOverlayCarga = true;
    this.http.post(`${environment.apiBaseUrl}/Municipios/Eliminar/${this.municipioAEliminar.muni_Codigo}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.cargardatos(false);
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              this.mensajeExito = `Municipio "${this.municipioAEliminar!.muni_Descripcion}" eliminado exitosamente`;
              this.mostrarAlertaExito = true;
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);
              this.cargardatos(false);
              this.cancelarEliminar();
            } else if (response.data.code_Status === -1) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'No se puede eliminar: el municipio está siendo utilizado.';
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
              this.cancelarEliminar();
            } else if (response.data.code_Status === 0) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'Error al eliminar el municipio.';
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
              this.cancelarEliminar();
            }
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = response.message || 'Error inesperado al eliminar el municipio.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            this.cancelarEliminar();
          }
        }, 1000);
      },
      error: (error) => {
        this.mostrarOverlayCarga = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error inesperado al eliminar el municipio.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
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

}
