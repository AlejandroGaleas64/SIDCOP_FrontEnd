import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';

export interface BrowserPrintDevice {
  name: string;
  uid: string;
  connection: string;
  device_type: string;
  version?: string;
}

export interface BrowserPrintStatus {
  isConnected: boolean;
  devices: BrowserPrintDevice[];
  selectedDevice?: BrowserPrintDevice;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZebraBrowserPrintService {
  private readonly BROWSER_PRINT_URL = 'http://localhost:9101';
  private readonly DEFAULT_TIMEOUT = 10000; // 10 segundos
  private selectedDevice: BrowserPrintDevice | null = null;
  
  constructor(private http: HttpClient) {}

  /**
   * Verifica si Browser Print está ejecutándose
   */
  async checkBrowserPrintStatus(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get(`${this.BROWSER_PRINT_URL}/available`, {
          responseType: 'text' as 'json'
        }).pipe(
          timeout(this.DEFAULT_TIMEOUT),
          map(response => response as string)
        )
      );
      
      return response === 'yes';
    } catch (error) {
      console.error('Browser Print no está disponible:', error);
      return false;
    }
  }

  /**
   * Obtiene la lista de dispositivos disponibles
   */
  async getAvailableDevices(): Promise<BrowserPrintDevice[]> {
    try {
      const devices = await firstValueFrom(
        this.http.get<BrowserPrintDevice[]>(`${this.BROWSER_PRINT_URL}/available_printers`)
        .pipe(
          timeout(this.DEFAULT_TIMEOUT),
          map(response => response || [])
        )
      );
      
      return devices;
    } catch (error) {
      console.error('Error al obtener dispositivos:', error);
      throw new Error('No se pudieron obtener los dispositivos. Verifique que Browser Print esté ejecutándose.');
    }
  }

  /**
   * Obtiene el dispositivo por defecto
   */
  async getDefaultDevice(): Promise<BrowserPrintDevice | null> {
    try {
      const device = await firstValueFrom(
        this.http.get<BrowserPrintDevice>(`${this.BROWSER_PRINT_URL}/default`)
        .pipe(
          timeout(this.DEFAULT_TIMEOUT),
          map(response => response || null)
        )
      );
      
      if (device) {
        this.selectedDevice = device;
      }
      
      return device;
    } catch (error) {
      console.error('Error al obtener dispositivo por defecto:', error);
      return null;
    }
  }

  /**
   * Selecciona un dispositivo específico
   */
  selectDevice(device: BrowserPrintDevice): void {
    this.selectedDevice = device;
  }

  /**
   * Obtiene el dispositivo actualmente seleccionado
   */
  getSelectedDevice(): BrowserPrintDevice | null {
    return this.selectedDevice;
  }

  /**
   * Envía código ZPL a la impresora seleccionada
   */
  async printZPL(zplCode: string, deviceUid?: string): Promise<boolean> {
    const targetDevice = deviceUid || this.selectedDevice?.uid;
    
    if (!targetDevice) {
      throw new Error('No se ha seleccionado ningún dispositivo');
    }

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'text/plain'
      });

      await firstValueFrom(
        this.http.post(
          `${this.BROWSER_PRINT_URL}/write`,
          zplCode,
          {
            headers,
            params: { device: targetDevice },
            responseType: 'text' as 'json'
          }
        ).pipe(
          timeout(this.DEFAULT_TIMEOUT * 3), // 30 segundos para impresión
          map(response => response as string)
        )
      );

      console.log('Impresión enviada exitosamente');
      return true;
    } catch (error) {
      console.error('Error al imprimir:', error);
      throw new Error('Error al enviar el documento a la impresora: ' + (error as Error)?.message);
    }
  }

  /**
   * Obtiene el estado de la impresora
   */
  async getPrinterStatus(deviceUid?: string): Promise<string> {
    const targetDevice = deviceUid || this.selectedDevice?.uid;
    
    if (!targetDevice) {
      throw new Error('No se ha seleccionado ningún dispositivo');
    }

    try {
      const status = await firstValueFrom(
        this.http.get(
          `${this.BROWSER_PRINT_URL}/status`,
          {
            params: { device: targetDevice },
            responseType: 'text' as 'json'
          }
        ).pipe(
          timeout(this.DEFAULT_TIMEOUT),
          map(response => (response as string) || 'Sin estado')
        )
      );

      return status;
    } catch (error) {
      console.error('Error al obtener estado:', error);
      throw new Error('Error al obtener el estado de la impresora');
    }
  }

  /**
   * Envía una página de prueba
   */
  async printTestPage(deviceUid?: string): Promise<boolean> {
    const testZPL = `^XA
^FO50,50^A0N,50,50^FDPRUEBA DE CONEXION^FS
^FO50,120^A0N,30,30^FDBrowser Print Service^FS
^FO50,170^A0N,25,25^FD${new Date().toLocaleString('es-HN')}^FS
^FO50,220^A0N,20,20^FDImpresora: ${this.selectedDevice?.name || 'Desconocida'}^FS
^XZ`;

    return await this.printZPL(testZPL, deviceUid);
  }

  /**
   * Obtiene información completa del estado del servicio
   */
  async getFullStatus(): Promise<BrowserPrintStatus> {
    try {
      const isConnected = await this.checkBrowserPrintStatus();
      
      if (!isConnected) {
        return {
          isConnected: false,
          devices: [],
          error: 'Browser Print no está ejecutándose'
        };
      }

      const devices = await this.getAvailableDevices();
      
      if (devices.length === 0) {
        return {
          isConnected: true,
          devices: [],
          error: 'No se encontraron impresoras conectadas'
        };
      }

      // Si no hay dispositivo seleccionado, intenta obtener el por defecto
      if (!this.selectedDevice && devices.length > 0) {
        const defaultDevice = await this.getDefaultDevice();
        if (!defaultDevice && devices.length > 0) {
          this.selectedDevice = devices[0]; // Usar la primera disponible
        }
      }

      return {
        isConnected: true,
        devices,
        selectedDevice: this.selectedDevice || undefined
      };

    } catch (error) {
      return {
        isConnected: false,
        devices: [],
        error: (error as Error).message
      };
    }
  }

  /**
   * Reinicia la conexión
   */
  async reconnect(): Promise<boolean> {
    try {
      this.selectedDevice = null;
      const status = await this.getFullStatus();
      return status.isConnected;
    } catch (error) {
      console.error('Error al reconectar:', error);
      return false;
    }
  }

  /**
   * Verifica si una impresora específica está disponible
   */
  async isDeviceAvailable(deviceName: string): Promise<boolean> {
    try {
      const devices = await this.getAvailableDevices();
      return devices.some(device => device.name.toLowerCase().includes(deviceName.toLowerCase()));
    } catch (error) {
      return false;
    }
  }
}