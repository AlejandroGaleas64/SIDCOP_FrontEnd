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
import {Colonias} from 'src/app/Modelos/general/Colonias.Model';
import {Municipio} from 'src/app/Modelos/general/Municipios.Model';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';

// Importar el servicio de exportación optimizado
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
  private readonly exportConfig = {
    title: 'Listado de Colonias',                    
    filename: 'Colonias',                          
    department: 'General',                         
    additionalInfo: '',         
    
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Descripción', header: 'Descripción', width: 50, align: 'left' as const }
    ] as ExportColumn[],
    
    dataMapping: (colonia: Colonias, index: number) => ({
      'No': colonia?.secuencia || (index + 1),
      'Descripción': this.limpiarTexto(colonia?.colo_Descripcion)
      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(colonia?.campo),
    })
  };

  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  mostrarOverlayCarga: boolean = false;

  activeActionRow: number | null = null;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  
  accionesDisponibles: string[] = [];
  showCreateForm = false; 
  showEditForm = false; 
  showDetailsForm = false; 
  coloniaEditando: Colonias | null = null;
  coloniaDetalle: Colonias | null = null;
  municipios: Municipio[] = [];

  onDocumentClick(event: MouseEvent, rowIndex: number) {
    const target = event.target as HTMLElement;
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

  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; 
    this.showDetailsForm = false; 
    this.activeActionRow = null; 
  }

  editar(colonia: Colonias): void {
    this.coloniaEditando = { ...colonia }; 
    this.showEditForm = true;
    this.showCreateForm = false; 
    this.showDetailsForm = false; 
    this.activeActionRow = null; 
  }

   detalles(colonia: Colonias): void {
    const camposEsperados = [
      'colo_Descripcion', 'muni_Descripcion', 'depa_Descripcion',
      'secuencia', 'muni_Codigo', 'depa_Codigo',
      'usuarioCreacion', 'usuarioModificacion',
      'colo_FechaCreacion', 'colo_FechaModificacion'
    ];
    let faltantes: string[] = [];
    camposEsperados.forEach(campo => {
      if (!(campo in colonia)) {
        faltantes.push(campo);
      }
    });
    this.coloniaDetalle = { 
      ...colonia, 
    };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.activeActionRow = null;
  }

  mostrarConfirmacionEliminar = false;
  coloniaAEliminar: Colonias | null = null;

  private cargardatos(mostrarOverlay: boolean = true): void {
    if (mostrarOverlay) this.mostrarOverlayCarga = true;
    this.http.get<Colonias[]>(`${environment.apiBaseUrl}/Colonia/Listar`, {
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
        this.mensajeError = 'Error al cargar las colonias.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }

  constructor(public table: ReactiveTableService<Colonias>, 
    private http: HttpClient, 
    private router: Router, 
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService) {
      this.cargardatos(true);
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
      
      return datos.map((colonia, index) => 
        this.exportConfig.dataMapping.call(this, colonia, index)
      );
      
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

  cargarAccionesUsuario() {
    let accionesArray: string[] = [];
    let modulo: any = null;
    const permisosJson = localStorage.getItem('permisosJson');
    if (permisosJson) {
      try {
        const permisos = JSON.parse(permisosJson);
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla (17 para colonias)
                    modulo = permisos.find((m: any) => m.Pant_Id === 11);
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo = permisos['Colonias'] || permisos['colonias'] || null;
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
    this.cargarMunicipios();
  }

    onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  private cargarMunicipios(): void {
    this.http.get<Municipio[]>(`${environment.apiBaseUrl}/Municipios/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.municipios = data;
    }, error => {

    });
  }


  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.coloniaEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.coloniaDetalle = null;
  }

  guardarColonias(colonia: Colonias): void {
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

  actualizarColonias(colonia: Colonias): void {
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

  confirmarEliminar(  colonia: Colonias): void {
    this.coloniaAEliminar = colonia;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; 
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.coloniaAEliminar = null;
  }

  eliminar(): void {
    if (!this.coloniaAEliminar) return;
    this.mostrarOverlayCarga = true;
    this.http.post(`${environment.apiBaseUrl}/Colonia/Eliminar/${this.coloniaAEliminar.colo_Id}`, {}, {
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
              this.mensajeExito = `Colonia "${this.coloniaAEliminar!.colo_Descripcion}" eliminada exitosamente`;
              this.mostrarAlertaExito = true;
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);
              this.cancelarEliminar();
            } else if (response.data.code_Status === -1) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'No se puede eliminar: la colonia está siendo utilizada.';
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
              this.cancelarEliminar();
            } else if (response.data.code_Status === 0) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'Error al eliminar la colonia.';
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
              this.cancelarEliminar();
            }
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = response.message || 'Error inesperado al eliminar la colonia.';
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
        this.mensajeError = 'Error inesperado al eliminar la colonia.';
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
