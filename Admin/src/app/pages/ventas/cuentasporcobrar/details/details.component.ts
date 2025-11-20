import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { PagoCuentaPorCobrar } from 'src/app/Modelos/ventas/PagoCuentaPorCobrar.Model';
import { CuentasPorCobrarService } from 'src/app/servicios/ventas/cuentas-por-cobrar.service';
import { CuentasPorCobrarDataService } from 'src/app/servicios/ventas/cuentas-por-cobrar-data.service';
import { environment } from 'src/environments/environment';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { TableModule } from 'src/app/pages/table/table.module';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { trigger, style, transition, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

/**
 * Componente para mostrar el detalle de una cuenta por cobrar.
 * Permite visualizar información, pagos, anular pagos y navegar entre vistas.
 * Incluye control de permisos, alertas y animaciones.
 */
@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationModule, TableModule,  BreadcrumbsComponent],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
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
          '200ms ease-out',
          style({ height: '*', opacity: 1, transform: 'scaleY(1)' })
        ),
      ]),
      transition(':leave', [
        style({
          height: '*',
          opacity: 1,
          transform: 'scaleY(1)',
          overflow: 'hidden',
        }),
        animate(
          '200ms ease-in',
          style({ height: '0', opacity: 0, transform: 'scaleY(0.90)' })
        ),
      ]),
    ]),
  ],
})
export class DetailsComponent implements OnInit, OnDestroy {
  // Inputs / Outputs
  /**
   * Identificador de la cuenta por cobrar a mostrar (input).
   */
  @Input() set id(value: number) {
    if (value) {
      this.cuentaPorCobrarId = value;
      this.cargarDatos();
    }
  }
  breadCrumbItems: Array<{}> = [];
  /**
   * Evento emitido al cerrar el detalle.
   */
  @Output() onClose = new EventEmitter<void>();

  // Estado principal
  /**
   * Identificador de la cuenta por cobrar actual.
   */
  cuentaPorCobrarId: number = 0;
  /**
   * Detalle de la cuenta por cobrar actual.
   */
  cuentaPorCobrarDetalle: CuentaPorCobrar | null = null;
  /**
   * Lista de pagos realizados sobre la cuenta.
   */
  pagos: PagoCuentaPorCobrar[] = [];
  /**
   * Total pagado en la cuenta.
   */
  totalPagado: number = 0;
  /**
   * Estado de carga de datos.
   */
  cargando: boolean = false;
  /**
   * Muestra el overlay de carga mientras se obtienen datos.
   */
  mostrarOverlayCarga: boolean = false;

  // Tabla principal
  /**
   * Servicio de tabla reactiva para la tabla principal.
   */
  tablaPrincipal = new ReactiveTableService<any>();
  /**
   * Datos de la tabla principal (timeline de la cuenta).
   */
  datosTablaPrincipal: any[] = [];

  // Alertas
  /**
   * Control de visibilidad y mensajes para alertas de error.
   */
  mostrarAlertaError: boolean = false;
  mensajeError: string = '';
  /**
   * Control de visibilidad y mensajes para alertas de éxito.
   */
  mostrarAlertaExito: boolean = false;
  mensajeExito: string = '';

  // Modal de anulación
  /**
   * Control de visibilidad para el modal de anulación de pago.
   */
  mostrarModalAnulacion: boolean = false;
  /**
   * Pago seleccionado para anulación.
   */
  pagoSeleccionado: PagoCuentaPorCobrar | null = null;
  /**
   * Motivo de anulación del pago.
   */
  motivoAnulacion: string = '';
  /**
   * Estado de envío de la anulación.
   */
  enviandoAnulacion: boolean = false;

  // Menú flotante
  /**
   * Fila activa para mostrar acciones flotantes.
   */
  activeActionRow: number | null = null;

  // Suscripciones
  /**
   * Suscripción al cliente seleccionado.
   */
  private clienteSeleccionadoSub: Subscription | null = null;

  // Acciones disponibles
  /**
   * Acciones permitidas para el usuario en la pantalla.
   */
  accionesDisponibles: string[] = [];

