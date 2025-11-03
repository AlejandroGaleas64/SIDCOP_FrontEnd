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
import { Migracion } from 'src/app/Modelos/acceso/migraciones.model';
import { ConfiguracionFactura } from 'src/app/Modelos/ventas/ConfiguracionFactura.Model';

import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
//Importaciones de Animaciones
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { set } from 'lodash';
// Importar el servicio de exportación optimizado
import {
  ExportService,
  ExportConfig,
  ExportColumn,
} from 'src/app/shared/export.service';

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
          overflow: 'hidden',
        }),
        animate(
          '300ms ease-out',
          style({
            height: '*',
            opacity: 1,
            transform: 'scaleY(1)',
            overflow: 'hidden',
          })
        ),
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate(
          '300ms ease-in',
          style({
            height: '0',
            opacity: 0,
            transform: 'scaleY(0.95)',
          })
        ),
      ]),
    ]),
  ],
  //Animaciones para collapse
})
export class ListComponent implements OnInit {

  // ===== CONFIGURACIÓN DE EXPORTACIÓN =====
  private readonly exportConfig = {
    // Configuración básica
    title: 'Migraciones', // Título del reporte
    filename: 'Migracion de Datos', // Nombre base del archivo
    department: 'Ventas', // Departamento
    additionalInfo: '', // Información adicional

    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 8, align: 'center' as const },
      { key: 'Codigo', header: 'Codigo', width: 25, align: 'left' as const },
      {
        key: 'Descripción',
        header: 'Descripción',
        width: 50,
        align: 'left' as const,
      },
      {
        key: 'Sucursal',
        header: 'Sucursal',
        width: 75,
        align: 'left' as const,
      },
      { key: 'Estado', header: 'Estado', width: 75, align: 'left' as const },
    ] as ExportColumn[],

    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (modelo: Migracion, index: number) => ({
      Tabla: this.limpiarTexto(modelo?.coMi_Tabla),
      Fecha: this.limpiarTexto(modelo?.coMi_UltimaFechaMigracion),

      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(modelo?.campo),
    }),
  };

  // ===== PROPIEDADES GENERALES =====
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;
  breadCrumbItems!: Array<{}>;
  accionesDisponibles: string[] = [];

  // Método robusto para validar si una acción está permitida
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(
      (a) => a.trim().toLowerCase() === accion.trim().toLowerCase()
    );
  }

  ngOnInit(): void {
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'Acceso' },
      { label: 'Migracion', active: true },
    ];

    // Obtener acciones disponibles del usuario (ejemplo: desde API o localStorage)
    this.cargarAccionesUsuario();
    //console.log('Acciones disponibles:', this.accionesDisponibles);
  }

  // Cierra el dropdown si se hace click fuera

  // Métodos para los botones de acción principales (crear, editar, detalles)
  crear(): void {
    //console.log('Toggleando formulario de creación...');
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  // ===== PROPIEDADES ESPECÍFICAS DE MIGRACIÓN =====
  infoconfiguracion: any[] = [];
  mostrarConfirmacionMigrar = false;
  mostrarConfirmacionMigrarGeneral = false;
  migracionPendiente: Migracion | null = null;


  cargarconfiguracion() {
    this.http
      .get<any[]>(`${environment.apiBaseUrl}/ConfiguracionFactura/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe(
        (data) => {
          this.infoconfiguracion = data;

        
          //console.log('Configuraciones cargadas:', this.infoconfiguracion);
        },
        (error) => {
          console.error('Error al cargar las configuraciones:', error);
        }
      );
  }

  private descargarLogMigracion(message: string, tabla: string): void {
    const fecha = new Date();
    const fechaStr = `${fecha.getFullYear()}${(fecha.getMonth() + 1)
      .toString()
      .padStart(2, '0')}${fecha.getDate().toString().padStart(2, '0')}_${fecha
      .getHours()
      .toString()
      .padStart(2, '0')}${fecha.getMinutes().toString().padStart(2, '0')}${fecha
      .getSeconds()
      .toString()
      .padStart(2, '0')}`;
    const nombreArchivo = `Log_Migracion_${tabla}_${fechaStr}.txt`;

    const blob = new Blob([message], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  confirmarMigracion(migracionesinfo: Migracion): void {
  //console.log('Solicitando confirmación para migrar:', migracionesinfo);
  this.migracionPendiente = migracionesinfo;
  this.mostrarConfirmacionMigrar = true;
  this.activeActionRow = null; // Cerrar menú de acciones
}

cancelarMigrar(): void {
  this.mostrarConfirmacionMigrar = false;
  this.migracionPendiente = null;
}

confirmarMigrar(): void {
  if (this.migracionPendiente) {
    this.mostrarConfirmacionMigrar = false;
    this.migrar(this.migracionPendiente);
    this.migracionPendiente = null;
  }
}

// ===== MÉTODOS DE MIGRACIÓN =====
confirmarMigracionGeneral(): void {
  this.mostrarConfirmacionMigrarGeneral = true;
}

cancelarMigrarGeneral(): void {
  this.mostrarConfirmacionMigrarGeneral = false;
}

confirmarMigrarGeneral(): void {
  this.mostrarConfirmacionMigrarGeneral = false;
  this.migrarGeneral();
}

  migrar(migracionesinfo: Migracion): void {
    this.mostrarOverlayCarga = true;

    // Buscar la ruta física correspondiente en infoconfiguracion
    const config = this.infoconfiguracion.map(
      (config) => config.coFa_RutaMigracion
    );
    const rutaFisica = config?.[0] || '';
    //console.log('Ruta física encontrada:', rutaFisica);
    //console.log('Migrando paquete:', migracionesinfo.coMi_Tabla);
    const paquete = migracionesinfo.coMi_Tabla;

    const body = {
      paquete: paquete,
      rutaFisica: rutaFisica,
    };

    const url = `${environment.apiBaseUrl}/Migracion/Migrar`;

    this.http
      .post(url, body, {
        headers: {
          'X-Api-Key': environment.apiKey,
          accept: '*/*',
        },
      })
      .subscribe({
        next: (response: any) => {
          this.mostrarOverlayCarga = false;
          //console.log('Respuesta al migrar :', response);

          if (response?.message) {
            this.descargarLogMigracion(response.message, paquete);
          }

          if (response && response.success) {
            this.mostrarAlertaExito = true;
            this.mensajeExito = `Migración de ${paquete} completada exitosamente.`;

            setTimeout(() => this.cerrarAlerta(), 3000);
            this.cargardatos(true);
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = `Error inesperado al migrar "${paquete}".`;
            setTimeout(() => this.cerrarAlerta(), 5000);
          }
        },
        error: (error) => {
          this.mostrarOverlayCarga = false;
          this.mostrarAlertaError = true;
          console.error(`Error al migrar "${paquete}":`, error);

          if (error) {
            this.descargarLogMigracion(error, paquete);
          }

          //console.log('Error', error);

          this.mensajeError = `Error al intentar migrar "${paquete}".`;
          setTimeout(() => this.cerrarAlerta(), 5000);
        },
      });
  }

  // ...existing code...

  // ===== CONTROL DE FORMULARIOS =====
  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;

  // ===== PROPIEDADES PARA ALERTAS =====
  mostrarOverlayCarga = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEliminar = false;

  constructor(
    public table: ReactiveTableService<Migracion>,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private exportService: ExportService
  ) {
    this.cargardatos(true);
    this.cargarconfiguracion();
  }

  // ===== MÉTODOS DE EXPORTACIÓN =====
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
      this.mostrarMensaje(
        'error',
        `Error al exportar archivo ${tipo.toUpperCase()}`
      );
    } finally {
      this.exportando = false;
      this.tipoExportacion = null;
    }
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
        additionalInfo: this.exportConfig.additionalInfo,
      },
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
  private manejarResultadoExport(resultado: {
    success: boolean;
    message: string;
  }): void {
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
  private mostrarMensaje(
    tipo: 'success' | 'error' | 'warning' | 'info',
    mensaje: string
  ): void {
    this.cerrarAlerta();

    const duracion = tipo === 'error' ? 5000 : 3000;

    switch (tipo) {
      case 'success':
        this.mostrarAlertaExito = true;
        this.mensajeExito = mensaje;
        setTimeout(() => (this.mostrarAlertaExito = false), duracion);
        break;

      case 'error':
        this.mostrarAlertaError = true;
        this.mensajeError = mensaje;
        setTimeout(() => (this.mostrarAlertaError = false), duracion);
        break;

      case 'warning':
      case 'info':
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        setTimeout(() => (this.mostrarAlertaWarning = false), duracion);
        break;
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

  // ===== CONTROL DE FORMULARIOS =====
  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
  }

  confirmarEliminar(migracionesinfo: Migracion): void {
    //console.log('Solicitando confirmación para eliminar:', migracionesinfo);
    //this.PEEliminar = migracionesinfo;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    // this.PEEliminar = null;
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // ===== MÉTODOS PRIVADOS =====
  private cargarAccionesUsuario(): void {
    // Obtener permisosJson del localStorage
    const permisosRaw = localStorage.getItem('permisosJson');
    //console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // Buscar el módulo de Estados Civiles (ajusta el nombre si es diferente)
        let modulo = null;
        if (Array.isArray(permisos)) {
          // Buscar por ID de pantalla (ajusta el ID si cambia en el futuro)
          modulo = permisos.find((m: any) => m.Pant_Id === 79);
        } else if (typeof permisos === 'object' && permisos !== null) {
          // Si es objeto, buscar por clave
          modulo = permisos['Migraciones'] || permisos['migraciones'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          // Extraer solo el nombre de la acción
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter(
            (a: any) => typeof a === 'string'
          );
        }
      } catch (e) {
        console.error('Error al parsear permisosJson:', e);
      }
    }
    this.accionesDisponibles = accionesArray
      .filter((a) => typeof a === 'string' && a.length > 0)
      .map((a) => a.trim().toLowerCase());
    //console.log('Acciones finales:', this.accionesDisponibles);
  }

  migrarGeneral(): void {
    this.mostrarOverlayCarga = true;

    const config = this.infoconfiguracion.map(
      (config) => config.coFa_RutaMigracion
    );
    const rutaFisica = config?.[0] || '';

    const body = {
      paquete: 'General',
      rutaFisica: rutaFisica,
    };

    this.http
      .post(`${environment.apiBaseUrl}/Migracion/Migrar`, body, {
        headers: {
          'X-Api-Key': environment.apiKey,
          accept: '*/*',
        },
      })
      .subscribe({
        next: (response: any) => {
          //console.log('Respuesta al migrar General:', response);

          setTimeout(() => {
            this.mostrarOverlayCarga = false;

            if (response?.message) {
              this.descargarLogMigracion(response.message, 'General');
            }

            if (response.success) {
              this.mostrarAlertaExito = true;
              this.mensajeExito = 'Migración General completada exitosamente.';

              setTimeout(() => this.cerrarAlerta(), 3000);
              this.cargardatos(false);
            } else {
              this.mostrarAlertaError = true;
              this.mensajeError =
                response.message || 'Error inesperado al migrar "General".';

              setTimeout(() => this.cerrarAlerta(), 5000);
            }
          }, 1000);
        },
        error: (error) => {
          console.error('Error al migrar "General":', error);
          this.mostrarOverlayCarga = false;
          this.mostrarAlertaError = true;

          if (error) {
            this.descargarLogMigracion(error, 'General');
          }

          this.mensajeError = 'Error al intentar migrar "General".';
          setTimeout(() => this.cerrarAlerta(), 5000);
        },
      });
  }

  //Declaramos un estado en el cargarDatos, esto para hacer el overlay
  //segun dicha funcion de recargar, ya que si vienes de hacer una accion
  //es innecesario mostrar el overlay de carga
  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;

    this.http
      .get<Migracion[]>(`${environment.apiBaseUrl}/Migracion/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe((data) => {
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        // const datosFiltrados = tienePermisoListar
        //   ? data
        //   : data.filter(r => r.usua_Creacion?.toString() === userId.toString());
        //console.log('Datos recibidos del servidor:', data);
        const datosTransformados = data.map((item) => ({
          ...item,
          coMi_Tabla:
            item.coMi_Tabla === 'Bodega' ? 'Bodegas' : item.coMi_Tabla,
        }));
        setTimeout(() => {
          this.table.setData(datosTransformados);
          this.mostrarOverlayCarga = false;
        }, 500);
      });
  }
}
