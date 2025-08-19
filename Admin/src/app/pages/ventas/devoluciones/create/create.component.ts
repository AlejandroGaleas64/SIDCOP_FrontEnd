import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { DropzoneModule, DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { Router } from '@angular/router';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Usuario } from 'src/app/Modelos/acceso/usuarios.Model';

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

  devolucion: any = {
    devo_Id: null,
    fact_Id: null,
    devo_Fecha: '',
    devo_Motivo: '',
    usua_Creacion: 0,
    devo_FechaCreacion: '',
    usua_modificacion: 0,
    devo_FechaModificacion: '',
    devo_EnSucursal: false
  };

  vendedores: any[] = [];
  clientes: any[] = [];
  clientesFiltrados: any[] = [];
  facturasFiltradas: any[] = [];
  direcciones: any[] = [];
  productos: any[] = [];
  maxDate = new Date().toISOString().split('T')[0];
  minDate = '2000-01-01';

  // ========== NUEVAS PROPIEDADES PARA INVENTARIO ==========
  inventarioFactura: any[] = [];
  cargandoInventario = false;
  origenSeleccionadoAnterior: number = 0;

  // ========== PROPIEDADES PARA BÚSQUEDA Y PAGINACIÓN ==========
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 12;

  clienteSeleccionado: any = null;
  vendedorSeleccionado: any = null;

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

  getInicioRegistro(): number {
    return (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  getFinRegistro(): number {
    const fin = this.paginaActual * this.productosPorPagina;
    return Math.min(fin, this.productosFiltrados.length);
  }

  getProductoIndex(prodId: number): number {
    return this.productos.findIndex(p => p.prod_Id === prodId);
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
    if (!vendedor) { 
      this.clientesFiltrados = []; 
      this.facturasFiltradas = [];
      this.vendedorSeleccionado = null;
      this.clienteSeleccionado = null;
      return; 
    }

    this.vendedorSeleccionado = vendedor; // Guardar referencia
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

  onClienteSeleccionado(cliente: any) {
    console.log('Cliente recibido en onClienteSeleccionado:', cliente);
    
    if (!cliente) { 
      this.direcciones = [];
      this.facturasFiltradas = [];
      this.clienteSeleccionado = null;
      return;
    }

    this.clienteSeleccionado = cliente; // Guardar referencia
    this.cargarDireccionesCliente(cliente.clie_Id);
    console.log('Cliente seleccionado:', cliente);
  }

  cargarDireccionesCliente(clienteId: number) {
    if (!clienteId) { 
      this.direcciones = [];
      this.facturasFiltradas = [];
      return; 
    }

    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/DireccionesPorCliente/Buscar/${clienteId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => { 
        this.direcciones = data || []; 
        console.log('Direcciones cargadas:', this.direcciones);
        
        // Cargar facturas después de tener las direcciones
        if (this.vendedorSeleccionado && this.direcciones.length > 0) {
          this.cargarYFiltrarFacturas();
        } else if (this.direcciones.length === 0) {
          console.log('No hay direcciones para este cliente');
          this.facturasFiltradas = [];
        }
        
        this.cargando = false;
      },
      error: () => { 
        this.mostrarMensaje('Error al cargar las direcciones del cliente', 'error'); 
        this.cargando = false; 
        this.direcciones = []; 
        this.facturasFiltradas = [];
      }
    });
  }

  cargarYFiltrarFacturas() {
    if (!this.vendedorSeleccionado) {
      console.error('No hay vendedor seleccionado');
      this.facturasFiltradas = [];
      return;
    }

    if (!this.direcciones || this.direcciones.length === 0) {
      console.error('No hay direcciones cargadas');
      this.facturasFiltradas = [];
      return;
    }

    console.log('Cargando facturas para vendedor:', this.vendedorSeleccionado.vend_Id);
    
    this.cargando = true;
    this.http.get<any>(`${environment.apiBaseUrl}/Facturas/ListarPorVendedor/${this.vendedorSeleccionado.vend_Id}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (res) => {
        console.log('Respuesta facturas completa:', res);
        const todasFacturas = res?.data || res || []; // Intentar ambas estructuras

        // Obtener los IDs de las direcciones
        const direccionesIds = this.direcciones.map(d => d.diCl_Id);
        console.log('IDs de direcciones:', direccionesIds);

        // Log de las facturas para ver su estructura
        console.log('Todas las facturas:', todasFacturas);
        if (todasFacturas.length > 0) {
          console.log('Ejemplo de factura:', todasFacturas[0]);
          console.log('Campos disponibles:', Object.keys(todasFacturas[0]));
        }

        // Filtrar facturas - revisar diferentes nombres de campo posibles
        this.facturasFiltradas = todasFacturas.filter((factura: any) => {
          // Intentar diferentes nombres de campo que podrían contener el ID de dirección
          const direccionId = factura.dicl_Id || factura.diCl_Id || factura.direccion_Id || factura.cliente_direccion_Id;
          const coincide = direccionesIds.includes(direccionId);
          
          if (coincide) {
            console.log(`Factura ${factura.fact_Numero || factura.numero} coincide con dirección ${direccionId}`);
          }
          
          return coincide;
        });

        console.log('Facturas filtradas final:', this.facturasFiltradas);
        
        if (this.facturasFiltradas.length === 0) {
          console.warn('No se encontraron facturas que coincidan con las direcciones del cliente');
          console.log('Verificar si el nombre del campo de dirección en las facturas es correcto');
        }
      },
      error: (err) => { 
        console.error('Error cargando facturas:', err);
        this.mostrarMensaje('Error al cargar la lista de facturas', 'error'); 
        this.facturasFiltradas = []; 
      },
      complete: () => this.cargando = false
    });
  }

  cargarFacturarPorCliente(vendedorId: number) {
    if (!vendedorId) { 
      this.facturasFiltradas = [];
      return;
    }

    this.cargando = true;
    this.http.get<any>(`${environment.apiBaseUrl}/Facturas/ListarPorVendedor/${vendedorId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (res) => {
        console.log('Respuesta completa:', res);
        const todasFacturas = res?.data || [];

        // Solo filtrar si ya tenemos direcciones cargadas
        if (this.direcciones && this.direcciones.length > 0) {
          const direccionesIds = this.direcciones.map(d => d.diCl_Id);
          this.facturasFiltradas = todasFacturas.filter((f: any) => 
            direccionesIds.includes(f.dicl_Id)
          );
        } else {
          // Si no hay direcciones, no mostrar facturas
          this.facturasFiltradas = [];
        }

        console.log('Facturas filtradas:', this.facturasFiltradas);
      },
      error: (err) => { 
        console.error('Error cargando facturas:', err);
        this.mostrarMensaje('Error al cargar la lista de facturas', 'error'); 
        this.facturasFiltradas = []; 
      },
      complete: () => this.cargando = false
    });
  }

  onFacturaSeleccionada(factura: any) {
    if (!factura) {
      this.productos = [];
      this.productosFiltrados = [];
      return;
    }

    this.devolucion.fact_Id = factura.fact_Id;
    this.listarProductos(factura.fact_Id);
  }

  listarProductos(id: number): void {
    if (!id) return;

    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Productos/BuscarPorFactura/${id}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        // data ya es un array de productos
        this.productos = (data || []).map((producto: any) => ({
          ...producto,
          cantidad: 0,
          observaciones: '',
          stockDisponible: 0,
          tieneStock: false
        }));
        this.aplicarFiltros();
        console.log('Productos cargados:', this.productos);
      },
      error: () => this.mostrarMensaje('Error al cargar productos'),
      complete: () => this.cargando = false
    });
  }

  aumentarCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length) {
      const producto = this.productos[index];
      
      // Validar que hay sucursal seleccionada
      // if (!this.traslado.tras_Origen || this.traslado.tras_Origen === 0) {
      //   this.mostrarWarning('Debe seleccionar una sucursal de origen primero');
      //   return;
      // }

      // Validar que el producto tiene stock
      if (!producto.tieneStock) {
        this.mostrarMensaje(`El producto "${producto.prod_Descripcion}" no tiene stock disponible en esta sucursal`);
        return;
      }

      // Validar que no exceda el stock disponible
      if (producto.cantidad >= producto.stockDisponible) {
        this.mostrarMensaje(`Stock insuficiente. Solo hay ${producto.stockDisponible} unidades disponibles de "${producto.prod_Descripcion}"`);
        return;
      }

      producto.cantidad = (producto.cantidad || 0) + 1;
      // this.actualizarEstadoNavegacion();
    }
  }
  
  disminuirCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length && this.productos[index].cantidad > 0) {
      this.productos[index].cantidad--;
      // this.actualizarEstadoNavegacion();
    }
  }
  
  validarCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length) {
      const producto = this.productos[index];
      let cantidad = producto.cantidad || 0;

      // Validar rango básico
      cantidad = Math.max(0, Math.min(999, cantidad));

      // Validar contra stock disponible
      if (cantidad > 0) {
        // Validar que hay sucursal seleccionada
        // if (!this.traslado.tras_Origen || this.traslado.tras_Origen === 0) {
        //   this.mostrarWarning('Debe seleccionar una sucursal de origen primero');
        //   producto.cantidad = 0;
        //   return;
        // }

        // Validar que el producto tiene stock
        if (!producto.tieneStock) {
          this.mostrarMensaje(`El producto "${producto.prod_Descripcion}" no tiene stock disponible en esta sucursal`);
          producto.cantidad = 0;
          return;
        }

        // Validar que no exceda el stock disponible
        if (cantidad > producto.stockDisponible) {
          this.mostrarMensaje(`Stock insuficiente. Solo hay ${producto.stockDisponible} unidades disponibles de "${producto.prod_Descripcion}"`);
          cantidad = producto.stockDisponible;
        }
      }

      producto.cantidad = cantidad;
      // this.actualizarEstadoNavegacion();
    }
  }

  // ========== MÉTODOS PARA BÚSQUEDA Y PAGINACIÓN ==========

  buscarProductos(): void {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  limpiarBusqueda(): void {
    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    if (!this.busquedaProducto.trim()) {
      this.productosFiltrados = [...this.productos];
    } else {
      const termino = this.busquedaProducto.toLowerCase().trim();
      this.productosFiltrados = this.productos.filter(producto =>
        producto.prod_Descripcion.toLowerCase().includes(termino)
      );
    }
  }

  getProductosFiltrados(): any[] {
    return this.productosFiltrados;
  }

  getProductosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    const fin = inicio + this.productosPorPagina;
    return this.productosFiltrados.slice(inicio, fin);
  }

  getTotalPaginas(): number {
    return Math.ceil(this.productosFiltrados.length / this.productosPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.getTotalPaginas()) {
      this.paginaActual = pagina;
    }
  }

  getPaginasVisibles(): number[] {
    const totalPaginas = this.getTotalPaginas();
    const paginaActual = this.paginaActual;
    const paginas: number[] = [];

    if (totalPaginas <= 5) {
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      if (paginaActual <= 3) {
        for (let i = 1; i <= 5; i++) {
          paginas.push(i);
        }
      } else if (paginaActual >= totalPaginas - 2) {
        for (let i = totalPaginas - 4; i <= totalPaginas; i++) {
          paginas.push(i);
        }
      } else {
        for (let i = paginaActual - 2; i <= paginaActual + 2; i++) {
          paginas.push(i);
        }
      }
    }

    return paginas;
  }

  getTotalProductosSeleccionados(): number {
    return this.productos
      .filter(producto => producto.cantidad > 0)
      .reduce((total, producto) => total + producto.cantidad, 0);
  }

  getProductosSeleccionados(): any[] {
    return this.productos.filter(producto => producto.cantidad > 0);
  }

  obtenerProductosSeleccionados(): any[] {
    return this.productos
      .filter(producto => producto.cantidad > 0)
      .map(producto => ({
        prod_Id: producto.prod_Id,
        prod_Descripcion: producto.prod_Descripcion,
        cantidad: producto.cantidad,
        observaciones: producto.observaciones || ''
      }));
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
