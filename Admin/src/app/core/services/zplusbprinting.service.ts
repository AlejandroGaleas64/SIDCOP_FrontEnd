import { Injectable } from '@angular/core';

// Web Serial API interfaces
interface SerialPort {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): SerialPortInfo;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  flowControl?: 'none' | 'hardware';
}

interface SerialPortInfo {
  usbVendorId: number;
  usbProductId: number;
}

export interface USBPrinterInfo {
  port?: SerialPort;
  productName?: string;
  vendorId?: number;
  productId?: number;
  connected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsbZplPrintingService {

  private connectedPrinter: USBPrinterInfo | null = null;
  private readonly ZEBRA_VENDOR_IDS = [0x0A5F, 0x14B0]; // IDs comunes de Zebra

  constructor() {
    // Verificar soporte para Web Serial API
    if (!this.isWebSerialSupported()) {
      console.warn('Web Serial API no está soportada en este navegador');
    }
  }

  /**
   * Verifica si Web Serial API está soportada
   */
  isWebSerialSupported(): boolean {
    return 'serial' in navigator;
  }

  /**
   * Solicita acceso a un puerto serial/USB
   */
  async requestUSBPrinter(): Promise<USBPrinterInfo | null> {
    if (!this.isWebSerialSupported()) {
      throw new Error('Web Serial API no está soportada en este navegador. Use Chrome 89+ o Edge 89+');
    }

    try {
      // Filtros para impresoras Zebra comunes
      const filters = [
        { usbVendorId: 0x0A5F }, // Zebra Technologies
        { usbVendorId: 0x14B0 }, // Zebra (otro ID)
      ];

      const port = await (navigator as any).serial.requestPort({ filters });
      
      const info = port.getInfo();
      
      this.connectedPrinter = {
        port,
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
        connected: false
      };

      return this.connectedPrinter;

    } catch (error) {
      console.error('Error al seleccionar impresora USB:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          throw new Error('No se seleccionó ninguna impresora');
        } else if (error.name === 'SecurityError') {
          throw new Error('Acceso denegado al puerto USB');
        }
      }
      
      throw new Error('Error al acceder a la impresora USB');
    }
  }

  /**
   * Conecta con la impresora USB seleccionada
   */
  async connectToPrinter(): Promise<boolean> {
    if (!this.connectedPrinter?.port) {
      throw new Error('No hay impresora seleccionada. Use requestUSBPrinter() primero.');
    }

    try {
      await this.connectedPrinter.port.open({ 
        baudRate: 9600, // Baudrate común para impresoras
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });

      this.connectedPrinter.connected = true;
      console.log('Conectado exitosamente a la impresora USB');
      return true;

    } catch (error) {
      console.error('Error al conectar con la impresora:', error);
      this.connectedPrinter.connected = false;
      throw new Error('Error al conectar con la impresora USB');
    }
  }

  /**
   * Desconecta de la impresora USB
   */
  async disconnectFromPrinter(): Promise<void> {
    if (this.connectedPrinter?.port && this.connectedPrinter.connected) {
      try {
        await this.connectedPrinter.port.close();
        this.connectedPrinter.connected = false;
        console.log('Desconectado de la impresora USB');
      } catch (error) {
        console.error('Error al desconectar:', error);
      }
    }
  }

  /**
   * Envía código ZPL a la impresora USB
   */
  async printZPL(zplCode: string): Promise<boolean> {
    if (!this.connectedPrinter?.port) {
      throw new Error('No hay impresora seleccionada');
    }

    if (!this.connectedPrinter.connected) {
      await this.connectToPrinter();
    }

    try {
      const writer = this.connectedPrinter.port.writable?.getWriter();
      
      if (!writer) {
        throw new Error('No se puede escribir al puerto USB');
      }

      // Convertir el código ZPL a bytes
      const encoder = new TextEncoder();
      const data = encoder.encode(zplCode);

      // Enviar datos a la impresora
      await writer.write(data);
      await writer.close();

      console.log('Código ZPL enviado exitosamente');
      return true;

    } catch (error) {
      console.error('Error al enviar ZPL:', error);
      throw new Error('Error al imprimir: ' + (error as Error).message);
    }
  }

  /**
   * Lista puertos serie disponibles (Chrome 103+)
   */
  async getAvailablePorts(): Promise<SerialPort[]> {
    if (!this.isWebSerialSupported()) {
      return [];
    }

    try {
      const ports = await (navigator as any).serial.getPorts();
      return ports;
    } catch (error) {
      console.error('Error al obtener puertos:', error);
      return [];
    }
  }

  /**
   * Obtiene información de la impresora conectada
   */
  getPrinterInfo(): USBPrinterInfo | null {
    return this.connectedPrinter;
  }

  /**
   * Verifica si hay una impresora conectada
   */
  isConnected(): boolean {
    return this.connectedPrinter?.connected || false;
  }

  /**
   * Envía comando de prueba a la impresora
   */
  async testPrinter(): Promise<boolean> {
    const testZPL = `^XA
^FO50,50^A0N,50,50^FDPRUEBA DE IMPRESION^FS
^FO50,120^A0N,30,30^FD${new Date().toLocaleString()}^FS
^FO50,170^A0N,25,25^FDImpresora USB conectada correctamente^FS
^XZ`;

    try {
      await this.printZPL(testZPL);
      return true;
    } catch (error) {
      console.error('Error en prueba de impresora:', error);
      return false;
    }
  }

  /**
   * Método combinado para seleccionar, conectar e imprimir
   */
  async quickPrintZPL(zplCode: string): Promise<boolean> {
    try {
      // Si no hay impresora seleccionada, solicitar una
      if (!this.connectedPrinter) {
        await this.requestUSBPrinter();
      }

      // Conectar si no está conectada
      if (!this.isConnected()) {
        await this.connectToPrinter();
      }

      // Imprimir
      return await this.printZPL(zplCode);

    } catch (error) {
      console.error('Error en impresión rápida:', error);
      throw error;
    }
  }

  /**
   * Limpia la conexión (para usar en ngOnDestroy)
   */
  async cleanup(): Promise<void> {
    await this.disconnectFromPrinter();
    this.connectedPrinter = null;
  }
}