  /**
   * Constructor: Inyecta servicios para gestión de datos, navegación, tabla y menú flotante.
   */
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private cuentasPorCobrarDataService: CuentasPorCobrarDataService,
    public table: ReactiveTableService<PagoCuentaPorCobrar>,
    public floatingMenuService: FloatingMenuService
  ) {}

  /**
   * Inicializa el componente, carga acciones, configura tabla y obtiene datos del cliente seleccionado.
   */
  ngOnInit(): void {
    this.cargarAccionesUsuario();
    this.configurarTablaPrincipal();
    this.initializeBreadcrumbs();

    this.clienteSeleccionadoSub =
      this.cuentasPorCobrarDataService.clienteSeleccionado$.subscribe(
        (cliente) => {
          if (cliente) {
            this.cuentaPorCobrarDetalle = cliente;
            this.cuentaPorCobrarId = cliente.cpCo_Id || 0;
            this.prepararDatosTablaPrincipal();
            this.cargarPagos();
          } else {
            this.route.params.subscribe((params) => {
              if (params['id'] && !this.cuentaPorCobrarId) {
                this.cuentaPorCobrarId = +params['id'];
                this.cargarDatos();
              } else if (!this.cuentaPorCobrarId) {
                this.router.navigate(['/ventas/cuentasporcobrar/list']);
              }
            });
          }
        }
      );
  }

  /**
   * Destruye el componente y cancela suscripciones activas.
   */
  ngOnDestroy(): void {
    if (this.clienteSeleccionadoSub) {
      this.clienteSeleccionadoSub.unsubscribe();
      this.clienteSeleccionadoSub = null;
    }
  }

