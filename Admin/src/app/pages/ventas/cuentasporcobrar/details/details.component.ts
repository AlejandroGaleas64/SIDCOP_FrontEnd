import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { PagoCuentaPorCobrar } from 'src/app/Modelos/ventas/PagoCuentaPorCobrar.Model';
import { CuentasPorCobrarService } from 'src/app/servicios/ventas/cuentas-por-cobrar.service';
import { environment } from 'src/environments/environment';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { TableModule } from 'src/app/pages/table/table.module';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationModule, TableModule],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent implements OnInit {
  cuentaPorCobrarId: number = 0;
  cuentaPorCobrarDetalle: CuentaPorCobrar | null = null;
  pagos: PagoCuentaPorCobrar[] = [];
  totalPagado: number = 0;
  cargando: boolean = false;
  mostrarOverlayCarga: boolean = false;

  // Alertas
  mostrarAlertaError: boolean = false;
  mensajeError: string = '';
  mostrarAlertaExito: boolean = false;
  mensajeExito: string = '';

  // Modal de anulación
  mostrarModalAnulacion: boolean = false;
  pagoSeleccionado: PagoCuentaPorCobrar | null = null;
  motivoAnulacion: string = '';
  enviandoAnulacion: boolean = false;
  
  // Control del menú flotante
  activeActionRow: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    public table: ReactiveTableService<PagoCuentaPorCobrar>,
    public floatingMenuService: FloatingMenuService
  ) {}

  ngOnInit(): void {
    // Cargar los permisos del usuario
    this.cargarAccionesUsuario();

    // Obtener el ID de la cuenta por cobrar de los parámetros de la ruta
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.cuentaPorCobrarId = +params['id'];
        this.cargarDatos();
      } else {
        this.router.navigate(['/ventas/cuentasporcobrar/list']);
      }
    });
  }

  private cargarDatos(): void {
    this.cargando = true;
    this.mostrarOverlayCarga = true;
    this.mostrarAlertaError = false;

    // Cargar datos de la cuenta por cobrar
    this.cuentasPorCobrarService
      .obtenerCuentaPorCobrarPorId(this.cuentaPorCobrarId)
      .subscribe({
        next: (respuesta) => {
          if (respuesta.success && respuesta.data) {
            // Mapear los datos de la API a nuestro modelo usando el constructor
            this.cuentaPorCobrarDetalle = new CuentaPorCobrar({
              cpCo_Id: respuesta.data.cpCo_Id,
              clie_Id: respuesta.data.clie_Id,
              fact_Id: respuesta.data.fact_Id,
              cpCo_FechaEmision: new Date(respuesta.data.cpCo_FechaEmision),
              cpCo_FechaVencimiento: new Date(
                respuesta.data.cpCo_FechaVencimiento
              ),
              cpCo_Valor: respuesta.data.cpCo_Valor,
              cpCo_Saldo: respuesta.data.cpCo_Saldo,
              cpCo_Observaciones: respuesta.data.cpCo_Observaciones || '',
              cpCo_Anulado: respuesta.data.cpCo_Anulado,
              cpCo_Saldada: respuesta.data.cpCo_Saldada,
              cpCo_Estado: respuesta.data.cpCo_Estado,
              usua_Creacion: respuesta.data.usua_Creacion,
              cpCo_FechaCreacion: new Date(respuesta.data.cpCo_FechaCreacion),
              usua_Modificacion: respuesta.data.usua_Modificacion,
              cpCo_FechaModificacion: respuesta.data.cpCo_FechaModificacion
                ? new Date(respuesta.data.cpCo_FechaModificacion)
                : undefined,
              clie_Codigo: '',
              clie_Nombres: respuesta.data.clie_Nombres || '',
              clie_Apellidos: respuesta.data.clie_Apellidos || '',
              clie_NombreNegocio: respuesta.data.clie_NombreNegocio || '',
              clie_Telefono: respuesta.data.clie_Telefono || '',
              clie_LimiteCredito: 0,
              clie_Saldo: 0,
              usuarioCreacion: respuesta.data.usuarioCreacion || '',
              usuarioModificacion: respuesta.data.usuarioModificacion || '',
            });

            // Cargar pagos de esta cuenta
            this.cargarPagos();
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError =
              'No se pudo cargar la información de la cuenta por cobrar.';
            this.cargando = false;
            this.mostrarOverlayCarga = false;
          }
        },
        error: (error: any) => {
          this.mostrarAlertaError = true;
          this.mensajeError =
            'Error al conectar con el servidor. Intente nuevamente más tarde.';
          this.cargando = false;
          this.mostrarOverlayCarga = false;
        },
      });
  }

  private cargarPagos(): void {
    this.mostrarOverlayCarga = true;
    this.cuentasPorCobrarService
      .obtenerPagosPorCuenta(this.cuentaPorCobrarId)
      .subscribe({
        next: (respuesta) => {
          if (respuesta.success && respuesta.data) {
            this.pagos = respuesta.data;
            
            // Configurar la tabla reactiva
            this.table.setData(respuesta.data);
            
            // Configurar campos de búsqueda
            this.table.setConfig([
              'pago_Id',
              'pago_Fecha',
              'pago_Monto',
              'pago_FormaPago',
              'pago_NumeroReferencia',
              'pago_Observaciones'
            ]);
            
            this.totalPagado = this.calcularTotalPagado();
          } else {
            this.pagos = [];
            this.table.setData([]);
            this.totalPagado = 0;
          }
          this.cargando = false;
          this.mostrarOverlayCarga = false;
        },
        error: (error: any) => {
          this.pagos = [];
          this.table.setData([]);
          this.totalPagado = 0;
          this.cargando = false;
          this.mostrarOverlayCarga = false;
        },
      });
  }

  cerrar(): void {
    this.router.navigate(['list'], { relativeTo: this.route.parent });
  }

  registrarPago(): void {
    if (this.cuentaPorCobrarId) {
      this.router.navigate(
        ['/ventas/cuentasporcobrar/payment/', this.cuentaPorCobrarId],
        { relativeTo: this.route }
      );
    }
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-HN');
  }

  formatearMoneda(valor: number | null): string {
    if (valor === null || valor === undefined) return 'L 0.00';
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(valor);
  }

  calcularDiasVencimiento(): number {
    if (
      !this.cuentaPorCobrarDetalle ||
      !this.cuentaPorCobrarDetalle.cpCo_FechaVencimiento
    ) {
      return 0;
    }

    const fechaActual = new Date();
    const fechaVencimiento = new Date(
      this.cuentaPorCobrarDetalle.cpCo_FechaVencimiento
    );

    const diferencia = fechaVencimiento.getTime() - fechaActual.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  estaVencida(): boolean {
    return this.calcularDiasVencimiento() < 0;
  }

  calcularTotalPagado(): number {
    return this.pagos
      .filter((pago) => !pago.pago_Anulado)
      .reduce((total, pago) => total + (pago.pago_Monto || 0), 0);
  }

  // Métodos para anulación de pagos
  abrirModalAnulacion(pago: PagoCuentaPorCobrar): void {
    if (pago.pago_Anulado) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Este pago ya ha sido anulado.';
      return;
    }

    this.pagoSeleccionado = pago;
    this.motivoAnulacion = '';
    this.mostrarModalAnulacion = true;
  }

  cerrarModalAnulacion(): void {
    this.mostrarModalAnulacion = false;
    this.pagoSeleccionado = null;
    this.motivoAnulacion = '';
  }

  anularPago(): void {
    if (!this.pagoSeleccionado || !this.motivoAnulacion.trim()) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Debe ingresar un motivo de anulación.';
      return;
    }

    this.enviandoAnulacion = true;
    this.mostrarAlertaError = false;
    this.mostrarAlertaExito = false;

    // Obtener el ID del usuario del environment
    const usuarioId = environment.usua_Id ?? 0;

    this.cuentasPorCobrarService
      .anularPago(
        this.pagoSeleccionado.pago_Id || 0,
        usuarioId,
        this.motivoAnulacion
      )
      .subscribe({
        next: (respuesta) => {
          if (respuesta.success) {
            this.mostrarAlertaExito = true;
            this.mensajeExito = 'Pago anulado correctamente.';
            this.cerrarModalAnulacion();
            // Recargar los pagos para reflejar el cambio
            this.cargarPagos();
            // Recargar los datos de la cuenta para actualizar el saldo
            this.cargarDatos();
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = respuesta.message || 'Error al anular el pago.';
          }
          this.enviandoAnulacion = false;
        },
        error: (error) => {

          this.mostrarAlertaError = true;
          this.mensajeError =
            'Error al conectar con el servidor. Intente nuevamente más tarde.';
          this.enviandoAnulacion = false;
        },
      });
  }

  cerrarAlertaExito(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
  }

  // Acciones disponibles para el usuario en esta pantalla
  accionesDisponibles: string[] = [];

  /**
   * Verifica si el usuario tiene permiso para realizar una acción específica
   * @param accion Nombre de la acción a verificar (ej: 'anular', 'editar', 'crear')
   * @returns true si el usuario tiene permiso, false en caso contrario
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }
  
  // Método de compatibilidad para no romper el código existente
  tienePermiso(accion: string): boolean {
    return this.accionPermitida(accion);
  }

  /**
   * Carga las acciones disponibles para el usuario desde localStorage
   */
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
          // BUSCAMOS EL MÓDULO DE CUENTAS POR COBRAR POR ID
          modulo = permisos.find((m: any) => m.Pant_Id === 34);

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
    
    // Filtramos y normalizamos las acciones
    this.accionesDisponibles = accionesArray
      .filter((a) => typeof a === 'string' && a.length > 0)
      .map((a) => a.trim().toLowerCase());

    
    // Verificar específicamente si existe el permiso de anular
    const tienePermisoAnular = this.accionPermitida('anular');
  }
}