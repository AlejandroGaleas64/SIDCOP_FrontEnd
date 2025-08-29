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
import { environment } from 'src/environments/environment.prod';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { jsPDF } from 'jspdf';

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

    // ===== MÉTODOS PRIVADOS PARA PDF (basados en PdfReportService) =====
  
    private readonly COLORES = {
    dorado: '#D6B68A',
    azulOscuro: '#141a2f',
    blanco: '#FFFFFF',
    grisClaro: '#F8F9FA',
    grisTexto: '#666666'
  };
  
    private async cargarLogo(): Promise<string | null> {
      if (!this.configuracionEmpresa?.coFa_Logo) {
        console.log('No hay logo configurado');
        return null;
      }
  
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              console.error('No se pudo obtener el contexto del canvas');
              resolve(null);
              return;
            }
            
            const maxWidth = 120;
            const maxHeight = 60;
            let { width, height } = img;
            
            if (width > height) {
              if (width > maxWidth) {
                height = height * (maxWidth / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = width * (maxHeight / height);
                height = maxHeight;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/png', 0.8);
            console.log('Logo procesado correctamente desde URL');
            resolve(dataUrl);
          } catch (e) {
            console.error('Error al procesar el logo:', e);
            resolve(null);
          }
        };
        
        img.onerror = (error) => {
          console.error('Error al cargar el logo desde URL:', error);
          resolve(null);
        };
        
        try {
          const logoUrl = this.configuracionEmpresa.coFa_Logo;
          console.log('Intentando cargar logo desde:', logoUrl);
          
          if (logoUrl.startsWith('http')) {
            img.src = logoUrl;
          } else if (logoUrl.startsWith('data:')) {
            img.src = logoUrl;
          } else {
            img.src = `data:image/png;base64,${logoUrl}`;
          }
        } catch (e) {
          console.error('Error al configurar src del logo:', e);
          resolve(null);
        }
      });
    }
  

  

  
  constructor(private http: HttpClient) {
    this.cargarConfiguracionEmpresa();
  }


  private configuracionEmpresa: any = null;

   private cargarConfiguracionEmpresa() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/ConfiguracionFactura/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.configuracionEmpresa = data[0];
          console.log('Configuración de empresa cargada:', this.configuracionEmpresa);
        }
      },
      error: (error) => {
        console.error('Error al cargar configuración de empresa:', error);
      }
    });
  }