private initializeBreadcrumbs(): void {
  this.breadCrumbItems = [
    { label: 'Ventas' },
    { label: 'Cuentas por Cobrar', active: false },
    { label: 'Detalles', active: true }
  ];
}

  /** Configuración de tabla */
  /**
   * Configura las columnas de la tabla principal (timeline).
   */
  private configurarTablaPrincipal(): void {
    this.tablaPrincipal.setConfig([
      'cpCo_Id',
      'fact_Id',
      'cpCo_FechaEmision',
      'cpCo_FechaVencimiento',
      'cpCo_Observaciones',
      'referencia',
      'monto',
      'totalPendiente',
      'secuencia',
    ]);
  }

  /**
   * Prepara los datos para la tabla principal a partir del detalle de la cuenta.
   */
  private prepararDatosTablaPrincipal(): void {
    if (!this.cuentaPorCobrarDetalle) return;

    const datos = [
      {
        cpCo_Id: this.cuentaPorCobrarDetalle.cpCo_Id,
        fact_Id: this.cuentaPorCobrarDetalle.fact_Id,
        cpCo_FechaEmision: this.cuentaPorCobrarDetalle.cpCo_FechaEmision,
        cpCo_FechaVencimiento:
          this.cuentaPorCobrarDetalle.cpCo_FechaVencimiento,
        cpCo_Observaciones: this.cuentaPorCobrarDetalle.cpCo_Observaciones,
        estaVencida: this.estaVencida(),
        cpCo_Saldada: this.cuentaPorCobrarDetalle.cpCo_Saldada,
        referencia: this.cuentaPorCobrarDetalle.fact_Id,
        monto: this.cuentaPorCobrarDetalle.cpCo_Valor,
        totalPendiente: this.cuentaPorCobrarDetalle.cpCo_Saldo,
        secuencia: 1,
      },
    ];

    this.datosTablaPrincipal = datos;
    this.tablaPrincipal.setData(datos);
  }

  /** Cargar datos */
  /**
   * Carga los datos del timeline y detalle de la cuenta por cobrar.
   */
  private cargarDatos(): void {
    this.cargando = true;
    this.mostrarOverlayCarga = true;
    this.mostrarAlertaError = false;

    this.cuentasPorCobrarService
      .obtenerDetalleTimeLine(this.cuentaPorCobrarId)
      .subscribe({
        next: (respuesta) => {
          if (respuesta.success && respuesta.data) {
            this.datosTablaPrincipal = respuesta.data;
            this.tablaPrincipal.setData(respuesta.data);

            // Obtener los datos de la cuenta por cobrar del primer elemento del timeline
            if (respuesta.data.length > 0) {
              this.cuentaPorCobrarDetalle = respuesta
                .data[0] as CuentaPorCobrar;
            }

            this.cargarPagos();
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError =
              'No se pudo cargar la información de la cuenta por cobrar.';
          }
          this.cargando = false;
          this.mostrarOverlayCarga = false;
        },
        error: () => {
          this.mostrarAlertaError = true;
          this.mensajeError =
            'Error al conectar con el servidor. Intente nuevamente más tarde.';
          this.cargando = false;
          this.mostrarOverlayCarga = false;
        },
      });
  }

  /**
   * Carga los pagos realizados sobre la cuenta por cobrar.
   */
  private cargarPagos(): void {
    this.mostrarOverlayCarga = true;
    this.cuentasPorCobrarService
      .obtenerPagosPorCuenta(this.cuentaPorCobrarId)
      .subscribe({
        next: (respuesta) => {
          if (respuesta.success && respuesta.data) {
            this.pagos = respuesta.data;
            this.table.setData(respuesta.data);
            this.table.setConfig([
              'pago_Id',
              'pago_Fecha',
              'pago_Monto',
              'foPa_Descripcion',
              'pago_NumeroReferencia',
              'pago_Observaciones',
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
        error: () => {
          this.pagos = [];
          this.table.setData([]);
          this.totalPagado = 0;
          this.cargando = false;
          this.mostrarOverlayCarga = false;
        },
      });
  }

  /** Navegación */
  /**
   * Navega a la lista de cuentas por cobrar.
   */
  cerrar(): void {
    this.router.navigate(['/ventas/cuentasporcobrar/list']);
  }

  /**
   * Navega a la pantalla de registro de pago para la cuenta actual.
   * @param cuentaId Identificador de la cuenta (opcional)
   */
  registrarPago(cuentaId?: number): void {
    // Si se proporciona un ID específico, usarlo; de lo contrario, usar el ID general
    const idAUsar = cuentaId || this.cuentaPorCobrarId;

    if (idAUsar) {
      this.router.navigate(['/ventas/cuentasporcobrar/payment/', idAUsar], {
        relativeTo: this.route,
      });
    }
  }

  /** Alertas */
  /**
   * Cierra la alerta de error.
   */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Cierra la alerta de éxito.
   */
  cerrarAlertaExito(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
  }

  /** Utilidades */
  /**
   * Formatea una fecha en formato local.
   * @param fecha Fecha a formatear
   */
  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-HN');
    } catch {
      return 'N/A';
    }
  }

  /**
   * Formatea un valor monetario en formato local.
   * @param valor Valor a formatear
   */
  formatearMoneda(valor: number | null): string {
    if (valor === null || valor === undefined) return 'L 0.00';
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(valor);
  }

  /**
   * Calcula los días de vencimiento de la cuenta por cobrar.
   */
  calcularDiasVencimiento(): number {
    if (!this.cuentaPorCobrarDetalle?.cpCo_FechaVencimiento) return 0;
    const fechaActual = new Date();
    const fechaVencimiento = new Date(
      this.cuentaPorCobrarDetalle.cpCo_FechaVencimiento
    );
    const diferencia = fechaActual.getTime() - fechaVencimiento.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  /**
   * Determina si la cuenta por cobrar está vencida.
   */
  estaVencida(): boolean {
    // Si no hay detalle, no podemos determinar si está vencida
    if (!this.cuentaPorCobrarDetalle) return false;

    // Si ya está marcada como vencida en los datos
    if (this.cuentaPorCobrarDetalle.estaVencido) return true;

    // Calcular basado en la fecha de vencimiento (ahora días vencidos es positivo si está vencida)
    return this.calcularDiasVencimiento() > 0;
  }

  /**
   * Calcula el total pagado en la cuenta por cobrar.
   */
  calcularTotalPagado(): number {
    return this.pagos
      .filter((p) => !p.pago_Anulado)
      .reduce((t, p) => t + (p.pago_Monto || 0), 0);
  }

  /** Anulación de pagos */
  /**
   * Abre el modal para anular un pago seleccionado.
   * @param pago Pago a anular
   */
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

  /**
   * Cierra el modal de anulación de pago.
   */
  cerrarModalAnulacion(): void {
    this.mostrarModalAnulacion = false;
    this.pagoSeleccionado = null;
    this.motivoAnulacion = '';
  }

  /**
   * Realiza la anulación del pago seleccionado si el motivo es válido.
   */
  anularPago(): void {
    if (!this.pagoSeleccionado || !this.motivoAnulacion.trim()) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Debe ingresar un motivo de anulación.';
      return;
    }
    this.enviandoAnulacion = true;
    this.mostrarAlertaError = false;
    this.mostrarAlertaExito = false;

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
            this.cargarPagos();
            this.cargarDatos();
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = respuesta.message || 'Error al anular el pago.';
          }
          this.enviandoAnulacion = false;
        },
        error: () => {
          this.mostrarAlertaError = true;
          this.mensajeError =
            'Error al conectar con el servidor. Intente nuevamente más tarde.';
          this.enviandoAnulacion = false;
        },
      });
  }

  /** Permisos */
  /**
   * Verifica si una acción está permitida para el usuario actual.
   * @param accion Nombre de la acción a validar
   */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.includes(accion.trim().toLowerCase());
  }

  /**
   * Alias para verificar si el usuario tiene permiso para una acción.
   * @param accion Nombre de la acción
   */
  tienePermiso(accion: string): boolean {
    return this.accionPermitida(accion);
  }

  /**
   * Carga las acciones permitidas para el usuario desde los permisos almacenados.
   */
  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];

    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo: any = null;

        if (Array.isArray(permisos)) {
          modulo = permisos.find((m: any) => m.Pant_Id === 34);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo =
            permisos['Cuentas por Cobrar'] ||
            permisos['cuentas por cobrar'] ||
            null;
        }

        if (modulo?.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter(
            (a: any) => typeof a === 'string'
          );
        }
      } catch {}
    }

    this.accionesDisponibles = accionesArray
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0);
  }
}
