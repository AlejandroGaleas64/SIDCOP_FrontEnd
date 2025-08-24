import { Component, Output, EventEmitter, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Factura, VentaDetalle, DetalleItem, FacturaCompleta } from 'src/app/Modelos/ventas/Facturas.model';
import { Respuesta } from 'src/app/Modelos/apiresponse.model';
import {MapaSelectorComponent} from 'src/app/pages/logistica/rutas/mapa-selector/mapa-selector.component';
import { InvoiceService } from '../referencias/invoice.service';
import { ZplPrintingService } from 'src/app/core/services/zplprinting.service'; // Importar el nuevo servicio
import { UsbZplPrintingService } from 'src/app/core/services/zplusbprinting.service'; // Importar servicio USB
import { ZebraBrowserPrintService, BrowserPrintDevice, BrowserPrintStatus } from 'src/app/core/services/browserprint.service';
import { FormsModule } from '@angular/forms';

interface ApiResponse<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
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
  private zplPrintingService = inject(ZplPrintingService); // Inyectar el servicio ZPL
  private usbPrintingService = inject(UsbZplPrintingService); // Inyectar servicio USB

  facturaDetalle: FacturaCompleta | null = null;
  detallesFactura: DetalleItem[] = []; // Array para los detalles
  cargando = false;
  cargandoDetalles = false;
  
  // Variables para la impresión ZPL
  imprimiendo = false;
  mostrarConfiguracionImpresion = false;
  configuracionImpresion = {
    printerIp: '',
    printerPort: 9101,
    metodoImpresion: 'usb' // Cambiar default a USB
  };

  // Propiedades para Browser Print
  private zebraBrowserPrintService = inject(ZebraBrowserPrintService);
  
  browserPrintStatus: BrowserPrintStatus = {
    isConnected: false,
    devices: []
  };
  
  verificandoConexion = false;
  dispositivosDisponibles: BrowserPrintDevice[] = [];
  dispositivoSeleccionado: BrowserPrintDevice | null = null;

  // Variables para USB
  impresoraUSB: any = null;
  conectandoUSB = false;

  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaExito = false;
  mensajeExito = '';

  private readonly apiUrl = `${environment.apiBaseUrl}/Facturas`;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['facturaId'] && changes['facturaId'].currentValue) {
      this.cargarDetalles(changes['facturaId'].currentValue);
    } 
    // else if (changes['facturaData'] && changes['facturaData'].currentValue) {
    //   this.cargarDetallesSimulado(changes['facturaData'].currentValue);
    // }
  }

  // Carga real desde el endpoint del encabezado
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
          console.log('Respuesta completa del API:', response);
          
          if (response && response.success && response.data) {
            console.log('Datos de la factura:', response.data);
            this.detallesFactura = response.data.detalleFactura;
            this.facturaDetalle = response.data;
            
            // Pasar la factura completa al invoice service
            this.invoiceService.setFacturaCompleta(this.facturaDetalle);
            
            this.puntosVista.push({
              lat: this.facturaDetalle.fact_Latitud ?? 0,
              lng: this.facturaDetalle.fact_Longitud ?? 0,
              nombre: '',
              cliente: '',
                nombrenegocio: ''
              
            });
            console.log("puntos", this.puntosVista);
          } else {
            console.error('Estructura de respuesta inesperada:', response);
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

    

    EnviarFactura(): void{
      try
      {
      this.invoiceService.generarFacturaPDF();
      }
      catch(error)
      {
        console.log("error", error)
      }
    }

    // ========== MÉTODOS PARA IMPRESIÓN ZPL ==========
    
    /**
     * Abre el modal de configuración de impresión
     */
    abrirConfiguracionImpresion(): void {
      this.mostrarConfiguracionImpresion = true;
    }

    /**
     * Cierra el modal de configuración de impresión
     */
    cerrarConfiguracionImpresion(): void {
      this.mostrarConfiguracionImpresion = false;
    }

    /**
     * Imprime la factura usando ZPL con el método seleccionado
     */
    imprimirFacturaZPL(): void {
    if (!this.facturaDetalle) {
      this.mostrarMensajeError('No hay datos de factura para imprimir');
      return;
    }

    this.imprimiendo = true;
    this.mostrarAlertaError = false;
    this.mostrarAlertaExito = false;

    try {
      const facturaData = this.prepararDatosParaZPL();
      
      switch (this.configuracionImpresion.metodoImpresion) {
        case 'browserprint': // Nuevo método
        case 'usb': // Cambiar USB para usar Browser Print también
          this.imprimirPorBrowserPrint(facturaData);
          break;
        case 'download':
          this.imprimirPorDescarga(facturaData);
          break;
        case 'browser':
          this.imprimirPorNavegador(facturaData);
          break;
        case 'socket':
          this.imprimirPorSocket(facturaData);
          break;
        case 'clipboard':
          this.copiarAlPortapapeles(facturaData);
          break;
        default:
          this.imprimirPorBrowserPrint(facturaData); // Default a Browser Print
      }
    } catch (error) {
      console.error('Error en impresión ZPL:', error);
      this.mostrarMensajeError('Error al generar la impresión ZPL');
      this.imprimiendo = false;
    }
  }

    /**
     * Prepara los datos de la factura para el formato ZPL
     */
    private prepararDatosParaZPL(): any {
      if (!this.facturaDetalle) return {};

      return {
        // Datos de la empresa (ajustar según tu modelo)
        coFa_NombreEmpresa: this.facturaDetalle.coFa_NombreEmpresa || 'SIDCOP',
        coFa_DireccionEmpresa: this.facturaDetalle.coFa_DireccionEmpresa || 'Col. Satelite Norte, Bloque 3',
        coFa_RTN: this.facturaDetalle.coFa_RTN || '08019987654321',
        coFa_Telefono1: this.facturaDetalle.coFa_Telefono1 || '2234-5678',
        coFa_Correo: this.facturaDetalle.coFa_Correo || 'info@sidcop.com',

        // Datos de la factura
        fact_Numero: this.facturaDetalle.fact_Numero,
        fact_TipoVenta: this.facturaDetalle.fact_TipoVenta,
        fact_FechaEmision: this.facturaDetalle.fact_FechaEmision,
        fact_TipoDeDocumento: this.facturaDetalle.fact_TipoDeDocumento || 'FACTURA',
        
        // Datos del CAI (ajustar según tu modelo)
        regC_Descripcion: this.facturaDetalle.regC_Descripcion || 'ABC123-XYZ456-789DEF',
        regC_FechaFinalEmision: this.facturaDetalle.regC_FechaFinalEmision || '31/12/2024',
        regC_RangoInicial: this.facturaDetalle.regC_RangoInicial || 'F001-00000001',
        regC_RangoFinal: this.facturaDetalle.regC_RangoFinal || 'F001-99999999',

        // Datos del cliente
        clie_Id: this.facturaDetalle.clie_Id,
        cliente: this.facturaDetalle.cliente,
        clie_RTN: this.facturaDetalle.clie_RTN,
        clie_Telefono: this.facturaDetalle.clie_Telefono,
        diCl_DireccionExacta: this.facturaDetalle.diCl_DireccionExacta,

        // Datos del vendedor y sucursal
        vendedor: this.facturaDetalle.vendedor,
        sucu_Descripcion: this.facturaDetalle.sucu_Descripcion,

        // Totales
        fact_Subtotal: this.facturaDetalle.fact_Subtotal,
        fact_TotalImpuesto15: this.facturaDetalle.fact_TotalImpuesto15,
        fact_TotalImpuesto18: this.facturaDetalle.fact_TotalImpuesto18,
        fact_TotalDescuento: this.facturaDetalle.fact_TotalDescuento,
        fact_Total: this.facturaDetalle.fact_Total,
        fact_ImporteExento: this.facturaDetalle.fact_ImporteExento,
        fact_ImporteExonerado: this.facturaDetalle.fact_ImporteExonerado,
        fact_ImporteGravado15: this.facturaDetalle.fact_ImporteGravado15,
        fact_ImporteGravado18: this.facturaDetalle.fact_ImporteGravado18,

        // Detalles de productos
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

    /**
     * Imprime por USB directo
     */
    private async imprimirPorUSB(facturaData: any): Promise<void> {
      try {
        const zplCode = this.zplPrintingService.generateInvoiceZPL(facturaData);
        
        // Verificar si Web Serial API está soportada
        if (!this.usbPrintingService.isWebSerialSupported()) {
          this.mostrarMensajeError('Su navegador no soporta impresión USB directa. Use Chrome 89+ o Edge 89+');
          this.imprimiendo = false;
          return;
        }

        // Imprimir usando el método rápido
        await this.usbPrintingService.quickPrintZPL(zplCode);
        this.mostrarMensajeExito('Documento enviado a la impresora USB');
        
      } catch (error: any) {
        console.error('Error en impresión USB:', error);
        
        if (error.message.includes('no se seleccionó')) {
          this.mostrarMensajeError('Debe seleccionar una impresora USB');
        } else if (error.message.includes('no está soportada')) {
          this.mostrarMensajeError('Su navegador no soporta impresión USB. Use Chrome 89+ o Edge 89+');
        } else {
          this.mostrarMensajeError('Error al imprimir por USB: ' + error.message);
        }
      } finally {
        this.imprimiendo = false;
        this.cerrarConfiguracionImpresion();
      }
    }

    /**
     * Selecciona manualmente una impresora USB
     */
    async seleccionarImpresoraUSB(): Promise<void> {
      if (!this.usbPrintingService.isWebSerialSupported()) {
        this.mostrarMensajeError('Su navegador no soporta Web Serial API. Use Chrome 89+ o Edge 89+');
        return;
      }

      this.conectandoUSB = true;
      
      try {
        this.impresoraUSB = await this.usbPrintingService.requestUSBPrinter();
        this.mostrarMensajeExito('Impresora USB seleccionada correctamente');
      } catch (error: any) {
        this.mostrarMensajeError('Error al seleccionar impresora: ' + error.message);
        this.impresoraUSB = null;
      } finally {
        this.conectandoUSB = false;
      }
    }

    /**
     * Prueba la impresora USB
     */
    async probarImpresoraUSB(): Promise<void> {
      if (!this.usbPrintingService.isWebSerialSupported()) {
        this.mostrarMensajeError('Su navegador no soporta Web Serial API');
        return;
      }

      this.conectandoUSB = true;
      
      try {
        const success = await this.usbPrintingService.testPrinter();
        if (success) {
          this.mostrarMensajeExito('Prueba de impresora exitosa');
        } else {
          this.mostrarMensajeError('Error en la prueba de impresora');
        }
      } catch (error: any) {
        this.mostrarMensajeError('Error al probar impresora: ' + error.message);
      } finally {
        this.conectandoUSB = false;
      }
    }

    /**
     * Obtiene el estado de la impresora USB
     */
    get estadoImpresoraUSB(): string {
      const info = this.usbPrintingService.getPrinterInfo();
      
      if (!info) {
        return 'No seleccionada';
      }
      
      if (info.connected) {
        return 'Conectada';
      }
      
      return 'Seleccionada (no conectada)';
    }

    /**
     * Verifica si Web Serial API está disponible
     */
    // Método para calcular el total de todos los impuestos sumando los impuestos de cada producto
    calcularTotalImpuestos(): number {
      if (!this.detallesFactura || this.detallesFactura.length === 0) return 0;
      
      return this.detallesFactura.reduce((total, detalle) => {
        return total + (detalle.faDe_Impuesto || 0);
      }, 0);
    }
  
    private imprimirPorDescarga(facturaData: any): void {
      const filename = `factura_${facturaData.fact_Numero || 'sin_numero'}.zpl`;
      this.zplPrintingService.printInvoice(facturaData, {});
      this.mostrarMensajeExito('Archivo ZPL descargado exitosamente');
      this.imprimiendo = false;
      this.cerrarConfiguracionImpresion();
    }

    /**
     * Imprime usando el navegador
     */
    private imprimirPorNavegador(facturaData: any): void {
      const zplCode = this.zplPrintingService.generateInvoiceZPL(facturaData);
      this.zplPrintingService.printViaBrowser(zplCode);
      this.mostrarMensajeExito('Impresión enviada al navegador');
      this.imprimiendo = false;
      this.cerrarConfiguracionImpresion();
    }

    /**
     * Imprime por socket directo
     */
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

    /**
     * Copia el código ZPL al portapapeles
     */
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

    // ========== MÉTODOS DE UTILIDAD ==========

    /**
     * Muestra mensaje de error
     */
    private mostrarMensajeError(mensaje: string): void {
      this.mensajeError = mensaje;
      this.mostrarAlertaError = true;
      this.mostrarAlertaExito = false;
    }

    /**
     * Muestra mensaje de éxito
     */
    private mostrarMensajeExito(mensaje: string): void {
      this.mensajeExito = mensaje;
      this.mostrarAlertaExito = true;
      this.mostrarAlertaError = false;
    }

    cerrar(): void {
      this.onClose.emit();
    }
  
    cerrarAlerta(): void {
      this.mostrarAlertaError = false;
      this.mensajeError = '';
    }

    cerrarAlertaExito(): void {
      this.mostrarAlertaExito = true;
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
      event.target.src = 'assets/images/no-image-placeholder.png'; // Imagen por defecto
    }

    getImageUrl(imageUrl: string | undefined): string {
      if (!imageUrl) return 'assets/images/no-image-placeholder.png';
      
      // Si ya es una URL completa, devolverla tal como está
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      
      // Si es una ruta relativa, construir la URL completa
      return `${environment.apiBaseUrl}/${imageUrl}`;
    }

    trackByDetalleId(index: number, detalle: DetalleItem): any {
      return detalle.faDe_Id || index;
    }

  ngOnDestroy(): void {
    // Limpiar conexión USB al destruir el componente
    this.usbPrintingService.cleanup().catch(error => {
      console.error('Error al limpiar conexión USB:', error);
    });
  }



  seleccionarMetodo(metodo: string): void {
    this.configuracionImpresion.metodoImpresion = metodo;
    console.log('Método seleccionado:', metodo);
  }

  onBackdropClick(event: Event): void {
  // Solo cerrar si el click fue directamente en el backdrop, no en el contenido
  if (event.target === event.currentTarget) {
    this.cerrarConfiguracionImpresion();
  }
}



async ngOnInit(): Promise<void> {
    await this.verificarEstadoBrowserPrint();
  }

  async verificarEstadoBrowserPrint(): Promise<void> {
    this.verificandoConexion = true;
    
    try {
      this.browserPrintStatus = await this.zebraBrowserPrintService.getFullStatus();
      this.dispositivosDisponibles = this.browserPrintStatus.devices;
      this.dispositivoSeleccionado = this.browserPrintStatus.selectedDevice || null;

      if (this.browserPrintStatus.isConnected && this.dispositivosDisponibles.length > 0) {
        this.mostrarMensajeExito(`Browser Print conectado. ${this.dispositivosDisponibles.length} impresora(s) encontrada(s)`);
      } else if (!this.browserPrintStatus.isConnected) {
        this.mostrarMensajeError('Browser Print no está ejecutándose. Inicie la aplicación Zebra Browser Print.');
      } else {
        this.mostrarMensajeError('Browser Print está ejecutándose pero no se encontraron impresoras.');
      }
    } catch (error) {
      console.error('Error al verificar Browser Print:', error);
      this.mostrarMensajeError('Error al conectar con Browser Print: ' + (error as Error).message);
    } finally {
      this.verificandoConexion = false;
    }
  }


  seleccionarDispositivo(device: BrowserPrintDevice): void {
    this.dispositivoSeleccionado = device;
    this.zebraBrowserPrintService.selectDevice(device);
    this.mostrarMensajeExito(`Impresora seleccionada: ${device.name}`);
  }

  async refrescarDispositivos(): Promise<void> {
    await this.verificarEstadoBrowserPrint();
  }

  private async imprimirPorBrowserPrint(facturaData: any): Promise<void> {
    try {
      // Verificar estado de Browser Print
      if (!this.browserPrintStatus.isConnected) {
        await this.verificarEstadoBrowserPrint();
        
        if (!this.browserPrintStatus.isConnected) {
          throw new Error('Browser Print no está disponible. Asegúrese de que esté ejecutándose.');
        }
      }

      // Verificar que hay dispositivos disponibles
      if (this.dispositivosDisponibles.length === 0) {
        throw new Error('No se encontraron impresoras. Verifique que su impresora esté conectada y encendida.');
      }

      // Seleccionar dispositivo si no hay uno seleccionado
      if (!this.dispositivoSeleccionado) {
        this.dispositivoSeleccionado = this.dispositivosDisponibles[0];
        this.zebraBrowserPrintService.selectDevice(this.dispositivoSeleccionado);
      }

      // Generar código ZPL
      const zplCode = this.zplPrintingService.generateInvoiceZPL(facturaData);
      
      // Imprimir
      await this.zebraBrowserPrintService.printZPL(zplCode);
      
      this.mostrarMensajeExito(`Documento enviado a: ${this.dispositivoSeleccionado.name}`);
      
    } catch (error: any) {
      console.error('Error en impresión Browser Print:', error);
      this.mostrarMensajeError('Error al imprimir: ' + error.message);
    } finally {
      this.imprimiendo = false;
      this.cerrarConfiguracionImpresion();
    }
  }

  async probarImpresoraBrowserPrint(): Promise<void> {
    if (!this.dispositivoSeleccionado) {
      this.mostrarMensajeError('Debe seleccionar una impresora primero');
      return;
    }

    this.conectandoUSB = true; // Reutilizar esta variable para el estado
    
    try {
      const success = await this.zebraBrowserPrintService.printTestPage(this.dispositivoSeleccionado.uid);
      if (success) {
        this.mostrarMensajeExito('Página de prueba enviada correctamente');
      }
    } catch (error: any) {
      this.mostrarMensajeError('Error al probar impresora: ' + error.message);
    } finally {
      this.conectandoUSB = false;
    }
  }

  async obtenerEstadoImpresora(): Promise<string> {
    if (!this.dispositivoSeleccionado) {
      return 'No seleccionada';
    }

    try {
      const estado = await this.zebraBrowserPrintService.getPrinterStatus(this.dispositivoSeleccionado.uid);
      return estado;
    } catch (error) {
      return 'Error al obtener estado';
    }
  }


  get informacionImpresora(): string {
    if (!this.dispositivoSeleccionado) {
      return 'No seleccionada';
    }
    
    return `${this.dispositivoSeleccionado.name} (${this.dispositivoSeleccionado.connection})`;
  }

  get browserPrintDisponible(): boolean {
    return this.browserPrintStatus.isConnected;
  }
  

  

}