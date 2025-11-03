import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { PagoCuentaPorCobrar } from 'src/app/Modelos/ventas/PagoCuentaPorCobrar.Model';
import { FormaPago } from 'src/app/Modelos/ventas/FormaPago.Model';
import { CuentasPorCobrarService } from 'src/app/servicios/ventas/cuentas-por-cobrar.service';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { Subscription } from 'rxjs';

/**
 * Componente para el registro de pagos de cuentas por cobrar.
 * Permite seleccionar forma de pago, ingresar monto y observaciones, y registrar el pago.
 * Incluye validaciones, alertas y navegación.
 */
@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, BreadcrumbsComponent],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.scss'
})
export class PaymentComponent implements OnInit, OnDestroy {
  // Breadcrumbs
  /**
   * Items para el breadcrumb de navegación.
   */
  breadCrumbItems: Array<{}> = [];

  /**
   * Identificador de la cuenta por cobrar a la que se registra el pago.
   */
  cuentaId: number = 0;
  /**
   * Detalle de la cuenta por cobrar actual.
   */
  cuentaPorCobrar: CuentaPorCobrar | null = null;
  /**
   * Formulario reactivo para el registro de pago.
   */
  pagoForm: FormGroup;
  /**
   * Lista de formas de pago disponibles.
   */
  formasPago: FormaPago[] = [];
  /**
   * Estado de carga de datos.
   */
  cargando: boolean = false;
  /**
   * Estado de envío del formulario de pago.
   */
  enviando: boolean = false;
  /**
   * Control de visibilidad y mensajes para alertas de error.
   */
  mostrarAlertaError: boolean = false;
  /**
   * Control de visibilidad y mensajes para alertas de éxito.
   */
  mostrarAlertaExito: boolean = false;
  /**
   * Mensaje de error mostrado en alertas.
   */
  mensajeError: string = '';
  /**
   * Mensaje de éxito mostrado en alertas.
   */
  mensajeExito: string = '';
  /**
   * Subscripciones activas para evitar memory leaks.
   */
  private subscripciones: Subscription[] = [];

