import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from 'src/app/Modelos/general/Cliente.Model';
import { DireccionPorCliente } from 'src/app/Modelos/general/DireccionPorCliente.Model';
import { environment } from 'src/environments/environment.prod';
import { HttpClient } from '@angular/common/http';
import { MapaSelectorComponent } from '../mapa-selector/mapa-selector.component';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, MapaSelectorComponent],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() clienteData: Cliente | null = null;
  @Output() onClose = new EventEmitter<void>();

  clienteDetalle: Cliente | null = null;
  direccionesPorClienteDetalle: DireccionPorCliente | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';
  colonias: any[] = [];
  municipios: any[] = [];
  departamentos: any[] = [];
  departamentosAval: any[] = [];
  municipiosAval: any[] = [];

  puntosVista: { lat: number; lng: number; nombre?: string }[] = [];

  public imgLoaded: boolean = false;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clienteData'] && changes['clienteData'].currentValue) {
      this.cargarDetallesSimulado(changes['clienteData'].currentValue);
    }

    const vend_Id = changes['clienteData'].currentValue.vend_Id;
    if (vend_Id) {
      this.obtenerVendedoresPorCliente(vend_Id);
    }
    this.cargarColonias();
    this.cargarMunicipios();
    this.cargarDepartamentos();
    this.cargarUltimaVisita();
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Cliente): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.clienteDetalle = { ...data };
        this.cargando = false;

        this.cargarDirecciones();
        this.cargarAvales();
      } catch (error) {
        console.error('Error al cargar detalles del cliente:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del cliente.';
        this.cargando = false;
      }
    }, 500);
  }

  cerrar(): void {
    this.onClose.emit();
    this.puntosVista = [];
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

  constructor(private http: HttpClient) { }
  direcciones: DireccionPorCliente[] = [];
  avales: any = [];

  cargarDirecciones(): void {
    if (!this.clienteDetalle?.clie_Id) {
      this.direcciones = [];
      this.puntosVista = [];
      return;
    }
    this.http.get<DireccionPorCliente[]>(`${environment.apiBaseUrl}/DireccionesPorCliente/Buscar/${this.clienteDetalle.clie_Id}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.direcciones = data || [];
      this.puntosVista = this.direcciones.map(d => ({
        lat: d.diCl_Latitud,
        lng: d.diCl_Longitud,
        nombre: d.diCl_Observaciones
      }));
    });
  }

  cargarAvales(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Aval/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      if (this.clienteDetalle?.clie_Id != null) {
        this.avales = (data || []).filter(a => a.clie_Id === this.clienteDetalle?.clie_Id);
      } else {
        this.avales = [];
      }
    });
  }

  cargarColonias(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.colonias = data || [];
    });
  }

  cargarMunicipios(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Municipios/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.municipios = data || [];
    });
  }

  cargarDepartamentos(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.departamentos = data || [];
    });
  }

  obtenerDescripcionColonia(colo_Id: number): string {
    const colonia = this.colonias.find(c => c.colo_Id === colo_Id);
    return colonia?.colo_Descripcion || 'Colonia no encontrada';
  }

  obtenerDescripcionMunicipioAval(muni_Codigo: any): string {
    const municipioAval = this.municipiosAval.find(m => String(m.muni_Codigo) === String(muni_Codigo));
    return municipioAval?.muni_Descripcion || 'Municipio no encontrado';
  }

  obtenerDescripcionDepartamento(depa_Codigo: any): string {
    const departamento = this.departamentos.find(d => String(d.depa_Codigo) === String(depa_Codigo));
    return departamento?.depa_Descripcion || 'Departamento no encontrado';
  }

  vendedores: any[] = [];

  obtenerVendedoresPorCliente(vend_Id: number): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/MostrarVendedor/${vend_Id}`)

      .subscribe({
        next: (data) => {
          this.vendedores = data;
        },
        error: (err) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al cargar los vendedores.';
        }
      });
  }

  ultimaVisita: string | null = null;
  cargarUltimaVisita() {
    if (!this.clienteDetalle?.clie_Id) return;
    this.http.get<any[]>(`${environment.apiBaseUrl}/ClientesVisitaHistorial/${this.clienteDetalle.clie_Id}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((visitas: any[]) => {
      if (visitas && visitas.length) {
        // Ordena por fecha descendente y toma la primera
        visitas.sort((a, b) => new Date(b.ClVi_Fecha).getTime() - new Date(a.ClVi_Fecha).getTime());
        this.ultimaVisita = visitas[0].ClVi_Fecha;
      } else {
        this.ultimaVisita = null;
      }
    });
  }
}