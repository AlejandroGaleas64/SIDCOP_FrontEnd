import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
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

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationModule, TableModule],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
  animations: [
    trigger('fadeExpand', [
      transition(':enter', [
        style({ height: '0', opacity: 0, transform: 'scaleY(0.90)', overflow: 'hidden' }),
        animate('200ms ease-out', style({ height: '*', opacity: 1, transform: 'scaleY(1)' }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, transform: 'scaleY(1)', overflow: 'hidden' }),
        animate('200ms ease-in', style({ height: '0', opacity: 0, transform: 'scaleY(0.90)' }))
      ])
    ])
  ]
})
export class DetailsComponent implements OnInit, OnDestroy {
  // Inputs / Outputs
  @Input() set id(value: number) {
    if (value) {
      this.cuentaPorCobrarId = value;
      this.cargarDatos();
    }
  }
  @Output() onClose = new EventEmitter<void>();

  // Estado principal
  cuentaPorCobrarId: number = 0;
  cuentaPorCobrarDetalle: CuentaPorCobrar | null = null;
  pagos: PagoCuentaPorCobrar[] = [];
  totalPagado: number = 0;
  cargando: boolean = false;
  mostrarOverlayCarga: boolean = false;

  // Tabla principal
  tablaPrincipal = new ReactiveTableService<any>();
  datosTablaPrincipal: any[] = [];

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

  // Menú flotante
  activeActionRow: number | null = null;

  // Suscripciones
  private clienteSeleccionadoSub: Subscription | null = null;