imprimirPedido(): void {
  const doc = new jsPDF();

  this.crearEncabezado(doc).then(() => {
    const pageWidth = doc.internal.pageSize.width;
    let y = 40;

    doc.setFontSize(10); // Fuente reducida

    // ==============================
    // ENCABEZADO DEL PEDIDO
    // ==============================
    doc.setFont('helvetica', 'bold');
    doc.text(`No. Pedido:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.PedidoDetalle?.pedi_Id}`, 37, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha Emisión:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.formatearFecha(this.PedidoDetalle?.pedi_FechaPedido ?? null)}`, 42, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha Entrega:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.formatearFecha(this.PedidoDetalle?.pedi_FechaEntrega ?? null)}`, 42, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text(`Tipo Documento:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pedido`, 44, y);
    y += 4;

    doc.line(14, y, 196, y); // Línea horizontal
    y += 8;

    // ==============================
    // INFORMACIÓN DEL CLIENTE
    // ==============================
    doc.setFont('helvetica', 'bold');
    doc.text(`Cliente:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.PedidoDetalle?.clie_Nombres} ${this.PedidoDetalle?.clie_Apellidos}`, 30, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text(`Dirección:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.PedidoDetalle?.diCl_DireccionExacta || 'Dirección no especificada'}`, 32, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text(`Vendedor:`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${this.PedidoDetalle?.vend_Nombres || 'Vendedor no especificado'}`, 32, y);
    y += 6;

    doc.line(14, y, 196, y); // Línea horizontal
    y += 6;

    // ==============================
    // ENCABEZADO DE PRODUCTOS
    // ==============================
    doc.setFont('helvetica', 'bold');
    doc.text('Producto', 14, y);
    doc.text('Precio', 120, y);
    doc.text('Und', 145, y);
    doc.text('Monto', 170, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.line(14, y, 196, y); // Línea horizontal
    y += 5;

    // ==============================
    // LISTADO DE PRODUCTOS
    // ==============================
    let subtotal = 0;
    this.productos.forEach((p) => {
      const monto = p.precio * p.cantidad;
      subtotal += monto;

      doc.text(`${p.descripcion}`, 14, y);
      doc.text(`L. ${p.precio.toFixed(2)}`, 120, y);
      doc.text(`${p.cantidad}`, 145, y);
      doc.text(`L. ${monto.toFixed(2)}`, 170, y);
      y += 5;
    });

    doc.line(14, y, 196, y); // Línea horizontal
    y += 5;

    // ==============================
    // TOTALES
    // ==============================
    const impuestos = subtotal * 0.15;
    const total = subtotal + impuestos;

    doc.setFont('helvetica', 'bold');
    doc.text(`Sub-total:`, 140, y);
    doc.text(`L. ${subtotal.toFixed(2)}`, 170, y);
    y += 5;

    doc.text(`Impuestos (15%):`, 140, y);
    doc.text(`L. ${impuestos.toFixed(2)}`, 170, y);
    y += 5;

    doc.text(`Total:`, 140, y);
    doc.text(`L. ${total.toFixed(2)}`, 170, y);
    y += 5;

    // ==============================
    // PREVIEW EN NUEVA PESTAÑA
    // ==============================
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  });
}


get subtotal(): number {
  return this.productos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
}

get impuesto(): number {
  return this.subtotal * 0.15;
}

get total(): number {
  return this.subtotal + this.impuesto;
}



 private async crearEncabezado(doc: jsPDF): Promise<number> {
//  doc.setDrawColor(this.COLORES.dorado);
  doc.setLineWidth(0.5);
  //doc.line(14, 35, 196, 35);

  const logoDataUrl = await this.cargarLogo();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 20, 5, 30, 25);
  }

  const pageWidth = doc.internal.pageSize.width;

  doc.setTextColor(this.COLORES.azulOscuro);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  const nombreEmpresa = this.configuracionEmpresa?.coFa_NombreEmpresa || 'Empresa S.A.';
  const telefono = this.configuracionEmpresa?.coFa_Telefono1 || '9825-6556';
  const correo = this.configuracionEmpresa?.coFa_Correo || '@';
  const ubicacion = this.configuracionEmpresa?.colo_Descripcion + ', ' + this.configuracionEmpresa?.muni_Descripcion + ', ' + this.configuracionEmpresa?.depa_Descripcion|| 'Celular';
  doc.text(nombreEmpresa, pageWidth / 2, 15, { align: 'center' });


   doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text(ubicacion, pageWidth / 2, 20, { align: 'center' });
  doc.text('Telefono: ' + telefono, pageWidth / 2, 25, { align: 'center' });
  doc.text('Correo: ' + correo, pageWidth / 2, 30, { align: 'center' });


  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
 // doc.text(`Factura No. ${this.PedidoData?.pedi_Id}`, pageWidth / 2, 27, { align: 'center' });

  return 40;
}


private agregarDetallesPedido(doc: jsPDF, yPos: number): void {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const fechaPedido = this.PedidoDetalle?.pedi_FechaPedido;
  const fechaEntrega = this.PedidoDetalle?.pedi_FechaEntrega;

  doc.text(`Negocio: ${this.PedidoDetalle?.clie_NombreNegocio}`, 20, yPos);
  doc.text(`Fecha Pedido: ${fechaPedido}`, 130, yPos);

  yPos += 8;
  doc.text(`Vendedor: ${this.PedidoDetalle?.vend_Nombres} ${this.PedidoDetalle?.vend_Apellidos}`, 20, yPos);
  doc.text(`Fecha Entrega: ${fechaEntrega}`, 130, yPos);

  yPos += 10;
  doc.setDrawColor(this.COLORES.dorado);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, doc.internal.pageSize.width - 20, yPos);
}


private agregarProductos(doc: jsPDF, yPos: number): void {
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Productos', 20, yPos);
  yPos += 6;

  // Encabezados
  doc.setFillColor(220, 220, 220); // gris claro
  doc.setDrawColor(180, 180, 180);
  doc.rect(20, yPos, 170, 8, 'FD'); // fila de encabezado
  doc.text('Descripción', 22, yPos + 6);
  doc.text('Precio', 100, yPos + 6);
  doc.text('Cantidad', 130, yPos + 6);
  doc.text('Monto', 160, yPos + 6);
  yPos += 10;

  let subtotal = 0;

  doc.setFont('helvetica', 'normal');

  this.productos.forEach((producto) => {
    const monto = producto.precio * producto.cantidad;
    subtotal += monto;

    doc.rect(20, yPos, 170, 8); // fila producto
    doc.text(`${producto.descripcion}`, 22, yPos + 6);
    doc.text(`${producto.precio.toFixed(2)}`, 100, yPos + 6);
    doc.text(`${producto.cantidad}`, 130, yPos + 6);
    doc.text(`${monto.toFixed(2)}`, 160, yPos + 6);

    yPos += 9;
  });

  const impuesto = subtotal * 0.15;
  const total = subtotal + impuesto;

  // Línea final
  yPos += 2;
  doc.setDrawColor(this.COLORES.dorado);
  doc.line(20, yPos, doc.internal.pageSize.width - 20, yPos);
  yPos += 6;

  // Totales
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 130, yPos);
  doc.text(`${subtotal.toFixed(2)}`, 160, yPos);
  yPos += 6;

  doc.text('Impuesto (15%): ', 130, yPos);
  doc.text(`${impuesto.toFixed(2)}`, 160, yPos);
  yPos += 6;

  doc.text('Total:', 130, yPos);
  doc.text(`${total.toFixed(2)}`, 160, yPos);
}



  private crearPiePagina(doc: jsPDF, data: any): void {
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    const totalPages = doc.getNumberOfPages();

    doc.setFontSize(8);
    doc.setTextColor(this.COLORES.grisTexto);
  //  doc.text(`Generado por: Usuario | Fecha: ${fechaTexto} ${horaTexto}`, 20, doc.internal.pageSize.height - 12);
    doc.text(`Página ${data.pageNumber}/${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 12, { align: 'right' });
  }

  // ...




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
