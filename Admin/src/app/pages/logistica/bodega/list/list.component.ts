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
import { Bodega } from 'src/app/Modelos/logistica/Bodega.Model';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { set } from 'lodash';
//Importaciones de Animaciones
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
  //Animaciones para collapse
})
export class ListComponent implements OnInit {

   private readonly exportConfig = {
      // Configuración básica
      title: 'Listado de Bodegas',                    // Título del reporte
      filename: 'Bodegas',                           // Nombre base del archivo
      department: 'Logistica',                         // Departamento
      additionalInfo: '',         // Información adicional
      
      // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
      columns: [
        { key: 'No', header: 'No.', width: 8, align: 'center' as const },
        { key: 'Descripción', header: 'Descripción', width: 50, align: 'left' as const },
        { key: 'Capacidad', header: 'Capacidad', width: 10, align: 'left' as const },
        { key: 'Placa', header: 'Placa', width: 15, align: 'left' as const },
        { key: 'Tipo Camión', header: 'Tipo Camión', width: 15, align: 'left' as const },
        { key: 'VIN', header: 'VIN', width: 20, align: 'left' as const },
        { key: 'Vendedor', header: 'Vendedor', width: 30, align: 'left' as const },
        { key: 'Sucursal', header: 'Sucursal', width: 30, align: 'left' as const },
        { key: 'Registro Cai', header: 'Registro Cai', width: 30, align: 'left' as const },
        { key: 'Modelo', header: 'Modelo', width: 30, align: 'left' as const }
      ] as ExportColumn[],
      
      // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
      dataMapping: (bodega: Bodega, index: number) => ({
        'No': bodega?.secuencia || (index + 1),
        'Descripción': this.limpiarTexto(bodega?.bode_Descripcion),
        'Capacidad': this.limpiarTexto(bodega?.bode_Capacidad),
        'Placa': this.limpiarTexto(bodega?.bode_Placa),
        'Tipo Camión': this.limpiarTexto( bodega.bode_TipoCamion === 'G' ? 'Grande' :
                      bodega.bode_TipoCamion === 'M' ? 'Mediano' :
                      bodega.bode_TipoCamion === 'P' ? 'Pequeño' :
                      'N/A'),
        'VIN': this.limpiarTexto(bodega?.bode_VIN),
        'Vendedor': this.limpiarTexto(bodega?.vend_Nombres) + ' ' + this.limpiarTexto(bodega?.vend_Apellidos),
        'Sucursal': this.limpiarTexto(bodega?.sucu_Descripcion),
        'Registro Cai': this.limpiarTexto(bodega?.regC_Descripcion),
        'Modelo': this.limpiarTexto(bodega?.mode_Descripcion),
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
      const datos = this.table.data$.value;
      
      if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error('No hay datos disponibles para exportar');
      }
      
      // Usar el mapeo configurado
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
  
  breadCrumbItems!: Array<{}>;
    exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;
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

  editar(bodega: Bodega): void {
    //console.log('Abriendo formulario de edición para:', bodega);
  
    this.bodegaEditando = { ...bodega }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(bodega: Bodega): void {
    //console.log('Abriendo detalles para:', bodega);
    this.bodegaDetalle = { ...bodega }; // Hacer copia profunda
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
  bodegaEditando: Bodega | null = null;
  bodegaDetalle: Bodega | null = null;
  
  // Propiedades para alertas
  mostrarOverlayCarga = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  bodegaAEliminar: Bodega | null = null;

  constructor(public table: ReactiveTableService<Bodega>, private http: HttpClient, private router: Router, private route: ActivatedRoute, public floatingMenuService: FloatingMenuService,  private exportService: ExportService) {
    this.cargardatos(true);
  }

  accionesDisponibles: string[] = [];

  // Método robusto para validar si una acción está permitida
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }


  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Logística' },
      { label: 'Bodegas', active: true }
    ];

    this.cargarAccionesUsuario();
    //console.log('Acciones disponibles:', this.accionesDisponibles);
  }

  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }



  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.bodegaEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.bodegaDetalle = null;
  }

  guardarBodega(bodega: Bodega): void {
    this.mostrarOverlayCarga = true;
    setTimeout(()=> {
      this.cargardatos(false);
      this.showCreateForm = false;
      this.mensajeExito = `Bodega guardada exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  actualizarBodega(bodega: Bodega): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargardatos(false);
      this.showEditForm = false;
      this.mensajeExito = `Bodega actualizada exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  confirmarEliminar(bodega: Bodega): void {
    //console.log('Solicitando confirmación para eliminar:', bodega);
    this.bodegaAEliminar = bodega;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.bodegaAEliminar = null;
  }

  eliminar(): void {
    if (!this.bodegaAEliminar) return;
    
    //console.log('Eliminando bodega:', this.bodegaAEliminar);
    this.mostrarOverlayCarga = true;
    this.http.post(`${environment.apiBaseUrl}/Bodega/Eliminar/${this.bodegaAEliminar.bode_Id}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          //console.log('Respuesta del servidor:', response);
          
          // Verificar el código de estado en la respuesta
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              // Éxito: eliminado correctamente
              //console.log('Bodega eliminada exitosamente');
              this.mensajeExito = `Bodega "${this.bodegaAEliminar!.bode_Descripcion}" eliminada exitosamente`;
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
              //console.log('La bodega está siendo utilizada');
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'No se puede eliminar: la bodega está siendo utilizada.';

              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);

              // Cerrar el modal de confirmación
              this.cancelarEliminar();
            } else if (response.data.code_Status === 0) 
            {
              // Error general
              //console.log('Error general al eliminar');
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status || 'Error al eliminar la bodega.';

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
            this.mensajeError = response.message || 'Error inesperado al eliminar la bodega.';

            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);

            // Cerrar el modal de confirmación
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
    // Obtener permisosJson del localStorage
    const permisosRaw = localStorage.getItem('permisosJson');
    // //console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // Buscar el módulo de Estados Civiles (ajusta el nombre si es diferente)
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla (ajusta el ID si cambia en el futuro)
          modulo = permisos.find((m: any) => m.Pant_Id === 28);
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo = permisos['Bodegas'] || permisos['bodegas'] || null;
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

  //Declaramos un estado en el cargarDatos, esto para hacer el overlay
  //segun dicha funcion de recargar, ya que si vienes de hacer una accion
  //es innecesario mostrar el overlay de carga
  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Bodega[]>(`${environment.apiBaseUrl}/Bodega/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      const tienePermisoListar = this.accionPermitida('listar');
      const userId = getUserId();

      const datosFiltrados = tienePermisoListar
        ? data
        : data.filter(r => r.usua_Creacion?.toString() === userId.toString());

      setTimeout(() => {
        this.table.setData(datosFiltrados);
        this.mostrarOverlayCarga = false;
      }, 500);

    });
  }


  
}