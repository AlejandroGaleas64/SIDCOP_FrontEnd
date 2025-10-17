// ===== IMPORTACIONES DE ANGULAR CORE =====
import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';

// ===== IMPORTACIONES DE MÓDULOS ANGULAR =====
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ===== IMPORTACIONES DE MODELOS Y SERVICIOS =====
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { environment } from 'src/environments/environment.prod';
import { PedidoInvoiceService } from '../services/pedido-invoice.service';
import { ZplPrintingService } from 'src/app/core/services/zplprinting.service';

// ===== IMPORTACIONES DE BIBLIOTECAS EXTERNAS =====
import { jsPDF } from 'jspdf';
import ZebraBrowserPrintWrapper from 'zebra-browser-print-wrapper';
import { Observable, throwError } from 'rxjs';

// ===== INTERFACES PARA IMPRESIÓN ZEBRA =====
interface ZebraPrinter {
  name: string;
  uid: string;
  connection: string;
  deviceType?: string;
}

interface PrinterStatus {
  isReadyToPrint: boolean;
  errors: string;
}

/**
 * Componente para visualizar detalles completos de un pedido
 * Incluye funcionalidades de impresión PDF y etiquetas ZPL para impresoras Zebra
 */
@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class DetailsComponent implements OnChanges, OnDestroy {
  // ===== COMUNICACIÓN CON COMPONENTE PADRE =====
  @Input() PedidoData: Pedido | null = null;
  @Output() onClose = new EventEmitter<void>();

  // ===== INYECCIÓN DE SERVICIOS =====
  private pedidoInvoiceService = inject(PedidoInvoiceService);
  private zplPrintingService = inject(ZplPrintingService);

  // ===== DATOS DEL PEDIDO Y PRODUCTOS =====
  PedidoDetalle: Pedido | null = null;
  productos: any[] = [];
  cargando = false;

  // ===== CONFIGURACIÓN DE IMPRESIÓN ZPL =====
  private zebraBrowserPrint: any = null;
  imprimiendo = false;
  procesandoVenta = false;
  mostrarConfiguracionImpresion = false;
  configuracionImpresion = {
    printerIp: '',
    printerPort: 9101,
    metodoImpresion: 'zebra-wrapper'
  };
  
  // ===== GESTIÓN DE FORMATOS DE FACTURA =====
  mostrarModalFormatoFactura = false;
  formatoSeleccionado: 'pdf' | 'zpl' | null = null;
  facturaInsertada = false;

  // ===== ESTADO DE IMPRESORAS ZEBRA =====
  verificandoConexion = false;
  dispositivosDisponibles: ZebraPrinter[] = [];
  dispositivoSeleccionado: ZebraPrinter | null = null;
  estadoImpresora: PrinterStatus = { isReadyToPrint: false, errors: '' };

  // ===== SISTEMA DE ALERTAS =====
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaExito = false;
  mensajeExito = '';
  
  // ===== DATOS AUXILIARES PARA FORMULARIOS =====
  referenciasLista = [];
  clientesLista = [];
  referenciasNombre: any[] = [];

  // ===== CICLO DE VIDA DEL COMPONENTE =====

  /**
   * Inicialización del componente
   * Configura servicios de impresión Zebra al cargar
   */
  async ngOnInit(): Promise<void> {
    await this.inicializarZebraBrowserPrint();
  }

  /**
   * Detecta cambios en los datos del pedido
   * Recarga detalles cuando se recibe nueva información
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['PedidoData'] && changes['PedidoData'].currentValue) {
      this.cargarDetallesSimulado(changes['PedidoData'].currentValue);
    }
  }

  /**
   * Limpieza de recursos al destruir el componente
   * Libera conexiones de impresión para evitar memory leaks
   */
  ngOnDestroy(): void {
    this.zebraBrowserPrint = null;
  }

  // ===== CARGA DE DATOS DEL PEDIDO =====

  /**
   * Carga los detalles del pedido de forma simulada
   * Parsea JSON de productos y maneja errores de formato
   */
  cargarDetallesSimulado(data: Pedido): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.PedidoDetalle = { ...data };
        this.productos = JSON.parse(this.PedidoDetalle.detallesJson ?? '[]');
        
        // Log para ver la estructura de los productos
        //console.log('Estructura de productos en el pedido:', this.productos);
        
        // Configurar el servicio de facturación con los datos del pedido
        this.pedidoInvoiceService.setPedidoCompleto(this.PedidoDetalle);
        
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del pedido.';
        this.cargando = false;
      }
    }, 500);
  }

  // ===== GESTIÓN DE INTERFAZ =====

  /**
   * Cierra el modal de detalles del pedido
   * Emite evento al componente padre para actualizar estado
   */
  cerrar(): void {
    this.onClose.emit();
  }

  /**
   * Cierra alertas de error
   * Limpia estado de errores para mostrar nueva información
   */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Cierra alertas de éxito
   * Limpia estado de mensajes exitosos
   */
  cerrarAlertaExito(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
  }

  // ===== CONFIGURACIÓN DE ESTILOS PDF =====
  
  /**
   * Paleta de colores para documentos PDF
   * Mantiene consistencia visual en toda la aplicación
   */
  private readonly COLORES = {
    dorado: '#D6B68A',
    azulOscuro: '#141a2f',
    blanco: '#FFFFFF',
    grisClaro: '#F8F9FA',
    grisTexto: '#666666'
  };
  
  /**
   * Carga el logo de la empresa para documentos PDF
   * Convierte imagen a base64 para embedding en PDF
   */
  private async cargarLogo(): Promise<string | null> {
    if (!this.configuracionEmpresa?.coFa_Logo) {
        //console.log('No hay logo configurado');
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
            //console.log('Logo procesado correctamente desde URL');
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
          //console.log('Intentando cargar logo desde:', logoUrl);
          
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
          //console.log('Configuración de empresa cargada:', this.configuracionEmpresa);
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
      
      // Insertar datos en el endpoint /Facturas/Insertar
      this.insertarFactura();
    });
  }
  
  /**
   * Inserta los datos del pedido como factura en el endpoint /Facturas/Insertar
   * @returns Observable con la respuesta del servidor
   */
  insertarFactura(): Observable<any> {
    if (!this.PedidoDetalle) {
      this.mostrarMensajeError('No hay datos de pedido para insertar como factura');
      return throwError(() => new Error('No hay datos de pedido para insertar como factura'));
    }
    
    // Insertar la factura en el sistema
    return this.pedidoInvoiceService.insertarFactura();
  }
  
  /**
   * Realiza el proceso completo de venta: insertar factura y mostrar modal de selección de formato
   */
  realizarVenta(): void {
    if (!this.PedidoDetalle) {
      this.mostrarMensajeError('No hay datos de pedido para realizar la venta');
      return;
    }
    
    this.procesandoVenta = true;
    
    // Paso 1: Insertar la factura
    this.insertarFactura().subscribe({
      next: (response: any) => {
        //console.log('Factura insertada correctamente:', response);
        const facturaId = response.id || response.fact_Id || 'N/A';

        
        // Marcar que la factura se ha insertado correctamente
        this.facturaInsertada = true;
        
        // Mostrar el modal para seleccionar el formato de factura
        this.abrirModalFormatoFactura();
        
        // Opcional: Actualizar el estado del pedido si es necesario
        // this.actualizarEstadoPedido(this.PedidoDetalle.pedi_Id);
      },
      error: (error: any) => {
        console.error('Error al insertar la factura:', error);
        let mensajeError = 'Error al insertar la factura: inventario insuficiente';
        
        // Intentar obtener más detalles del error
        if (error.error && error.error.message) {
          mensajeError += `: ${error.error.message}`;
        } else if (error.message) {
          mensajeError += `: ${error.message}`;
        }
        
        this.mostrarMensajeError(mensajeError);
      },
      complete: () => {
        this.procesandoVenta = false;
      }
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

  // ===== MÉTODOS DE IMPRESIÓN ZPL =====

  /**
   * Inicializa la librería Zebra Browser Print Wrapper
   */
  private async inicializarZebraBrowserPrint(): Promise<void> {
    try {
      if (typeof ZebraBrowserPrintWrapper === 'undefined') {
        console.error('ZebraBrowserPrintWrapper no está disponible');
        this.mostrarMensajeError('La librería Zebra Browser Print Wrapper no está cargada');
        return;
      }

      this.zebraBrowserPrint = new ZebraBrowserPrintWrapper();
      await this.cargarImpresorasDisponibles();
      
    } catch (error) {
      console.error('Error al inicializar Zebra Browser Print:', error);
      this.mostrarMensajeError('Error al inicializar la impresora Zebra');
    }
  }

  /**
   * Carga la lista de impresoras disponibles
   */
  private async cargarImpresorasDisponibles(): Promise<void> {
    if (!this.zebraBrowserPrint) return;

    this.verificandoConexion = true;
    
    try {
      const impresoras = await this.zebraBrowserPrint.getAvailablePrinters();
      
      if (impresoras && Array.isArray(impresoras)) {
        this.dispositivosDisponibles = impresoras.map((printer: any) => ({
          name: printer.name || 'Impresora sin nombre',
          uid: printer.uid || printer.name,
          connection: printer.connection || 'USB',
          deviceType: printer.deviceType || 'Zebra'
        }));

        if (this.dispositivosDisponibles.length > 0) {
          const defaultPrinter = await this.zebraBrowserPrint.getDefaultPrinter();
          
          if (defaultPrinter) {
            const printerDefault = this.dispositivosDisponibles.find(p => 
              p.name === defaultPrinter.name || p.uid === defaultPrinter.uid
            );
            
            if (printerDefault) {
              this.seleccionarDispositivo(printerDefault);
            } else {
              this.seleccionarDispositivo(this.dispositivosDisponibles[0]);
            }
          } else {
            this.seleccionarDispositivo(this.dispositivosDisponibles[0]);
          }
        }

      } else {
        this.dispositivosDisponibles = [];

      }
      
    } catch (error) {
      console.error('Error al cargar impresoras:', error);
      this.mostrarMensajeError('Error al buscar impresoras: ' + (error as Error).message);
      this.dispositivosDisponibles = [];
    } finally {
      this.verificandoConexion = false;
    }
  }

  /**
   * Selecciona un dispositivo de impresión
   */
  seleccionarDispositivo(device: ZebraPrinter): void {
    this.dispositivoSeleccionado = device;
    
    if (this.zebraBrowserPrint) {
      this.zebraBrowserPrint.setPrinter(device);
      this.verificarEstadoImpresora();
      this.mostrarMensajeExito(`Impresora seleccionada: ${device.name}`);
    }
  }

  /**
   * Verifica el estado de la impresora seleccionada
   */
  private async verificarEstadoImpresora(): Promise<void> {
    if (!this.zebraBrowserPrint || !this.dispositivoSeleccionado) {
      this.estadoImpresora = { isReadyToPrint: false, errors: 'No hay impresora seleccionada' };
      return;
    }

    try {
      this.estadoImpresora = await this.zebraBrowserPrint.checkPrinterStatus();
    } catch (error) {
      console.error('Error al verificar estado de impresora:', error);
      this.estadoImpresora = { 
        isReadyToPrint: false, 
        errors: 'Error al verificar estado: ' + (error as Error).message 
      };
    }
  }

  /**
   * Refresca la lista de dispositivos
   */
  async refrescarDispositivos(): Promise<void> {
    await this.cargarImpresorasDisponibles();
  }

  /**
   * Prueba la impresora con una página de prueba
   */
  async probarImpresora(): Promise<void> {
    if (!this.dispositivoSeleccionado) {
      this.mostrarMensajeError('Debe seleccionar una impresora primero');
      return;
    }

    this.verificandoConexion = true;
    
    try {
      await this.verificarEstadoImpresora();
      
      if (!this.estadoImpresora.isReadyToPrint) {
        this.mostrarMensajeError(`La impresora no está lista: ${this.estadoImpresora.errors}`);
        return;
      }

      const zplPrueba = `^XA
^CFD,30
^FO50,50^FDPágina de Prueba^FS
^CFD,20
^FO50,100^FDImpresora: ${this.dispositivoSeleccionado.name}^FS
^FO50,130^FDFecha: ${new Date().toLocaleString()}^FS
^CFD,15
^FO50,170^FDSi puede ver esto, la impresora funciona correctamente^FS
^XZ`;

      await this.zebraBrowserPrint.print(zplPrueba);
      this.mostrarMensajeExito('Página de prueba enviada correctamente');
      
    } catch (error: any) {
      console.error('Error al probar impresora:', error);
      this.mostrarMensajeError('Error al probar impresora: ' + error.message);
    } finally {
      this.verificandoConexion = false;
    }
  }

  /**
   * Genera y muestra la vista previa del pedido en PDF
   */
  async generarVistaPrevia(): Promise<void> {
    if (!this.PedidoDetalle) {
      this.mostrarMensajeError('No hay datos de pedido para mostrar');
      return;
    }

    try {
      const result = await this.pedidoInvoiceService.generarPedidoPDF();
      if (result.success) {
        this.mostrarMensajeExito(result.message);
      } else {
        this.mostrarMensajeError(result.message);
      }
    } catch (error) {
      console.error('Error al generar vista previa:', error);
      this.mostrarMensajeError('Error al generar la vista previa del pedido');
    }
  }

  /**
   * Método principal de impresión ZPL - COPIADO EXACTO DE VENTAS/DETAILS
   */
  async imprimirPedidoZPL(): Promise<void> {
      if (!this.PedidoDetalle) {
        this.mostrarMensajeError('No hay datos de pedido para imprimir');
        return;
      }

      this.imprimiendo = true;
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;

      try {
        // Create a new instance of the object (igual que printBarcode)
        const browserPrint = new ZebraBrowserPrintWrapper();

        // Select default printer (igual que printBarcode)
        const defaultPrinter = await browserPrint.getDefaultPrinter();
      
        // Set the printer (igual que printBarcode)
        browserPrint.setPrinter(defaultPrinter);

        // Check printer status (igual que printBarcode)
        const printerStatus = await browserPrint.checkPrinterStatus();

        // Check if the printer is ready (igual que printBarcode)
        if(printerStatus.isReadyToPrint) {
          
          // Preparar datos de pedido
          const pedidoData = this.pedidoInvoiceService.prepararDatosParaZPL();
          
          // Generar código ZPL del pedido
          const zplCode = this.zplPrintingService.generateInvoiceZPL(pedidoData);

          // Imprimir el pedido (igual que printBarcode)
          await browserPrint.print(zplCode);
          
          this.mostrarMensajeExito(`Pedido ${this.PedidoDetalle.pedi_Id} enviado a impresión correctamente`);
          this.cerrarConfiguracionImpresion();
          
        } else {
          //console.log("Error/s", printerStatus.errors);
          this.mostrarMensajeError(`Error en la impresora: ${printerStatus.errors}`);
        }

      } catch (error: any) {
        console.error('Error al imprimir pedido:', error);
        this.mostrarMensajeError('Error al imprimir pedido: ' + error.message);
      } finally {
        this.imprimiendo = false;
      }
    }

  // ===== MÉTODOS DE CONFIGURACIÓN =====

  async abrirConfiguracionImpresion(): Promise<void> {
    // Asegurar que Zebra Browser Print esté inicializado
    if (!this.zebraBrowserPrint) {
      await this.inicializarZebraBrowserPrint();
    }
    
    // Refrescar dispositivos disponibles
    await this.refrescarDispositivos();
    
    this.mostrarConfiguracionImpresion = true;
  }

  cerrarConfiguracionImpresion(): void {
    this.mostrarConfiguracionImpresion = false;
  }

  seleccionarMetodo(metodo: string): void {
    this.configuracionImpresion.metodoImpresion = metodo;
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cerrarConfiguracionImpresion();
    }
  }
  
  // Métodos para el modal de selección de formato de factura
  abrirModalFormatoFactura(): void {
    this.formatoSeleccionado = null;
    this.mostrarModalFormatoFactura = true;
  }
  
  cerrarModalFormatoFactura(): void {
    this.mostrarModalFormatoFactura = false;
  }
  
  seleccionarFormato(formato: 'pdf' | 'zpl'): void {
    this.formatoSeleccionado = formato;
  }
  
  onBackdropClickFormato(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cerrarModalFormatoFactura();
    }
  }
  
  // Este método ya no es necesario para la acción de los botones,
  // pero lo mantenemos por si se necesita en el futuro
  confirmarFormatoFactura(): void {
    if (!this.formatoSeleccionado) {
      this.mostrarMensajeError('Debe seleccionar un formato de factura');
      return;
    }
  }

  private mostrarMensajeError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mostrarAlertaError = true;
    this.mostrarAlertaExito = false;
  }

  private mostrarMensajeExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mostrarAlertaExito = true;
    this.mostrarAlertaError = false;
  }

  // Getters para el template
  get browserPrintDisponible(): boolean {
    return this.dispositivosDisponibles.length > 0;
  }

  get informacionImpresora(): string {
    if (!this.dispositivoSeleccionado) {
      return 'No seleccionada';
    }
    
    return `${this.dispositivoSeleccionado.name} (${this.dispositivoSeleccionado.connection})`;
  }

  get estadoImpresoraTexto(): string {
    if (!this.dispositivoSeleccionado) {
      return 'No seleccionada';
    }
    
    if (this.estadoImpresora.isReadyToPrint) {
      return 'Lista para imprimir';
    }
    
    return `Error: ${this.estadoImpresora.errors}`;
  }
}
