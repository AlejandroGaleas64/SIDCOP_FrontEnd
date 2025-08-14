import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { getUserId } from 'src/app/core/utils/user-utils';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { CreateComponent } from '../create/create.component';
import { EditComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { Descuento } from 'src/app/Modelos/inventario/DescuentoModel';
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { set } from 'lodash';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/exportHori.service';

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
          title: 'Listado de Descuentos',                    // Título del reporte
          filename: 'Descuentos',                           // Nombre base del archivo
          department: 'Invetario',                         // Departamento
          additionalInfo: '',         // Información adicional
          
          // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
          columns: [
            { key: 'No', header: 'No.', width: 5, align: 'center' as const },
            { key: 'Descripcion', header: 'Descripcion', width: 25, align: 'left' as const },
            { key: 'Tipo', header: 'Tipo', width: 17, align: 'left' as const },
            { key: 'Aplica en', header: 'Aplica en', width: 20, align: 'left' as const },
            { key: 'Tipo de Factura', header: 'Tipo de Factura', width: 15, align: 'left' as const },
            { key: 'Fecha Inicio', header: 'Fecha Inicio', width: 15, align: 'left' as const },
            { key: 'Fecha Fin', header: 'Fecha Fin', width: 15, align: 'left' as const },
            { key: 'Observaciones', header: 'Observaciones', width: 20, align: 'left' as const }
            
          ] as ExportColumn[],
          
          // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
          dataMapping: (descuento: Descuento, index: number) => ({
            'No': descuento?.secuencia || (index + 1),
            'Descripcion': this.limpiarTexto(descuento?.desc_Descripcion),
            'Tipo': this.limpiarTexto(descuento?.desc_Tipo == true? 'Monto Fijo' : 'Porcentaje'),
            'Aplica en': this.limpiarTexto(descuento?.desc_Aplicar == 'M'? 'Marcas' : descuento.desc_Aplicar == 'C'? 'Categorias' : descuento.desc_Aplicar == 'S'? 'Subcategoria' : 'Productos'),
            'Tipo de Factura': this.limpiarTexto( descuento.desc_TipoFactura == 'CR'? 'Credito' : descuento.desc_TipoFactura == 'CO'? 'Contado' : descuento.desc_TipoFactura == 'AM'? 'Ambas' : 'N/A'),
            'Fecha Inicio': this.formatearFecha(descuento?.desc_FechaInicio),
            'Fecha Fin': this.formatearFecha(descuento?.desc_FechaFin),
            'Observaciones': this.limpiarTexto(descuento?.desc_Observaciones),
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

       formatearFecha(fecha: any): string {
        if (!fecha) return '';
        const d = new Date(fecha);
        if (isNaN(d.getTime())) return '';
        // dd/MM/yyyy
        return new Intl.DateTimeFormat('es-HN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).format(d);
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
  breadCrumbItems!: Array<{}>;
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

   ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Inventario' },
      { label: 'Descuentos', active: true }
    ];

     this.cargarAccionesUsuario();
    console.log('Acciones disponibles:', this.accionesDisponibles);
  }
  // Métodos para los botones de acción principales (crear, editar, detalles)
  crear(): void {
    console.log('Toggleando formulario de creación...');
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false; // Cerrar edit si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  editar(descuento: Descuento): void {
    console.log('Abriendo formulario de edición para:', descuento);
    console.log('Datos específicos:', {
      id: descuento.desc_Id,
      completo: descuento
    });
    this.descuentoEditando = { ...descuento }; // Hacer copia profunda
    this.showEditForm = true;
    this.showCreateForm = false; // Cerrar create si está abierto
    this.showDetailsForm = false; // Cerrar details si está abierto
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  detalles(descuento: Descuento): void {
    console.log('Abriendo detalles para:', descuento);
    this.descuentoDetalle = { ...descuento }; // Hacer copia profunda
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
  descuentoEditando: Descuento | null = null;
  descuentoDetalle: Descuento | null = null;
  
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
  descuentoEliminar: Descuento | null = null;

  constructor(public table: ReactiveTableService<Descuento>, private http: HttpClient, private router: Router, private route: ActivatedRoute, public floatingMenuService: FloatingMenuService, private exportService: ExportService) {
    this.cargardatos(true);

  }

   accionesDisponibles: string[] = [];

  // Método robusto para validar si una acción está permitida
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
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
    this.descuentoEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.descuentoDetalle = null;
  }

  guardarDescuento(descuento: Descuento): void {
    console.log('Descuento guardado exitosamente desde create component:', descuento);
     this.mostrarOverlayCarga = true;
    setTimeout(()=> {
    // Recargar los datos de la tabla
    this.cargardatos(false);
    this.showCreateForm = false;
      this.mensajeExito = `Descuento guardado exitosamente`;
      this.mostrarAlertaExito = true;
    setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);

     }, 1000);
  }

  actualizarDescuento(descuento: Descuento): void {
     this.mostrarOverlayCarga = true;
    console.log('Descuento actualizado exitosamente desde edit component:', descuento);
    setTimeout(() => {
    // Recargar los datos de la tabla
    this.cargardatos(false);
    this.showEditForm = false;
      this.mensajeExito = `Descuento actualizado exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
     }, 1000);
  }

  confirmarEliminar(descuento: Descuento): void {
    console.log('Solicitando confirmación para eliminar:', descuento);
    this.descuentoEliminar = descuento;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.descuentoEliminar = null;
  }

  eliminar(): void {
    if (!this.descuentoEliminar) return;
    
    console.log('Eliminando Descuento:', this.descuentoEliminar);
    this.mostrarOverlayCarga = true;
    this.http.post(`${environment.apiBaseUrl}/Descuentos/Eliminar/${this.descuentoEliminar.desc_Id}`, {}, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
        console.log('Respuesta del servidor:', response);
        
        // Verificar el código de estado en la respuesta
        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            // Éxito: eliminado correctamente
            console.log('Descuento eliminada exitosamente');
            this.mensajeExito = `Descuento "${this.descuentoEliminar!.desc_Descripcion}" eliminada exitosamente`;
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
            console.log('el Descuento está siendo utilizada');
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'No se puede eliminar: la Descuento está siendo utilizada.';
            
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
            this.mensajeError = response.data.message_Status || 'Error al eliminar el Descuento.';
            
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
          this.mensajeError = response.message || 'Error inesperado al eliminar la Descuento.';
          
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
    console.log('Valor bruto en localStorage (permisosJson):', permisosRaw);
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
          modulo = permisos[' '] || permisos['Descuento'] || null;
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

  private cargardatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Descuento[]>(`${environment.apiBaseUrl}/Descuentos/Listar`, {
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