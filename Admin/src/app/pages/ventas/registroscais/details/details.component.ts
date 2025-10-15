import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistroCAI } from 'src/app/Modelos/ventas/RegistroCAI.Model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() registroCaiData: RegistroCAI | null = null;
  @Output() onClose = new EventEmitter<void>();

  RegistroCAIDetalle: RegistroCAI | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  // Propiedades para el rango de facturas
  numeroFacturaFormateado: string = '';
  Sucursales: any[] = [];
  PE: any[] = [];

  constructor(private http: HttpClient) {
    this.cargarSucursales();
    this.cargarPE();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['registroCaiData'] && changes['registroCaiData'].currentValue) {
      this.cargarDetallesSimulado(changes['registroCaiData'].currentValue);
    }
  }

  // Función para obtener el valor numérico sin máscara
  private getUnmaskedValue(maskedValue: string): string {
    if (!maskedValue) return '';
    return maskedValue.toString().replace(/\D/g, '');
  }

  // Función para generar el formato de número de factura
  generarNumeroFactura(): void {
    try {
      if (!this.RegistroCAIDetalle || !this.Sucursales || !this.PE || 
          this.Sucursales.length === 0 || this.PE.length === 0) {
        this.numeroFacturaFormateado = '--- - --- - 01 - 00000000 al --- - --- - 01 - 00000000';
        return;
      }

      const sucursalSeleccionada = this.Sucursales.find(s => s.sucu_Id === this.RegistroCAIDetalle?.sucu_Id);
      const puntoEmisionSeleccionado = this.PE.find(pe => pe.puEm_Id === this.RegistroCAIDetalle?.puEm_Id);
      
      const codigoSucursal = sucursalSeleccionada?.sucu_Codigo || '___';
      const codigoPuntoEmision = puntoEmisionSeleccionado?.puEm_Codigo || '___';
      
      const rangoInicialTexto = this.RegistroCAIDetalle.regC_RangoInicial?.toString() || '';
      const rangoFinalTexto = this.RegistroCAIDetalle.regC_RangoFinal?.toString() || '';
      
      if (rangoInicialTexto.trim() && rangoFinalTexto.trim()) {
        const rangoInicial = this.getUnmaskedValue(rangoInicialTexto).padStart(8, '0');
        const rangoFinal = this.getUnmaskedValue(rangoFinalTexto).padStart(8, '0');
        
        const facturaInicial = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - ${rangoInicial}`;
        const facturaFinal = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - ${rangoFinal}`;
        
        this.numeroFacturaFormateado = `${facturaInicial} al ${facturaFinal}`;
      } else {
        this.numeroFacturaFormateado = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - 00000000 al ${codigoSucursal} - ${codigoPuntoEmision} - 01 - 00000000`;
      }
    } catch (error) {
      console.warn('Error al generar número de factura:', error);
      this.numeroFacturaFormateado = '--- - --- - 01 - 00000000 al --- - --- - 01 - 00000000';
    }
  }

  cargarSucursales() {
    this.http
      .get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe(
        (data) => {
          this.Sucursales = data;
          setTimeout(() => this.generarNumeroFactura(), 50);
        }
      );
  }

  cargarPE() {
    this.http
      .get<any>(`${environment.apiBaseUrl}/PuntoEmision/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe((data) => {
        this.PE = data;
        setTimeout(() => this.generarNumeroFactura(), 50);
      });
  }

  // Simulación de carga
  cargarDetallesSimulado(data: RegistroCAI): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.RegistroCAIDetalle = { ...data };
        //////console.log('Detalles cargados:', this.RegistroCAIDetalle);
        this.cargando = false;
        // Generar número de factura después de cargar los detalles
        setTimeout(() => this.generarNumeroFactura(), 100);
      } catch (error) {
        console.error('Error al cargar detalles de Registros CAI:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del Registros CAI.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
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

  // Función para obtener el código de sucursal
  obtenerCodigoSucursal(): string {
    const sucursal = this.Sucursales.find(s => s.sucu_Id === this.RegistroCAIDetalle?.sucu_Id);
    return sucursal?.sucu_Codigo || '';
  }

  // Función para obtener la descripción completa de sucursal
  obtenerSucursalCompleta(): string {
    const codigo = this.obtenerCodigoSucursal();
    const descripcion = this.RegistroCAIDetalle?.sucu_Descripcion || 'N/A';
    return codigo ? `${codigo} - ${descripcion}` : descripcion;
  }
}
