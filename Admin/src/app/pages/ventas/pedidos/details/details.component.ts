import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { ConfiguracionFactura } from 'src/app/Modelos/ventas/ConfiguracionFactura.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class DetailsComponent implements OnChanges {
  @Input() PedidoData: Pedido | null = null;
  @Output() onClose = new EventEmitter<void>();

  PedidoDetalle: Pedido | null = null;
  productos: any[] = [];
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';
  referenciasLista = [];
  clientesLista = [];
  referenciasNombre: any[] = [];

  // Propiedades para facturación
  subtotal: number = 0;
  impuesto: number = 0;
  descuento: number = 0;
  total: number = 0;
  porcentajeImpuesto: number = 15; // 15% ISV por defecto
  porcentajeDescuento: number = 0;
  mostrarVistaFactura: boolean = false;
  configuracionFactura: ConfiguracionFactura | null = null;
  numeroFactura: string = '';
  fechaFactura: Date = new Date();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['PedidoData'] && changes['PedidoData'].currentValue) {
      this.cargarDetallesSimulado(changes['PedidoData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Pedido): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.PedidoDetalle = { ...data };
        this.productos = JSON.parse(this.PedidoDetalle.detallesJson ?? '[]');
        this.calcularTotales();
        this.generarNumeroFactura();
        this.cargarConfiguracionFactura();
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del pedido.';
        this.cargando = false;
      }
    }, 500);
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos para facturación
  calcularTotales(): void {
    this.subtotal = this.productos.reduce((sum, producto) => {
      return sum + (producto.precio * producto.cantidad);
    }, 0);

    this.descuento = (this.subtotal * this.porcentajeDescuento) / 100;
    const subtotalConDescuento = this.subtotal - this.descuento;
    this.impuesto = (subtotalConDescuento * this.porcentajeImpuesto) / 100;
    this.total = subtotalConDescuento + this.impuesto;
  }

  generarNumeroFactura(): void {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numeroFactura = `${año}${mes}${dia}${random}`;
  }

  cargarConfiguracionFactura(): void {
    // Simulación de carga de configuración de factura
    this.configuracionFactura = new ConfiguracionFactura({
      coFa_Id: 1,
      coFa_NombreEmpresa: 'SIDCOP S.A. de C.V.',
      coFa_DireccionEmpresa: 'Tegucigalpa, Honduras',
      coFa_RTN: '08019999999999',
      coFa_Correo: 'facturacion@sidcop.com',
      coFa_Telefono1: '+504 2234-5678',
      coFa_Telefono2: '+504 2234-5679',
      coFa_Logo: 'assets/images/logo-empresa.png'
    });
  }

  toggleVistaFactura(): void {
    this.mostrarVistaFactura = !this.mostrarVistaFactura;
  }

  generarFactura(): void {
    if (!this.PedidoDetalle || this.productos.length === 0) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'No se puede generar la factura. Faltan datos del pedido.';
      return;
    }

    // Aquí iría la lógica para generar la factura
    console.log('Generando factura...', {
      pedido: this.PedidoDetalle,
      productos: this.productos,
      totales: {
        subtotal: this.subtotal,
        descuento: this.descuento,
        impuesto: this.impuesto,
        total: this.total
      },
      numeroFactura: this.numeroFactura
    });

    this.mostrarVistaFactura = true;
  }

  imprimirFactura(): void {
    window.print();
  }

  descargarFacturaPDF(): void {
    // Aquí iría la lógica para generar y descargar PDF
    console.log('Descargando factura en PDF...');
  }

  enviarFacturaEmail(): void {
    // Aquí iría la lógica para enviar factura por email
    console.log('Enviando factura por email...');
  }

  actualizarDescuento(nuevoDescuento: number): void {
    this.porcentajeDescuento = nuevoDescuento;
    this.calcularTotales();
  }

  actualizarImpuesto(nuevoImpuesto: number): void {
    this.porcentajeImpuesto = nuevoImpuesto;
    this.calcularTotales();
  }
}