  /**
   * Constructor: Inyecta servicios para formularios, navegación y gestión de datos.
   */
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private cuentasPorCobrarService: CuentasPorCobrarService
  ) {
    this.pagoForm = this.fb.group({
      cpCo_Id: [0, Validators.required],
      pago_Monto: [0, [Validators.required, Validators.min(0.01)]],
      foPa_Id: [0, Validators.required],
      pago_NumeroReferencia: [''],
      pago_Observaciones: ['', Validators.maxLength(500)],
    });
  }

  /**
   * Inicializa el componente, configura breadcrumbs y carga formas de pago y datos de la cuenta.
   */
  ngOnInit(): void {
    // Configurar breadcrumbs
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Cuentas por Cobrar', active: false },
      { label: 'Registrar Pago', active: true }
    ];
    
    // Cargar formas de pago
    this.cargarFormasPago();
    
    const routeSub = this.route.params.subscribe(params => {
      if (params['id']) {
        this.cuentaId = +params['id'];
        this.cargarDatosCuenta(this.cuentaId);
      } else {
        this.router.navigate(['/ventas/cuentasporcobrar/list']);
      }
    });
    
    this.subscripciones.push(routeSub);
  }
  
  /**
   * Carga las formas de pago disponibles desde el servicio.
   */
  private cargarFormasPago(): void {
    const formasPagoSub = this.cuentasPorCobrarService.obtenerFormasPago().subscribe({
      next: (respuesta: any) => {
        if (respuesta && Array.isArray(respuesta)) {
          this.formasPago = respuesta.map(item => new FormaPago(item));
          
          // Seleccionar la primera forma de pago por defecto si existe
          if (this.formasPago.length > 0) {
            this.pagoForm.patchValue({
              foPa_Id: this.formasPago[0].foPa_Id
            });
          }
        }
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar las formas de pago. Por favor intente nuevamente.';
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
    
    this.subscripciones.push(formasPagoSub);
  }

  /**
   * Destruye el componente y cancela las suscripciones activas.
   */
  ngOnDestroy(): void {
    this.subscripciones.forEach(sub => sub.unsubscribe());
  }

  /**
   * Carga los datos de la cuenta por cobrar seleccionada.
   * @param id Identificador de la cuenta por cobrar
   */
  private cargarDatosCuenta(id: number): void {
    this.cargando = true;
    this.mostrarAlertaError = false;
    
    const detalleSub = this.cuentasPorCobrarService.obtenerCuentaPorCobrarPorId(id).subscribe({
      next: (respuesta: any) => {
        if (respuesta.success && respuesta.data) {
          // Mapear los campos del API a nuestro modelo
          this.cuentaPorCobrar = new CuentaPorCobrar({
            cpCo_Id: respuesta.data.cpCo_Id,
            clie_Id: respuesta.data.clie_Id,
            fact_Id: respuesta.data.fact_Id,
            cpCo_FechaEmision: new Date(respuesta.data.cpCo_FechaEmision),
            cpCo_FechaVencimiento: new Date(respuesta.data.cpCo_FechaVencimiento),
            cpCo_Valor: respuesta.data.cpCo_Valor,
            cpCo_Saldo: respuesta.data.cpCo_Saldo,
            cpCo_Observaciones: respuesta.data.cpCo_Observaciones || '',
            cpCo_Anulado: respuesta.data.cpCo_Anulado,
            cpCo_Saldada: respuesta.data.cpCo_Saldada,
            cpCo_Estado: true,
            clie_Nombres: respuesta.data.clie_Nombres || '',
            clie_NombreNegocio: respuesta.data.clie_NombreNegocio || ''
          });
          
          this.pagoForm.patchValue({
            cpCo_Id: this.cuentaPorCobrar.cpCo_Id || 0
          });
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = 'No se encontró la cuenta por cobrar especificada.';
        }
        this.cargando = false;
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los datos de la cuenta por cobrar.';
        this.cargando = false;
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
    
    this.subscripciones.push(detalleSub);
  }

  /**
   * Envía el formulario para registrar el pago.
   * Realiza validaciones y llama al servicio para guardar el pago.
   */
  onSubmit(): void {
    if (this.pagoForm.invalid) {
      this.pagoForm.markAllAsTouched();
      return;
    }

    // Validar que el monto no exceda el saldo pendiente
    if (!this.cuentaPorCobrar) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error: No se ha cargado correctamente la información de la cuenta.';
      return;
    }

    const saldoPendiente = this.cuentaPorCobrar?.cpCo_Saldo || 0;
    if (this.pagoForm.value.pago_Monto > saldoPendiente) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'El monto del pago no puede exceder el saldo pendiente.';
      return;
    }

    this.enviando = true;
    this.mostrarAlertaError = false;
    this.mostrarAlertaExito = false;

    // Obtener la forma de pago seleccionada
    const formaPagoSeleccionada = this.formasPago.find(f => f.foPa_Id === this.pagoForm.value.foPa_Id);
    
    // Crear el objeto de pago
    const nuevoPago: PagoCuentaPorCobrar = new PagoCuentaPorCobrar({
      cpCo_Id: this.pagoForm.value.cpCo_Id,
      pago_Monto: this.pagoForm.value.pago_Monto,
      foPa_Id: this.pagoForm.value.foPa_Id,
      foPa_Descripcion: formaPagoSeleccionada?.foPa_Descripcion,
      pago_NumeroReferencia: this.pagoForm.value.pago_NumeroReferencia,
      pago_Observaciones: this.pagoForm.value.pago_Observaciones,
      pago_Fecha: new Date(),
      usua_Creacion: 1, // Esto vendría del servicio de autenticación
    });

    const submitSub = this.cuentasPorCobrarService.registrarPago(nuevoPago).subscribe({
      next: (respuesta) => {
        if (respuesta.success) {
          this.mostrarAlertaExito = true;
          this.mensajeExito = 'Pago registrado correctamente.';
          
          // Redireccionar después de un tiempo
          setTimeout(() => {
            this.router.navigate(['/ventas/cuentasporcobrar/list']);
          }, 2000);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = respuesta.message || 'Error al registrar el pago.';
        }
        this.enviando = false;
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al registrar el pago. Por favor intente nuevamente.';
        this.enviando = false;
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
    
    this.subscripciones.push(submitSub);
  }

  /**
   * Cancela el registro de pago y navega a la lista de cuentas por cobrar.
   */
  cancelar(): void {
    this.router.navigate(['/ventas/cuentasporcobrar/list']);
  }

cerrarAlertaExito(): void {
    this.mostrarAlertaError = false;
}    
  /**
   * Cierra todas las alertas activas (éxito y error).
   */
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Formatea una fecha en formato local.
   * @param fecha Fecha a formatear
   */
  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-HN');
  }

  /**
   * Formatea un valor monetario en formato local.
   * @param valor Valor a formatear
   */
  formatearMoneda(valor: number | null): string {
    if (valor === null || valor === undefined) return 'L 0.00';
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(valor);
  }

}

