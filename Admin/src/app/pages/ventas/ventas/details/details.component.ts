import { Component, Output, EventEmitter, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Factura, VentaDetalle, DetalleItem, FacturaCompleta } from 'src/app/Modelos/ventas/Facturas.model';
import { Respuesta } from 'src/app/Modelos/apiresponse.model';
import {MapaSelectorComponent} from 'src/app/pages/logistica/rutas/mapa-selector/mapa-selector.component';
import { InvoiceService } from '../referencias/invoice.service';
import { ZplPrintingService } from 'src/app/core/services/zplprinting.service';
import { FormsModule } from '@angular/forms';
import ZebraBrowserPrintWrapper from 'zebra-browser-print-wrapper';


interface ApiResponse<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

// Interfaces para la nueva librería
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

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [
      CommonModule,
      MapaSelectorComponent,
      FormsModule
  ],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges, OnDestroy {
  @Input() facturaId: number | null = null;
  @Input() facturaData: Factura | null = null;
  @Output() onClose = new EventEmitter<void>();
  
  puntosVista: { lat: number; lng: number; nombre?: string; cliente?: string; nombrenegocio?: string }[] = [];

  private http = inject(HttpClient);
  private invoiceService = inject(InvoiceService);
  private zplPrintingService = inject(ZplPrintingService);

  facturaDetalle: FacturaCompleta | null = null;
  detallesFactura: DetalleItem[] = [];
  cargando = false;
  cargandoDetalles = false;
  
  // Variables para la nueva librería Zebra Browser Print Wrapper
  private zebraBrowserPrint: any = null;
  imprimiendo = false;
  mostrarConfiguracionImpresion = false;
  configuracionImpresion = {
    printerIp: '',
    printerPort: 9101,
    metodoImpresion: 'zebra-wrapper' // Nuevo método por defecto
  };

  // Propiedades para Zebra Browser Print Wrapper
  verificandoConexion = false;
  dispositivosDisponibles: ZebraPrinter[] = [];
  dispositivoSeleccionado: ZebraPrinter | null = null;
  estadoImpresora: PrinterStatus = { isReadyToPrint: false, errors: '' };

  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaExito = false;
  mensajeExito = '';

  private readonly apiUrl = `${environment.apiBaseUrl}/Facturas`;

  async ngOnInit(): Promise<void> {
    await this.inicializarZebraBrowserPrint();
  }

  /**
   * Inicializa la librería Zebra Browser Print Wrapper
   */
  private async inicializarZebraBrowserPrint(): Promise<void> {
    try {
      // Verificar si la librería está disponible
      if (typeof ZebraBrowserPrintWrapper === 'undefined') {
        console.error('ZebraBrowserPrintWrapper no está disponible');
        this.mostrarMensajeError('La librería Zebra Browser Print Wrapper no está cargada');
        return;
      }

      // Crear nueva instancia
      this.zebraBrowserPrint = new ZebraBrowserPrintWrapper();
      
      // Cargar impresoras disponibles
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
      // Obtener impresoras disponibles
      const impresoras = await this.zebraBrowserPrint.getAvailablePrinters();
      
      if (impresoras && Array.isArray(impresoras)) {
        this.dispositivosDisponibles = impresoras.map((printer: any) => ({
          name: printer.name || 'Impresora sin nombre',
          uid: printer.uid || printer.name,
          connection: printer.connection || 'USB',
          deviceType: printer.deviceType || 'Zebra'
        }));

        // Intentar seleccionar la impresora por defecto
        if (this.dispositivosDisponibles.length > 0) {
          const defaultPrinter = await this.zebraBrowserPrint.getDefaultPrinter();
          
          if (defaultPrinter) {
            const printerDefault = this.dispositivosDisponibles.find(p => 
              p.name === defaultPrinter.name || p.uid === defaultPrinter.uid
            );
            
            if (printerDefault) {
              this.seleccionarDispositivo(printerDefault);
            } else {
              // Si no encuentra la por defecto, seleccionar la primera
              this.seleccionarDispositivo(this.dispositivosDisponibles[0]);
            }
          } else {
            // Seleccionar la primera si no hay por defecto
            this.seleccionarDispositivo(this.dispositivosDisponibles[0]);
          }
        }

        this.mostrarMensajeExito(`${this.dispositivosDisponibles.length} impresora(s) encontrada(s)`);
      } else {
        this.dispositivosDisponibles = [];
        this.mostrarMensajeError('No se encontraron impresoras Zebra');
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
      // Configurar la impresora en la librería
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
  async probarImpresoraBrowserPrint(): Promise<void> {
    if (!this.dispositivoSeleccionado) {
      this.mostrarMensajeError('Debe seleccionar una impresora primero');
      return;
    }

    this.verificandoConexion = true;
    
    try {
      // Verificar estado antes de imprimir
      await this.verificarEstadoImpresora();
      
      if (!this.estadoImpresora.isReadyToPrint) {
        this.mostrarMensajeError(`La impresora no está lista: ${this.estadoImpresora.errors}`);
        return;
      }

      // ZPL para página de prueba
      const zplPrueba = `^XA
^CFD,30
^FO50,50^FDPágina de Prueba^FS
^CFD,20
^FO50,100^FDImpresora: ${this.dispositivoSeleccionado.name}^FS
^FO50,130^FDFecha: ${new Date().toLocaleString()}^FS
^CFD,15
^FO50,170^FDSi puede ver esto, la impresora funciona correctamente^FS
^XZ`;

      // Imprimir página de prueba
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
   * Imprime la factura usando Zebra Browser Print Wrapper
   */
  private async imprimirConZebraWrapper(facturaData: any): Promise<void> {
    if (!this.zebraBrowserPrint) {
      throw new Error('Zebra Browser Print Wrapper no está inicializado');
    }

    if (!this.dispositivoSeleccionado) {
      throw new Error('Debe seleccionar una impresora');
    }

    try {
      // Verificar estado de la impresora
      await this.verificarEstadoImpresora();
      
      if (!this.estadoImpresora.isReadyToPrint) {
        throw new Error(`La impresora no está lista: ${this.estadoImpresora.errors}`);
      }

      // Generar código ZPL
      const zplCode = this.zplPrintingService.generateInvoiceZPL(facturaData);
      
      // Imprimir
      await this.zebraBrowserPrint.print(zplCode);
      
      this.mostrarMensajeExito(`Factura enviada a: ${this.dispositivoSeleccionado.name}`);
      
    } catch (error: any) {
      console.error('Error en impresión Zebra Wrapper:', error);
      throw error;
    }
  }

  // ... resto de métodos existentes (ngOnChanges, cargarDetalles, etc.) ...

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['facturaId'] && changes['facturaId'].currentValue) {
      this.cargarDetalles(changes['facturaId'].currentValue);
    }
  }

  cargarDetalles(id: number): void {
    this.puntosVista = [];
    this.cargando = true;
    this.mostrarAlertaError = false;

    this.http.get<ApiResponse<FacturaCompleta>>(`${this.apiUrl}/ObtenerCompleta/${id}`, {
      headers: { 
        'X-Api-Key': environment.apiKey,
        'accept': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.detallesFactura = response.data.detalleFactura;
          this.facturaDetalle = response.data;
          this.invoiceService.setFacturaCompleta(this.facturaDetalle);
          
          this.puntosVista.push({
            lat: this.facturaDetalle.fact_Latitud ?? 0,
            lng: this.facturaDetalle.fact_Longitud ?? 0,
            nombre: '',
            cliente: '',
            nombrenegocio: ''
          });
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response?.message || 'Error: estructura de respuesta inesperada del servidor.';
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del factura:', error);
        if (error.status === 401 || error.status === 403) {
          this.mensajeError = 'No tiene permisos para ver este factura o su sesión ha expirado.';
        } else {
          this.mensajeError = 'Error al cargar los detalles del factura.';
        }
        this.mostrarAlertaError = true;
        this.cargando = false;
      }
    });
  }

  /**
   * Método principal de impresión que decide qué método usar
   */
  async imprimirFacturaDirecta(): Promise<void> {
      if (!this.facturaDetalle) {
        this.mostrarMensajeError('No hay datos de factura para imprimir');
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
          
          // Preparar datos de factura
          const facturaData = this.prepararDatosParaZPL();
          
          // Generar código ZPL de la factura
          const zplCode = this.zplPrintingService.generateInvoiceZPL(facturaData);

          // Imprimir la factura (igual que printBarcode)
          await browserPrint.print(zplCode);
          
          this.mostrarMensajeExito(`Factura ${facturaData.fact_Numero || 'N/A'} enviada a impresión correctamente`);
          
        } else {
          console.log("Error/s", printerStatus.errors);
          this.mostrarMensajeError(`Error en la impresora: ${printerStatus.errors}`);
        }

      } catch (error: any) {
        console.error('Error al imprimir factura:', error);
        this.mostrarMensajeError('Error al imprimir factura: ' + error.message);
      } finally {
        this.imprimiendo = false;
      }
    }

  // Métodos de utilidad y otros métodos existentes...
  /**
   * Transforma el código de tipo de venta a su descripción completa
   */
  private transformarTipoVenta(tipo: string | undefined): string {
    if (!tipo) return 'EFECTIVO';
    
    switch (tipo.toUpperCase()) {
      case 'CO':
        return 'CONTADO';
      case 'CR':
        return 'CREDITO';
      default:
        return tipo;
    }
  }

  private prepararDatosParaZPL(): any {
    if (!this.facturaDetalle) return {};

    return {
      coFa_NombreEmpresa: this.facturaDetalle.coFa_NombreEmpresa || 'SIDCOP',
      coFa_DireccionEmpresa: this.facturaDetalle.coFa_DireccionEmpresa || 'Col. Satelite Norte, Bloque 3',
      coFa_RTN: this.facturaDetalle.coFa_RTN || '08019987654321',
      coFa_Telefono1: this.facturaDetalle.coFa_Telefono1 || '2234-5678',
      coFa_Correo: this.facturaDetalle.coFa_Correo || 'info@sidcop.com',
      fact_Numero: this.facturaDetalle.fact_Numero,
      fact_TipoVenta: this.transformarTipoVenta(this.facturaDetalle.fact_TipoVenta),
      fact_FechaEmision: this.facturaDetalle.fact_FechaEmision,
      fact_TipoDeDocumento: this.facturaDetalle.fact_TipoDeDocumento || 'FACTURA',
      regC_Descripcion: this.facturaDetalle.regC_Descripcion || 'ABC123-XYZ456-789DEF',
      regC_FechaFinalEmision: this.facturaDetalle.regC_FechaFinalEmision || '31/12/2024',
      regC_RangoInicial: this.facturaDetalle.regC_RangoInicial || 'F001-00000001',
      regC_RangoFinal: this.facturaDetalle.regC_RangoFinal || 'F001-99999999',
      clie_Id: this.facturaDetalle.clie_Id,
      cliente: this.facturaDetalle.cliente,
      clie_RTN: this.facturaDetalle.clie_RTN,
      clie_Telefono: this.facturaDetalle.clie_Telefono,
      diCl_DireccionExacta: this.facturaDetalle.diCl_DireccionExacta,
      vendedor: this.facturaDetalle.vendedor,
      sucu_Descripcion: this.facturaDetalle.sucu_Descripcion,
      fact_Subtotal: this.facturaDetalle.fact_Subtotal,
      fact_TotalImpuesto15: this.facturaDetalle.fact_TotalImpuesto15,
      fact_TotalImpuesto18: this.facturaDetalle.fact_TotalImpuesto18,
      fact_TotalDescuento: this.facturaDetalle.fact_TotalDescuento,
      fact_Total: this.facturaDetalle.fact_Total,
      fact_ImporteExento: this.facturaDetalle.fact_ImporteExento,
      fact_ImporteExonerado: this.facturaDetalle.fact_ImporteExonerado,
      fact_ImporteGravado15: this.facturaDetalle.fact_ImporteGravado15,
      fact_ImporteGravado18: this.facturaDetalle.fact_ImporteGravado18,
      detalleFactura: this.detallesFactura.map(detalle => ({
        prod_Descripcion: detalle.prod_Descripcion,
        prod_CodigoBarra: detalle.prod_CodigoBarra,
        faDe_Cantidad: detalle.faDe_Cantidad,
        faDe_PrecioUnitario: detalle.faDe_PrecioUnitario,
        faDe_Subtotal: detalle.faDe_Subtotal,
        faDe_Impuesto: detalle.faDe_Impuesto
      }))
    };
  }

  abrirConfiguracionImpresion(): void {
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

  // Métodos existentes para otros tipos de impresión...
  private imprimirPorDescarga(facturaData: any): void {
    this.zplPrintingService.printInvoice(facturaData, {});
    this.mostrarMensajeExito('Archivo ZPL descargado exitosamente');
    this.imprimiendo = false;
    this.cerrarConfiguracionImpresion();
  }

  private imprimirPorNavegador(facturaData: any): void {
    const zplCode = this.zplPrintingService.generateInvoiceZPL(facturaData);
    this.zplPrintingService.printViaBrowser(zplCode);
    this.mostrarMensajeExito('Impresión enviada al navegador');
    this.imprimiendo = false;
    this.cerrarConfiguracionImpresion();
  }

  private imprimirPorSocket(facturaData: any): void {
    if (!this.configuracionImpresion.printerIp) {
      this.mostrarMensajeError('Debe especificar la IP de la impresora');
      this.imprimiendo = false;
      return;
    }

    this.zplPrintingService.printInvoice(facturaData, {
      printerIp: this.configuracionImpresion.printerIp,
      printerPort: this.configuracionImpresion.printerPort
    });
    
    this.mostrarMensajeExito('Impresión enviada a la impresora');
    this.imprimiendo = false;
    this.cerrarConfiguracionImpresion();
  }

  private async copiarAlPortapapeles(facturaData: any): Promise<void> {
    const zplCode = this.zplPrintingService.generateInvoiceZPL(facturaData);
    const copiado = await this.zplPrintingService.copyZPLToClipboard(zplCode);
    
    if (copiado) {
      this.mostrarMensajeExito('Código ZPL copiado al portapapeles');
    } else {
      this.mostrarMensajeError('Error al copiar al portapapeles');
    }
    
    this.imprimiendo = false;
    this.cerrarConfiguracionImpresion();
  }

  // Otros métodos existentes...
  EnviarFactura(): void {
    try {
      this.invoiceService.generarFacturaPDF();
    } catch(error) {
      console.log("error", error);
    }
  }

  calcularTotalImpuestos(): number {
    if (!this.detallesFactura || this.detallesFactura.length === 0) return 0;
    
    return this.detallesFactura.reduce((total, detalle) => {
      return total + (detalle.faDe_Impuesto || 0);
    }, 0);
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  cerrarAlertaExito(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
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

  onImageError(event: any): void {
    event.target.src = 'assets/images/no-image-placeholder.png';
  }

  getImageUrl(imageUrl: string | undefined): string {
    if (!imageUrl) return 'assets/images/no-image-placeholder.png';
    
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    return `${environment.apiBaseUrl}/${imageUrl}`;
  }

  trackByDetalleId(index: number, detalle: DetalleItem): any {
    return detalle.faDe_Id || index;
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

  ngOnDestroy(): void {
    // Limpiar recursos si es necesario
    this.zebraBrowserPrint = null;
  }


  printBarcode = async (serial: any) => {
    try {

        // Create a new instance of the object
        const browserPrint =  new ZebraBrowserPrintWrapper();

        // Select default printer
        const defaultPrinter =  await browserPrint.getDefaultPrinter();
    
        // Set the printer
        browserPrint.setPrinter(defaultPrinter);

        // Check printer status
        const printerStatus = await browserPrint.checkPrinterStatus();

        // Check if the printer is ready
        if(printerStatus.isReadyToPrint) {

            // ZPL script to print a simple barcode
            const zpl = `^XA
                        ^BY2,2,100
                        ^FO20,20^BC^FD${serial}^FS
                        ^XZ`;

            browserPrint.print(zpl);
        } else {
        console.log("Error/s", printerStatus.errors);
        }

    } catch (error: any) {
        throw new Error(error);
    }
};
}