  // Acciones disponibles
  accionesDisponibles: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private cuentasPorCobrarDataService: CuentasPorCobrarDataService,
    public table: ReactiveTableService<PagoCuentaPorCobrar>,
    public floatingMenuService: FloatingMenuService
  ) {}

  ngOnInit(): void {
    this.cargarAccionesUsuario();
    this.configurarTablaPrincipal();

    this.clienteSeleccionadoSub = this.cuentasPorCobrarDataService.clienteSeleccionado$.subscribe(cliente => {
      if (cliente) {
        this.cuentaPorCobrarDetalle = cliente;
        this.cuentaPorCobrarId = cliente.cpCo_Id || 0;
        this.prepararDatosTablaPrincipal();
        this.cargarPagos();
      } else {
        this.route.params.subscribe(params => {
          if (params['id'] && !this.cuentaPorCobrarId) {
            this.cuentaPorCobrarId = +params['id'];
            this.cargarDatos();
          } else if (!this.cuentaPorCobrarId) {
            this.router.navigate(['/ventas/cuentasporcobrar/list']);
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.clienteSeleccionadoSub) {
      this.clienteSeleccionadoSub.unsubscribe();
      this.clienteSeleccionadoSub = null;
    }
  }

  /** Configuración de tabla */
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
      'secuencia'
    ]);
  }

  private prepararDatosTablaPrincipal(): void {
    if (!this.cuentaPorCobrarDetalle) return;

    const datos = [
      {
        cpCo_Id: this.cuentaPorCobrarDetalle.cpCo_Id,
        fact_Id: this.cuentaPorCobrarDetalle.fact_Id,
        cpCo_FechaEmision: this.cuentaPorCobrarDetalle.cpCo_FechaEmision,
        cpCo_FechaVencimiento: this.cuentaPorCobrarDetalle.cpCo_FechaVencimiento,
        cpCo_Observaciones: this.cuentaPorCobrarDetalle.cpCo_Observaciones,
        estaVencida: this.estaVencida(),
        cpCo_Saldada: this.cuentaPorCobrarDetalle.cpCo_Saldada,
        referencia: this.cuentaPorCobrarDetalle.fact_Id,
        monto: this.cuentaPorCobrarDetalle.cpCo_Valor,
        totalPendiente: this.cuentaPorCobrarDetalle.cpCo_Saldo,
        secuencia: 1
      }
    ];

    this.datosTablaPrincipal = datos;
    this.tablaPrincipal.setData(datos);
  }

  /** Cargar datos */
  private cargarDatos(): void {
    this.cargando = true;
    this.mostrarOverlayCarga = true;
    this.mostrarAlertaError = false;

    this.cuentasPorCobrarService.obtenerDetalleTimeLine(this.cuentaPorCobrarId).subscribe({
      next: respuesta => {
        if (respuesta.success && respuesta.data) {
          this.datosTablaPrincipal = respuesta.data;
          this.tablaPrincipal.setData(respuesta.data);
          
          // Obtener los datos de la cuenta por cobrar del primer elemento del timeline
          if (respuesta.data.length > 0) {
            this.cuentaPorCobrarDetalle = respuesta.data[0] as CuentaPorCobrar;
          }
          
          this.cargarPagos();
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = 'No se pudo cargar la información de la cuenta por cobrar.';
        }
        this.cargando = false;
        this.mostrarOverlayCarga = false;
      },
      error: () => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al conectar con el servidor. Intente nuevamente más tarde.';
        this.cargando = false;
        this.mostrarOverlayCarga = false;
      }
    });
  }

  private cargarPagos(): void {
    this.mostrarOverlayCarga = true;
    this.cuentasPorCobrarService.obtenerPagosPorCuenta(this.cuentaPorCobrarId).subscribe({
      next: respuesta => {
        if (respuesta.success && respuesta.data) {
          this.pagos = respuesta.data;
          this.table.setData(respuesta.data);
          this.table.setConfig(['pago_Id', 'pago_Fecha', 'pago_Monto', 'foPa_Descripcion', 'pago_NumeroReferencia', 'pago_Observaciones']);
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
      }
    });
  }

  /** Navegación */
  cerrar(): void {
    this.router.navigate(['/ventas/cuentasporcobrar/list']);
  }

  registrarPago(cuentaId?: number): void {
    // Si se proporciona un ID específico, usarlo; de lo contrario, usar el ID general
    const idAUsar = cuentaId || this.cuentaPorCobrarId;
    
    if (idAUsar) {
      this.router.navigate(['/ventas/cuentasporcobrar/payment/', idAUsar], { relativeTo: this.route });
    }
  }

  /** Alertas */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  cerrarAlertaExito(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
  }

  /** Utilidades */
  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha).toLocaleDateString('es-HN');
    } catch {
      return 'N/A';
    }
  }

  formatearMoneda(valor: number | null): string {
    if (valor === null || valor === undefined) return 'L 0.00';
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(valor);
  }

  calcularDiasVencimiento(): number {
    if (!this.cuentaPorCobrarDetalle?.cpCo_FechaVencimiento) return 0;
    const fechaActual = new Date();
    const fechaVencimiento = new Date(this.cuentaPorCobrarDetalle.cpCo_FechaVencimiento);
    const diferencia = fechaVencimiento.getTime() - fechaActual.getTime();
    return Math.ceil(diferencia / (1000 * 3600 * 24));
  }

  estaVencida(): boolean {
    // Si no hay detalle, no podemos determinar si está vencida
    if (!this.cuentaPorCobrarDetalle) return false;
    
    // Si ya está marcada como vencida en los datos
    if (this.cuentaPorCobrarDetalle.estaVencido) return true;
    
    // Calcular basado en la fecha de vencimiento
    return this.calcularDiasVencimiento() < 0;
  }

  calcularTotalPagado(): number {
    return this.pagos.filter(p => !p.pago_Anulado).reduce((t, p) => t + (p.pago_Monto || 0), 0);
  }

  /** Anulación de pagos */
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

    const usuarioId = environment.usua_Id ?? 0;

    this.cuentasPorCobrarService.anularPago(this.pagoSeleccionado.pago_Id || 0, usuarioId, this.motivoAnulacion).subscribe({
      next: respuesta => {
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
        this.mensajeError = 'Error al conectar con el servidor. Intente nuevamente más tarde.';
        this.enviandoAnulacion = false;
      }
    });
  }

  /** Permisos */
  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.includes(accion.trim().toLowerCase());
  }

  tienePermiso(accion: string): boolean {
    return this.accionPermitida(accion);
  }

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
          modulo = permisos['Cuentas por Cobrar'] || permisos['cuentas por cobrar'] || null;
        }

        if (modulo?.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
        }
      } catch {}
    }

    this.accionesDisponibles = accionesArray.map(a => a.trim().toLowerCase()).filter(a => a.length > 0);
  }
}
