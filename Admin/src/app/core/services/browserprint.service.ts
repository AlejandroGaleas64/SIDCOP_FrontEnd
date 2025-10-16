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
  private readonly BROWSER_PRINT_URL = 'https:localhost:9101'; // URL correcta del Browser Print Service
  private readonly DEFAULT_TIMEOUT = 5000; // 5 segundos
  private selectedDevice: BrowserPrintDevice | null = null;
  
  constructor(private http: HttpClient) {
    this.initService();
  }

  private async initService() {
    try {
      const isAvailable = await this.checkBrowserPrintStatus();
      if (isAvailable) {
        const defaultDevice = await this.getDefaultDevice();
        if (defaultDevice) {
          this.selectedDevice = defaultDevice;
          //console.log('Impresora Zebra detectada:', defaultDevice.name);
        }
      }
    } catch (error) {
      console.error('Error al inicializar el servicio de impresión:', error);
    }
  }

  /**
   * Verifica si Browser Print está ejecutándose
   */
  async checkBrowserPrintStatus(): Promise<boolean> {
    try {
      // Usar fetch API para mejor compatibilidad
      const response = await fetch(`${this.BROWSER_PRINT_URL}/status`, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        console.error('Error en respuesta del servicio:', {
          status: response.status,
          statusText: response.statusText
        });
        return false;
      }

      const text = await response.text();
      //console.log('Estado del servicio:', text);
      return true;
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
      const response = await fetch(`${this.BROWSER_PRINT_URL}/available_printers`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const devices = await response.json() as BrowserPrintDevice[];
      
      if (devices.length === 0) {
        console.warn('No se encontraron impresoras Zebra conectadas');
      } else {
        //console.log('Impresoras encontradas:', devices.map(d => d.name));
      }
      
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
    try {
      // Primero verificar que el servicio esté disponible
      const isAvailable = await this.checkBrowserPrintStatus();
      if (!isAvailable) {
        throw new Error('El servicio de impresión no está disponible');
      }

      // Obtener o verificar el dispositivo
      const targetDevice = deviceUid || this.selectedDevice?.uid;
      if (!targetDevice) {
        const devices = await this.getAvailableDevices();
        if (devices.length > 0) {
          this.selectedDevice = devices[0];
        } else {
          throw new Error('No hay impresoras Zebra disponibles');
        }
      }

      // Verificar que el código ZPL sea válido
      if (!zplCode.startsWith('^XA') || !zplCode.endsWith('^XZ')) {
        console.warn('Advertencia: El código ZPL podría no ser válido');
      }

      const headers = new HttpHeaders({
        'Content-Type': 'text/plain',
        'Accept': '*/*',
        'Cache-Control': 'no-cache'
      });


      // Construir la URL con el parámetro de dispositivo si existe
      let url = `${this.BROWSER_PRINT_URL}/write`;
      if (this.selectedDevice?.uid) {
        url += `?device=${encodeURIComponent(this.selectedDevice.uid)}`;
      }

      // Usar fetch API en lugar de HttpClient para mejor compatibilidad
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        },
        body: zplCode
      });

      if (!response.ok) {
        throw new Error(`Error de impresión: ${response.statusText}`);
      }

      //console.log('Impresión enviada exitosamente');
      return true;
    } catch (error) {
      console.error('Error al imprimir:', error);
      if (error instanceof HttpErrorResponse) {
        console.error('Detalles del error HTTP:', {
          status: error.status,
          statusText: error.statusText,
          url: error.url
        });
      }
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