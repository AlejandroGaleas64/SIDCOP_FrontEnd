import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { CuentasPorCobrarService } from 'src/app/servicios/ventas/cuentas-por-cobrar.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BreadcrumbsComponent,
    TableModule,
    PaginationModule
  ],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit {
  // bread crumb items
  breadCrumbItems!: Array<{}>;

  // Acciones disponibles para el usuario en esta pantalla
  accionesDisponibles: string[] = [];

  // METODO PARA VALIDAR SI UNA ACCIÓN ESTÁ PERMITIDA
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  ngOnInit(): void {
    /**
     * BreadCrumb
     */
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Cuentas por Cobrar', active: true }
    ];

    // OBTENER ACCIONES DISPONIBLES DEL USUARIO
    this.cargarAccionesUsuario();
  }

  constructor(public table: ReactiveTableService<CuentaPorCobrar>, 
    private router: Router, 
    private route: ActivatedRoute,
    public floatingMenuService: FloatingMenuService,
    private cuentasPorCobrarService: CuentasPorCobrarService
  )
  {
    this.cargardatos();
  }   

  activeActionRow: number | null = null;
  showEdit = true;
  showDetails = true;
  showDelete = true;
  showPayment = true;
  
  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  
  // Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;
  cuentaPorCobrarAEliminar: CuentaPorCobrar | null = null;
  
  // Propiedad para mostrar overlay de carga
  mostrarOverlayCarga = false;

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  confirmarEliminar(cuentaPorCobrar: CuentaPorCobrar): void {
    this.cuentaPorCobrarAEliminar = cuentaPorCobrar;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null; // Cerrar menú de acciones
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.cuentaPorCobrarAEliminar = null;
  }

  eliminar(): void {
    if (!this.cuentaPorCobrarAEliminar) return;
    
    
    this.cuentasPorCobrarService.eliminarCuentaPorCobrar(this.cuentaPorCobrarAEliminar.cpCo_Id).subscribe({
      next: (response: any) => {
        
        // Verificar el código de estado en la respuesta
        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            // Éxito: eliminado correctamente
            this.mensajeExito = `Cuenta por cobrar eliminada exitosamente`;
            this.mostrarAlertaExito = true;
            
            // Ocultar la alerta después de 3 segundos
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 3000);
            
            this.cargardatos();
            this.cancelarEliminar();
          } else if (response.data.code_Status === -1) {
            //result: está siendo utilizado
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'No se puede eliminar: la cuenta por cobrar está siendo utilizada.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            // Cerrar el modal de confirmación
            this.cancelarEliminar();
          } else if (response.data.code_Status === 0) {
            // Error general
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status || 'Error al eliminar la cuenta por cobrar.';
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            
            // Cerrar el modal de confirmación
            this.cancelarEliminar();
          }
        } else {
          // Respuesta inesperada
          this.mostrarAlertaError = true;
          this.mensajeError = response.message || 'Error inesperado al eliminar la cuenta por cobrar.';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          
          // Cerrar el modal de confirmación
          this.cancelarEliminar();
        }
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al comunicarse con el servidor. Por favor, inténtelo de nuevo más tarde.';
        
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
        
        // Cerrar el modal de confirmación
        this.cancelarEliminar();
      }
    });
  }

  // AQUI EMPIEZA LO BUENO PARA LAS ACCIONES
  private cargarAccionesUsuario(): void {
    // OBTENEMOS PERMISOSJSON DEL LOCALSTORAGE
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        // BUSCAMOS EL MÓDULO DE CUENTAS POR COBRAR
        let modulo = null;
        if (Array.isArray(permisos)) {
          // BUSCAMOS EL MÓDULO DE CUENTAS POR COBRAR POR ID O NOMBRE
          modulo = permisos.find((m: any) => 
            m.Pant_Id === 34 || // ID correcto del módulo de Cuentas por Cobrar
            (m.Nombre && m.Nombre.toLowerCase() === 'cuentas por cobrar')
          );
        } else if (typeof permisos === 'object' && permisos !== null) {
          // ESTO ES PARA CUANDO LOS PERMISOS ESTÁN EN UN OBJETO CON CLAVES
          modulo = permisos['Cuentas por Cobrar'] || permisos['cuentas por cobrar'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          // AQUI SACAMOS SOLO EL NOMBRE DE LA ACCIÓN
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
      }
    } 
    // AQUI FILTRAMOS Y NORMALIZAMOS LAS ACCIONES
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLowerCase());
  }

  // Métodos para navegación desde el menú flotante
  irAEditar(id: number): void {
    this.router.navigate(['/ventas/cuentasporcobrar/edit', id]);
    this.floatingMenuService.close();
  }

  irADetalles(id: number): void {
    this.router.navigate(['/ventas/cuentasporcobrar/details', id]);
    this.floatingMenuService.close();
  }

  irARegistrarPago(id: number): void {
    this.router.navigate(['/ventas/cuentasporcobrar/payment', id]);
    this.floatingMenuService.close();
  }

  private cargardatos(): void {
    // Mostrar overlay de carga
    this.mostrarOverlayCarga = true;
    
    this.cuentasPorCobrarService.obtenerCuentasPorCobrar(true, false).subscribe({
      next: (response: any) => {
        // Ocultar overlay de carga
        this.mostrarOverlayCarga = false;
        
        if (response.success && response.data) {
          const data = response.data;
          
          // Agregar secuencia a cada elemento
          data.forEach((item: CuentaPorCobrar, index: number) => {
            item.secuencia = index + 1;
          });
          
          // Filtrar datos según permisos del usuario
          const tienePermisoListar = this.accionPermitida('listar');
          const userId = getUserId();
          
          
          const datosFiltrados = tienePermisoListar
            ? data // Si tiene permiso de listar, muestra todos los registros
            : data.filter((item: CuentaPorCobrar) => {
                // Si no tiene permiso de listar, solo muestra los creados por el usuario actual
                return item.usua_Creacion === userId || item.usua_Creacion?.toString() === userId.toString();
              });
          
          this.table.setData(datosFiltrados);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = 'No se pudieron cargar los datos correctamente.';
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      },
      error: (error) => {
        // Ocultar overlay de carga incluso en caso de error
        this.mostrarOverlayCarga = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los datos. Por favor, inténtelo de nuevo más tarde.';
        
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }
}