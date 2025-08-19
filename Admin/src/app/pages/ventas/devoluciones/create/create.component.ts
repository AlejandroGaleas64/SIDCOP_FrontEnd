import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { Router } from '@angular/router';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, DropzoneModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent implements OnInit {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  vendedores: any[] = [];
  clientes: any[] = [];
  clientesFiltrados: any[] = [];
  facturasFiltradas: any[] = [];

  cargando = false;
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // visita: any = {
  //   vendedor: null,
  //   cliente: null,
  //   direccion: null,
  //   esVi_Id: null,
  //   clVi_Observaciones: '',
  //   clVi_Fecha: ''
  // };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.cargarVendedores();
  }

  cargarVendedores() {
    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/ListarPorRutas`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => { this.vendedores = data; this.cargando = false; },
      error: () => { this.mostrarMensaje('Error al cargar la lista de vendedores', 'error'); this.cargando = false; }
    });
  }

  onVendedorSeleccionado(vendedor: any) {
    if (!vendedor) { this.clientesFiltrados = []; return; }
    this.cargarClientesPorRuta(vendedor.ruta_Id);
    console.log('Vendedor seleccionado:', vendedor);
  }

  cargarClientesPorRuta(rutaId: number) {
    if (!rutaId) { 
      this.clientesFiltrados = [];
      // this.visita.cliente = null;
      return; 
    }
    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        // Filtrar clientes por ruta_Id
        this.clientesFiltrados = (data || []).filter(cliente => cliente.ruta_Id === rutaId);
        this.cargando = false;
        // if (this.clientesFiltrados.length === 1) { 
        //   this.visita.cliente = this.clientesFiltrados[0]; 
        // } else { 
        //   this.visita.cliente = null; 
        //   this.visita.direccion = null; 
        // }
        console.log('Clientes filtrados:', this.clientesFiltrados);
      },
      error: () => { 
        this.mostrarMensaje('Error al cargar la lista de clientes', 'error'); 
        this.cargando = false; 
        this.clientesFiltrados = []; 
      }
    });
  }

  cargarFacturarPorCliente(vendedorId: number) {
    if (!vendedorId) { 
      this.facturasFiltradas = [];
      return; 
    }
    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Facturas/ListarPorVendedor/{vendedorId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        // Filtrar facturas por cliente_Id
        this.facturasFiltradas = (data || []).filter(factura => factura.clie_Id === vendedorId);
        this.cargando = false;
        console.log('Facturas filtradas:', this.facturasFiltradas);
      },
      error: () => { 
        this.mostrarMensaje('Error al cargar la lista de facturas', 'error'); 
        this.cargando = false; 
        this.facturasFiltradas = []; 
      }
    });
    console.log('Cliente ID:', vendedorId);
  }

  // onClienteSeleccionado(cliente: any) {
  //   if (!cliente) { this.facturas = []; this.visita.direccion = null; return; }
  //   this.cargarDireccionesCliente(cliente.clie_Id);
  // }

  mostrarMensaje(mensaje: string, tipo: 'exito' | 'error' | 'advertencia' = 'error') {
    this.mensajeExito = tipo === 'exito' ? mensaje : '';
    this.mensajeError = tipo === 'error' ? mensaje : '';
    this.mensajeWarning = tipo === 'advertencia' ? mensaje : '';

    this.mostrarAlertaExito = tipo === 'exito';
    this.mostrarAlertaError = tipo === 'error';
    this.mostrarAlertaWarning = tipo === 'advertencia';
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  cancelar() { this.onCancel.emit(); }

  limpiarFormulario() {
    this.clientesFiltrados = [];
    this.mostrarErrores = false;
  }

  searchCliente = (term: string, item: any) => {
    if (!term) return true;
    term = term.toLowerCase();
    return item.clie_Codigo?.toLowerCase().includes(term) || item.clie_Nombres?.toLowerCase().includes(term) || item.clie_Apellidos?.toLowerCase().includes(term) || item.clie_NombreNegocio?.toLowerCase().includes(term);
  };

  guardar(){
    
  }
}
