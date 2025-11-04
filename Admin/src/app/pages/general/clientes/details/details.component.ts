import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from 'src/app/Modelos/general/Cliente.Model';
import { DireccionPorCliente } from 'src/app/Modelos/general/DireccionPorCliente.Model';
import { environment } from 'src/environments/environment.prod';
import { HttpClient } from '@angular/common/http';
import { MapaSelectorComponent } from '../mapa-selector/mapa-selector.component';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

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
  }


  diasSemana(d: any): string {
    if (d === null || d === undefined || d === '') return 'N/A';

    const map: Record<string, string> = {
      '1': 'Lunes',
      '2': 'Martes',
      '3': 'Miércoles',
      '4': 'Jueves',
      '5': 'Viernes',
      '6': 'Sábado',
      '7': 'Domingo'
    };

    const normalizeToNumbers = (val: any): number[] => {
      if (Array.isArray(val)) return val.map(v => Number(v)).filter(n => !isNaN(n));
      if (typeof val === 'number') return [val];
      const s = String(val).trim();
      if (!s) return [];
      return s.split(/[,;|\s]+/).map(p => Number(p.trim())).filter(n => !isNaN(n));
    };

    const nums = normalizeToNumbers(d);
    if (!nums.length) return 'N/A';

    // ordenar numéricamente y eliminar duplicados (orden ascendente)
    const numsOrdered = Array.from(new Set(nums.map(n => Number(n)).sort((a, b) => a - b)));

    const names = numsOrdered.map(n => map[String(n)] ?? String(n));
    return names.join(', ');
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
        this.cargarUltimaVisita();
      } catch (error) {
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

  constructor(
    private http: HttpClient,
    private imageUploadService: ImageUploadService
  ) { }

  /**
   * Construye la URL completa para mostrar la imagen
   */
  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
  }

  /**
   * Obtiene la imagen a mostrar (la subida o la por defecto)
   */
  getImageToDisplay(): string {
    if (this.clienteDetalle?.clie_ImagenDelNegocio && this.clienteDetalle.clie_ImagenDelNegocio.trim()) {
      return this.getImageDisplayUrl(this.clienteDetalle.clie_ImagenDelNegocio);
    }
    return 'assets/images/users/32/user-svg.svg';
  }
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
    if (!this.clienteDetalle || !this.clienteDetalle.clie_Id) {
      this.ultimaVisita = null;
      return;
    }
    this.http.get<any[]>(
      `${environment.apiBaseUrl}/ClientesVisitaHistorial/ListarVisitasPorCliente`,
      {
        headers: { 'x-api-key': environment.apiKey },
        params: { clie_Id: this.clienteDetalle.clie_Id }
      }
    ).subscribe(visitas => {
      if (visitas && visitas.length > 0) {
        this.ultimaVisita = visitas[0].clVi_Fecha; // Ajusta el campo si es necesario
      } else {
        this.ultimaVisita = null;
      }
    });
  }
}