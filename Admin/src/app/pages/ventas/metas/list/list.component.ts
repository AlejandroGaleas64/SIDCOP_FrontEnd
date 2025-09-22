import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Subcategoria } from 'src/app/Modelos/inventario/SubcategoriaModel';
import { TreeKeyManager } from '@angular/cdk/a11y';
import { NgxMaskService } from 'ngx-mask';
import { CurrencyMaskModule } from "ng2-currency-mask";

import { OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';

import { ProgressComponent } from '../progress/progress.component';

import { Meta } from 'src/app/Modelos/ventas/MetaModel';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { set } from 'lodash';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/exportHori.service';

import localeEsHN from '@angular/common/locales/es-HN';
import { registerLocaleData } from '@angular/common';
registerLocaleData(localeEsHN, 'es-HN');

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
    ReactiveFormsModule,
    NgSelectModule,
    CollapseModule,
    AccordionModule,
    CurrencyMaskModule,
    CreateComponent,
    EditComponent,
    DetailsComponent,
    ProgressComponent
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
    title: 'Listado de Metas',
    filename: 'Metas',
    department: 'Ventas',
    additionalInfo: '',
    columns: [
      { key: 'No', header: 'No.', width: 5, align: 'center' as const },
      { key: 'meta_Descripcion', header: 'Descripción', width: 25, align: 'left' as const },
      { key: 'meta_Tipo', header: 'Tipo', width: 17, align: 'left' as const },
      { key: 'meta_Ingresos', header: 'Ingresos', width: 20, align: 'left' as const },
      { key: 'meta_Unidades', header: 'Unidades', width: 15, align: 'left' as const },
      { key: 'meta_FechaInicio', header: 'Fecha Inicio', width: 15, align: 'left' as const },
      { key: 'meta_FechaFin', header: 'Fecha Fin', width: 15, align: 'left' as const }
    ] as ExportColumn[],
    dataMapping: (meta: any, index: number) => ({
      'No': meta?.meta_Id || (index + 1),
      'meta_Descripcion': this.limpiarTexto(meta?.meta_Descripcion),
      'meta_Tipo': this.limpiarTexto(
        meta?.meta_Tipo 
        // === 'IT'
          // ? 'Ingresos y Unidades'
          // : meta?.meta_Tipo === 'I'
          //   ? 'Ingresos'
          //   : meta?.meta_Tipo === 'U'
          //     ? 'Unidades'
          //     : 'N/A'
      ),
      'meta_Ingresos': meta?.meta_Ingresos ?? '',
      'meta_Unidades': meta?.meta_Unidades ?? '',
      'meta_FechaInicio': this.formatearFecha(meta?.meta_FechaInicio),
      'meta_FechaFin': this.formatearFecha(meta?.meta_FechaFin)
    })
  };

  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;
  breadCrumbItems!: Array<{}>;

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

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Metas', active: true }
    ];
    this.cargarAccionesUsuario();
    this.cargardatos(true);
    //console.log('Acciones disponibles:', this.accionesDisponibles);
  }

  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  editar(meta: any): void {
    this.metaEditando = { ...meta };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  detalles(meta: any): void {
    this.metaDetalle = { ...meta };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.activeActionRow = null;
  }

    abrirProgreso(meta: any): void {
    this.metaProgreso = {...meta};
    this.mostrarProgresoForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }

  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;
  metaEditando: any = null;
  metaDetalle: any = null;

  mostrarProgresoForm: boolean = false;
  metaProgreso: any = null;

  mostrarOverlayCarga = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  mostrarConfirmacionEliminar = false;
  metaEliminar: any = null;

  constructor(
    public table: ReactiveTableService<Meta>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {}

  accionesDisponibles: string[] = [];

  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.metaEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.metaDetalle = null;
  }


cerrarProgresoForm() {
  this.metaProgreso = null;
  this.mostrarProgresoForm = false;
  this.cargardatos(false);
}

  guardarMeta(meta: any): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos(false);
      this.showCreateForm = false;
      this.mensajeExito = `Meta guardada exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  actualizarMeta(meta: any): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos(true);
      this.showEditForm = false;
      this.mensajeExito = `Meta actualizada exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  confirmarEliminar(meta: any): void {
    this.metaEliminar = meta;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.metaEliminar = null;
    this.mostrarOverlayCarga = false;
  }

  eliminar(): void {
    if (!this.metaEliminar) return;
    this.mostrarOverlayCarga = true;
    this.http.put(`${environment.apiBaseUrl}/Metas/Eliminar/${this.metaEliminar.meta_Id}`, {}, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              this.mensajeExito = `Meta "${this.metaEliminar!.meta_Descripcion}" eliminada exitosamente`;
              this.mostrarAlertaExito = true;
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);
              this.cargardatos(false);
              this.cancelarEliminar();
            } else if (response.data.code_Status === -1) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'No se puede eliminar: la Meta está siendo utilizada.';
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
              this.cancelarEliminar();
            } else if (response.data.code_Status === 0) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'Error al eliminar la Meta.';
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
              this.cancelarEliminar();
            }
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = response.message || 'Error inesperado al eliminar la Meta.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            this.cancelarEliminar();
          }
        }, 1000);
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

  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Cambia el Pant_Id si es necesario para Metas
          modulo = permisos.find((m: any) => m.Pant_Id === 29);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos[' '] || permisos['Meta'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
        console.error('Error al parsear permisosJson:', e);
      }
    }
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLowerCase());
  }

  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Meta[]>(`${environment.apiBaseUrl}/Metas/ListarCompleto`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      const tienePermisoListar = this.accionPermitida('listar');
      const userId = getUserId();

      //console.log('Datos recibidos api metas:', data);
      const datosFiltrados = data;
        // : data.filter(r => r.usua_Creacion?.toString() === userId.toString());
      
      const finalData = datosFiltrados.map((meta, index) => ({
        ...meta,
        No: index + 1,
        meta_Objetivo: (['IT','IP','PC','IM'].includes(meta.meta_Tipo) ? meta.meta_Ingresos : meta.meta_Unidades),
        // meta_Ingresos: meta.meta_Ingresos?.toLocaleString('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 2 }),

        
      }));
      
      setTimeout(() => {
        this.table.setData(finalData);
        this.mostrarOverlayCarga = false;
      }, 500);
    });
  }

  // Exportación 
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
      return datos.map((modelo, index) =>
        this.exportConfig.dataMapping.call(this, modelo, index)
      );
    } catch (error) {
      console.error('Error obteniendo datos:', error);
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

  formatearFecha(fecha: any): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('es-HN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
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
}