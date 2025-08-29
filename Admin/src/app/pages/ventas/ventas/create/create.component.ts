import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { VentaInsertar, VentaDetalle } from 'src/app/Modelos/ventas/Facturas.model';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment.prod';
import { forkJoin } from 'rxjs';
import { obtenerUsuarioId, esAdministrador, obtenerPersonaId, obtenerSucursalId, obtenerRegCId } from 'src/app/core/utils/user-utils';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
})
export class CreateComponent implements OnInit {

  
  // Control de visibilidad según rol
  esAdmin: boolean = false;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  // Estados de alertas
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  fechaActual = '';
  cargando = false;
  guardando = false;

  // Control de tabs
  tabActivo = 1;
  puedeAvanzarAResumen = false;

  // Datos del formulario
  clientes: any[] = []; // Lista de clientes tipada correctamente
  clienteSeleccionado: number = 0; // ID del cliente seleccionado
  clientesFiltrados: any[] = []; // Lista de clientes filtrados para ng-select
  direccionesCliente: any[] = []; // Lista de direcciones del cliente seleccionado
  venta: VentaInsertar = new VentaInsertar();
  sucursales: any[] = [];
  productos: any[] = [];
  vendedores: any[] = [];
  usuarioId: number = 0;
  
  // Ubicación
  obteniendoUbicacion = false;
  errorUbicacion = '';
  // Inventario por sucursal
  inventarioSucursal: any[] = [];
  cargandoInventario = false;
  sucursalSeleccionada: number = 0;
  sucursalSeleccionadaAnterior: number = 0;

  // Búsqueda y paginación
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 12;

  constructor(private http: HttpClient) {
    this.inicializar();
  }

  ngOnInit(): void {
    // Verificar si el usuario es administrador
    this.esAdmin = esAdministrador();
    this.usuarioId = obtenerUsuarioId();
    
    // Si no es administrador, asignar automáticamente la sucursal y el vendedor
    if (!this.esAdmin) {
      // Asignar la sucursal del usuario automáticamente
      const sucursalId = obtenerSucursalId();
      if (sucursalId > 0) {
        this.venta.regC_Id = sucursalId;
      }
      
      // Asignar el ID de persona como vendedor
      const personaId = obtenerPersonaId();
      if (personaId > 0) {
        this.venta.vend_Id = personaId;
      }
      
      // Asignar el registro CAI del usuario
      const regCId = obtenerRegCId();
      if (regCId > 0) {
        this.venta.regC_Id_Vendedor = regCId;
        console.log('regC_Id_Vendedor asignado:', regCId);
      }
    }
    
    this.cargarDatosIniciales();
  }

private inicializar(): void {
  const hoy = new Date();

  this.fechaActual = hoy.toISOString().split('T')[0];

  // Inicializar todos los campos obligatorios con valores por defecto según el nuevo formato
  this.venta = new VentaInsertar({
    fact_Numero: '', // Se generará en el backend
    fact_TipoDeDocumento: '01',
    regC_Id: 19,
    diCl_Id: 0, // Nuevo campo que reemplaza a clie_Id
    direccionId: 0, // Se llenará cuando se seleccione un cliente y sus direcciones
    fact_TipoVenta: '', // se llenará en el formulario
    fact_FechaEmision: hoy,
    fact_Latitud: 14.123456,
    fact_Longitud: -87.123456,
    fact_Referencia: '',
    fact_AutorizadoPor: 'SISTEMA',
    vend_Id: 1,
    usua_Creacion: 1,
    detallesFacturaInput: []
  });
  
  // Obtener ubicación actual
  this.obtenerUbicacionActual();
}

  private cargarDatosIniciales(): void {
    // Si no es administrador, asignar automáticamente sucursal y vendedor
    if (!this.esAdmin) {
      // Asignar ID de sucursal
      const sucursalId = obtenerSucursalId();
      this.sucursalSeleccionada = sucursalId;
      
      // Asignar ID de registro CAI
      this.venta.regC_Id = obtenerRegCId();
      
      // Asignar ID de vendedor
      this.venta.vend_Id = obtenerPersonaId();
      
      // Cargar vendedores filtrados por la sucursal asignada
      if (sucursalId) {
        this.cargarVendedoresPorSucursal(sucursalId);
      }
    }
    
    this.cargando = true;
    const headers = { 'x-api-key': environment.apiKey };

    // Cargar datos en paralelo usando forkJoin
    forkJoin({
      sucursales: this.http.get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, { headers }),
      clientes: this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/Listar`, { headers }),
      vendedores: this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, { headers })
    }).subscribe({
      next: (data) => {
        this.sucursales = data.sucursales;
        this.clientes = data.clientes;
        this.vendedores = data.vendedores;
        this.cargando = false;
        
        // Verificar la estructura de los datos para depuración
        if (this.vendedores && this.vendedores.length > 0) {
          const primerVendedor = this.vendedores[0];
          const propiedadesSucursal = Object.keys(primerVendedor).filter(key => 
            key.toLowerCase().includes('sucu') || 
            key.toLowerCase().includes('sucur') || 
            key.toLowerCase().includes('regc'));
          
          console.log('Propiedades de sucursal encontradas en vendedores:', propiedadesSucursal);
        }
      },
      error: (error) => {
        this.mostrarError('Error al cargar datos iniciales');
        this.cargando = false;
      }
    });

    // Cargar productos
    this.listarProductos();
  }
  
  /**
   * Carga los vendedores filtrados por sucursal
   * @param sucursalId ID de la sucursal para filtrar vendedores
   */
  private cargarVendedoresPorSucursal(sucursalId: number): void {
    if (!sucursalId) return;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Api-Key': environment.apiKey,
      'accept': '*/*'
    });
    
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/PorSucursal/${sucursalId}`, { headers })
      .subscribe({
        next: (response) => {
          if (response && Array.isArray(response)) {
            // Si el usuario no es administrador, asignar automáticamente su ID como vendedor
            if (!this.esAdmin && this.usuarioId) {
              const vendedorUsuario = response.find(v => v.vend_Id === this.usuarioId);
              if (vendedorUsuario) {
                this.venta.vend_Id = vendedorUsuario.vend_Id;
              } else if (response.length > 0) {
                // Si no se encuentra el usuario como vendedor, usar el primer vendedor disponible
                this.venta.vend_Id = response[0].vend_Id;
              }
            }
          }
        },
        error: (error) => {
          console.error('Error al cargar vendedores por sucursal:', error);
        }
      });
  }

  listarProductos(): void {
    this.http
      .get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (data) => {
          this.productos = data.map((producto: any) => ({
            ...producto,
            cantidad: 0,
            stockDisponible: 0,
            tieneStock: false,
          }));
          this.aplicarFiltros();
        },
        error: () => this.mostrarError('Error al cargar productos'),
      });
  }

  /**
   * Obtiene la ubicación actual del usuario
   */
  public obtenerUbicacionActual(): void {
    this.obteniendoUbicacion = true;
    this.errorUbicacion = '';
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.venta.fact_Latitud = position.coords.latitude;
          this.venta.fact_Longitud = position.coords.longitude;
          this.obteniendoUbicacion = false;
        },
        (error) => {
          this.obteniendoUbicacion = false;
          this.errorUbicacion = 'No se pudo obtener la ubicación: ' + this.getErrorUbicacion(error);
        }
      );
    } else {
      this.obteniendoUbicacion = false;
      this.errorUbicacion = 'La geolocalización no está soportada por este navegador';
    }
  }

  /**
   * Obtiene un mensaje de error legible para errores de geolocalización
   */
  private getErrorUbicacion(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Usuario denegó la solicitud de geolocalización';
      case error.POSITION_UNAVAILABLE:
        return 'La información de ubicación no está disponible';
      case error.TIMEOUT:
        return 'La solicitud para obtener la ubicación expiró';
      default:
        return 'Error desconocido';
    }
  }

  /**
   * Filtra los vendedores por la sucursal seleccionada
   */
  getVendedoresPorSucursal(): any[] {
    if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0) {
      return [];
    }
    
    // Filtrar vendedores por sucursal
    return this.vendedores.filter(vendedor => {
      // Según la estructura proporcionada, el campo es 'sucu_Id'
      return Number(vendedor.sucu_Id) === Number(this.sucursalSeleccionada);
    });
  }
  
  /**
   * Captura el regC_Id del vendedor seleccionado
   */
  onVendedorChange(): void {
    // Limpiar el regC_Id_Vendedor anterior
    this.venta.regC_Id_Vendedor = undefined;
    
    // Si no hay ID de vendedor seleccionado, salir
    if (!this.venta.vend_Id || this.venta.vend_Id === 0) {
      return;
    }
    
    // Buscar el vendedor seleccionado en la lista de vendedores
    const vendedorSeleccionado = this.vendedores.find(v => Number(v.vend_Id) === Number(this.venta.vend_Id));
    
    if (!vendedorSeleccionado) {
      console.warn('Vendedor no encontrado con ID:', this.venta.vend_Id);
      return;
    }
    
    // Verificar si el vendedor tiene el campo regC_Id
    if (vendedorSeleccionado.regC_Id !== undefined) {
      this.venta.regC_Id_Vendedor = vendedorSeleccionado.regC_Id;
      console.log('regC_Id_Vendedor asignado:', this.venta.regC_Id_Vendedor);
    } else {
      // Intentar buscar cualquier propiedad que contenga 'regc'
      const regCProperty = Object.keys(vendedorSeleccionado).find(key => 
        key.toLowerCase().includes('regc'));
      
      if (regCProperty) {
        this.venta.regC_Id_Vendedor = vendedorSeleccionado[regCProperty];
        console.log('regC_Id_Vendedor encontrado en propiedad alternativa:', regCProperty, this.venta.regC_Id_Vendedor);
      } else {
        console.warn('No se encontró regC_Id para el vendedor seleccionado');
      }
    }
    
    // Actualizar estado de navegación
    this.actualizarEstadoNavegacion();
  }

  // ========== INVENTARIO POR SUCURSAL ==========
  onSucursalChange(): void {
    // Filtrar vendedores por sucursal seleccionada
    const vendedoresFiltrados = this.getVendedoresPorSucursal();
    
    // Si hay vendedores disponibles, seleccionar el primero por defecto
    if (vendedoresFiltrados.length > 0) {
      this.venta.vend_Id = Number(vendedoresFiltrados[0].vend_Id);
      // Al cambiar de sucursal, actualizamos el regC_Id_Vendedor con el vendedor seleccionado
      this.onVendedorChange();
    } else {
      this.venta.vend_Id = 0;
      // Limpiamos el regC_Id_Vendedor si no hay vendedores
      this.venta.regC_Id_Vendedor = undefined;
      console.warn('No hay vendedores disponibles para la sucursal seleccionada');
    }
    
    // Limpiar cantidades si cambió la sucursal
    if (this.sucursalSeleccionadaAnterior !== this.sucursalSeleccionada) {
      this.limpiarCantidadesSeleccionadas();
      this.sucursalSeleccionadaAnterior = this.sucursalSeleccionada;
    }

    // Cargar inventario de la nueva sucursal
    if (this.sucursalSeleccionada && this.sucursalSeleccionada > 0) {
      this.cargarInventarioSucursal();
    } else {
      this.limpiarInventario();
    }
    
    // Actualizar estado de navegación
    this.actualizarEstadoNavegacion();
  }




  private cargarInventarioSucursal(): void {
    this.cargandoInventario = true;
    this.limpiarAlertas();

    const headers = { 'x-api-key': environment.apiKey };
    this.http
      .get<any[]>(`${environment.apiBaseUrl}/InventarioSucursales/Buscar/${this.sucursalSeleccionada}`, { headers })
      .subscribe({
        next: (inventario) => {
          this.inventarioSucursal = inventario;
          this.actualizarStockProductos();
          this.validarProductosConStock();
          this.cargandoInventario = false;
        },
        error: (error) => {
          console.error('Error al cargar inventario de sucursal:', error);
          this.mostrarError('Error al cargar el inventario de la sucursal');
          this.cargandoInventario = false;
          this.limpiarInventario();
        },
      });
  }

  private actualizarStockProductos(): void {
    this.productos.forEach((producto) => {
      const inventarioItem = this.inventarioSucursal.find(
        (inv) => inv.prod_Id === producto.prod_Id
      );
      producto.stockDisponible = inventarioItem ? inventarioItem.inSu_Cantidad : 0;
      producto.tieneStock = producto.stockDisponible > 0;
    });
    this.aplicarFiltros();
  }

  private validarProductosConStock(): void {
    const productosConStock = this.productos.filter((p) => p.tieneStock);
    if (productosConStock.length === 0) {
      this.mostrarWarning('La sucursal seleccionada no tiene productos disponibles');
    }
  }

  private limpiarCantidadesSeleccionadas(): void {
    this.productos.forEach((producto) => (producto.cantidad = 0));
    this.actualizarEstadoNavegacion();
  }

  private limpiarInventario(): void {
    this.inventarioSucursal = [];
    this.productos.forEach((producto) => {
      producto.stockDisponible = 0;
      producto.tieneStock = false;
    });
  }

  getStockDisponible(prodId: number): number {
    const producto = this.productos.find((p) => p.prod_Id === prodId);
    return producto ? producto.stockDisponible : 0;
  }

  tieneStockDisponible(prodId: number): boolean {
    const producto = this.productos.find((p) => p.prod_Id === prodId);
    return producto ? producto.tieneStock : false;
  }

  // ========== CONTROL DE CANTIDADES ==========
  aumentarCantidad(index: number): void {
    // Obtener el producto de la página actual
    const productosPaginados = this.getProductosPaginados();
    if (index < 0 || index >= productosPaginados.length) return;
    const producto = productosPaginados[index];

    if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0) {
      this.mostrarWarning('Debe seleccionar una sucursal primero');
      return;
    }

    if (!producto.tieneStock) {
      this.mostrarWarning(`El producto "${producto.prod_Descripcion}" no tiene stock`);
      return;
    }

    if (producto.cantidad >= producto.stockDisponible) {
      this.mostrarWarning(`Stock insuficiente. Máximo: ${producto.stockDisponible}`);
      return;
    }

    producto.cantidad++;
    this.actualizarEstadoNavegacion();
  }

  disminuirCantidad(index: number): void {
    // Obtener el producto de la página actual
    const productosPaginados = this.getProductosPaginados();
    if (index >= 0 && index < productosPaginados.length && productosPaginados[index].cantidad > 0) {
      productosPaginados[index].cantidad--;
      this.actualizarEstadoNavegacion();
    }
  }

  validarCantidad(index: number): void {
    // Obtener el producto de la página actual
    const productosPaginados = this.getProductosPaginados();
    if (index < 0 || index >= productosPaginados.length) return;
    const producto = productosPaginados[index];
    let cantidad = producto.cantidad || 0;

    cantidad = Math.max(0, Math.min(999, cantidad));

    if (cantidad > 0) {
      if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0) {
        this.mostrarWarning('Debe seleccionar una sucursal primero');
        producto.cantidad = 0;
        return;
      }

      if (!producto.tieneStock) {
        this.mostrarWarning(`El producto "${producto.prod_Descripcion}" no tiene stock`);
        producto.cantidad = 0;
        return;
      }

      if (cantidad > producto.stockDisponible) {
        this.mostrarWarning(`Stock insuficiente. Máximo: ${producto.stockDisponible}`);
        cantidad = producto.stockDisponible;
      }
    }

    producto.cantidad = cantidad;
    this.actualizarEstadoNavegacion();
  }

  // ========== BÚSQUEDA Y PAGINACIÓN ==========
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
    const termino = this.busquedaProducto.toLowerCase().trim();
    
    // Filtrar productos por término de búsqueda
    const productosFiltrados = !termino
      ? [...this.productos]
      : this.productos.filter((p) =>
          p.prod_Descripcion.toLowerCase().includes(termino)
        );
    
    // Ordenar productos: primero los que tienen stock, luego los sin stock
    this.productosFiltrados = productosFiltrados.sort((a, b) => {
      // Si ambos tienen stock o ambos no tienen stock, mantener orden alfabético
      if (a.tieneStock === b.tieneStock) {
        return a.prod_Descripcion.localeCompare(b.prod_Descripcion);
      }
      // Los que tienen stock van primero (true > false)
      return b.tieneStock ? 1 : -1;
    });
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
    const total = this.getTotalPaginas();
    const actual = this.paginaActual;
    const rango = 2;
    const paginas: number[] = [];

    if (total <= 5) {
      for (let i = 1; i <= total; i++) paginas.push(i);
    } else if (actual <= 3) {
      for (let i = 1; i <= 5; i++) paginas.push(i);
    } else if (actual >= total - 2) {
      for (let i = total - 4; i <= total; i++) paginas.push(i);
    } else {
      for (let i = actual - rango; i <= actual + rango; i++) paginas.push(i);
    }
    return paginas;
  }

  getInicioRegistro(): number {
    return (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  getFinRegistro(): number {
    return Math.min(this.paginaActual * this.productosPorPagina, this.productosFiltrados.length);
  }

  // ========== NAVEGACIÓN DE TABS ==========
  cambiarTab(tab: number): void {
    if (tab === 2 && !this.puedeAvanzarAResumen) {
      this.mostrarWarning('Complete los datos requeridos antes de continuar');
      return;
    }
    this.tabActivo = tab;
    this.limpiarAlertas();
  }

  irAResumen(): void {
    this.mostrarErrores = true;
    if (this.validarDatosBasicos()) {
      this.puedeAvanzarAResumen = true;
      this.tabActivo = 2;
      this.limpiarAlertas();
    }
  }

  private validarDatosBasicos(): boolean {
    const errores = [];

    if (!this.sucursalSeleccionada || this.sucursalSeleccionada == 0) errores.push('Sucursal');
    if (!this.clienteSeleccionado || this.clienteSeleccionado == 0) errores.push('Cliente');
    if (!this.venta.direccionId || this.venta.direccionId == 0) errores.push('Dirección del cliente');
    if (!this.venta.vend_Id || this.venta.vend_Id == 0) errores.push('Vendedor');
    if (!this.venta.fact_TipoVenta) errores.push('Tipo de venta (Contado/Crédito)');
    if (!this.venta.fact_FechaEmision) errores.push('Fecha de emisión');

    const productosSeleccionados = this.getProductosSeleccionados();
    if (productosSeleccionados.length === 0) errores.push('Al menos un producto');

    if (errores.length > 0) {
      this.mostrarWarning(`Complete: ${errores.join(', ')}`);
      return false;
    }

    return true;
  }

  // ========== RESUMEN ==========
  getNombreSucursal(): string {
    const sucursal = this.sucursales.find((s) => s.sucu_Id == this.sucursalSeleccionada);
    return sucursal?.sucu_Descripcion || 'No seleccionada';
  }
  
  getNombreCliente(): string {
    const cliente = this.clientes.find((c) => c.clie_Id == this.clienteSeleccionado);
    return cliente ? `${cliente.clie_NombreNegocio} - ${cliente.clie_Nombres} ${cliente.clie_Apellidos}` : 'No seleccionado';
  }
  
  getNombreDireccion(): string {
    const direccion = this.direccionesCliente.find((d) => d.diCl_Id == this.venta.direccionId);
    return direccion?.diCl_DireccionExacta || 'No seleccionada';
  }
  
  getNombreVendedor(): string {
    const vendedor = this.vendedores.find((v) => v.vend_Id == this.venta.vend_Id);
    return vendedor ? `${vendedor.vend_Nombres} ${vendedor.vend_Apellidos}` : 'No seleccionado';
  }

  // ========== CÁLCULOS FINANCIEROS ==========
  getSubtotal(): number {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .reduce((total, p) => total + (p.cantidad * p.prod_PrecioUnitario), 0);
  }

  getImpuestos(): number {
    // Asumiendo ISV del 15% sobre el subtotal
    return this.getSubtotal() * 0.15;
  }

  getTotalGeneral(): number {
    return this.getSubtotal() + this.getImpuestos();
  }
  
  // ========== DIRECCIONES DEL CLIENTE ==========
  cargarDireccionesCliente(clienteId: number): void {
    if (!clienteId || clienteId === 0) {
      this.direccionesCliente = [];
      this.venta.direccionId = 0; // Resetear la dirección seleccionada
      this.venta.diCl_Id = 0; // Resetear el ID de dirección del cliente
      this.venta.clie_Id = 0; // Resetear el ID del cliente
      return;
    }
    
    // Guardamos el ID del cliente seleccionado
    this.venta.clie_Id = clienteId;
    // NO asignamos el ID del cliente a diCl_Id, ya que son campos diferentes
    // diCl_Id debe ser el ID de la dirección del cliente, no el ID del cliente
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Api-Key': environment.apiKey,
      'accept': '*/*'
    });
    
    this.http.get<any>(`${environment.apiBaseUrl}/DireccionesPorCliente/Buscar/${clienteId}`, { headers })
      .subscribe({
        next: (response) => {
          if (response) {
            this.direccionesCliente = response;
            // Si hay direcciones disponibles, seleccionar la primera por defecto
            if (this.direccionesCliente.length > 0) {
              const primeraDireccion = this.direccionesCliente[0];
              this.venta.direccionId = primeraDireccion.diCl_Id;
              // Actualizamos diCl_Id con el ID de la dirección seleccionada
              this.actualizarDireccionSeleccionada(primeraDireccion.diCl_Id);
            } else {
              this.venta.direccionId = 0;
              this.venta.diCl_Id = 0;
            }
          } else {
            this.direccionesCliente = [];
            this.venta.direccionId = 0;
            this.venta.diCl_Id = 0;
          }
        },
        error: (error) => {
          this.direccionesCliente = [];
          this.venta.direccionId = 0;
          this.venta.diCl_Id = 0;
          this.mostrarError('Error al cargar direcciones del cliente');
        }
      });
  }
  
  actualizarDireccionSeleccionada(direccionId: number): void {
    if (!direccionId || direccionId === 0) {
      this.venta.diCl_Id = 0;
      this.venta.direccionId = 0;
      return;
    }
    
    // Actualizar el ID de dirección del cliente para el backend
    this.venta.diCl_Id = direccionId;
    this.venta.direccionId = direccionId;
    
    // Actualizar el estado de navegación
    this.actualizarEstadoNavegacion();
  }

  getTotalProductosSeleccionados(): number {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .reduce((total, p) => total + p.cantidad, 0);
  }

  getProductosSeleccionados(): any[] {
    return this.productos.filter((p) => p.cantidad > 0);
  }

  obtenerDetallesVenta(): any[] {
    // Simplificamos los detalles según el nuevo formato requerido
    return this.productos
      .filter((p) => p.cantidad > 0)
      .map((p) => ({
        prod_Id: p.prod_Id,
        faDe_Cantidad: p.cantidad
      }));
  }

  private actualizarEstadoNavegacion(): void {
    if (this.tabActivo === 2) {
      const valido = this.validarDatosBasicos();
      this.puedeAvanzarAResumen = valido;
      if (!valido) {
        this.tabActivo = 1;
        this.mostrarWarning('Se detectaron cambios. Complete los datos requeridos.');
      }
    }
  }

  // ========== ACCIONES ==========
  cancelar(): void {
    this.limpiarFormulario();
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.limpiarAlertas();
  }

  guardar(): void {
    this.mostrarErrores = true;

    if (!this.validarFormularioCompleto()) {
      this.tabActivo = 1;
      return;
    }

    this.limpiarAlertas();
    this.crearVenta();
  }
  
  validarFormularioCompleto(): boolean {
    const errores = [];
    if (!this.sucursalSeleccionada || this.sucursalSeleccionada == 0) errores.push('Sucursal');
    if (!this.clienteSeleccionado || this.clienteSeleccionado == 0) errores.push('Cliente');
    if (!this.venta.direccionId || this.venta.direccionId == 0) errores.push('Dirección del cliente');
    if (!this.venta.fact_TipoVenta) errores.push('Tipo de venta');
    if (!this.venta.fact_FechaEmision) errores.push('Fecha de emisión');
    if (this.obtenerDetallesVenta().length === 0) errores.push('Productos');

    if (errores.length > 0) {
      this.mostrarWarning(`Complete: ${errores.join(', ')}`);
      return false;
    }
    return true;
  }

  // ========== MÉTODOS PARA MANEJAR CANTIDADES EN RESUMEN ==========
  aumentarCantidadEnResumen(prodId: number): void {
    const index = this.productos.findIndex(p => p.prod_Id === prodId);
    if (index !== -1) {
      const producto = this.productos[index];
      if (producto.cantidad < producto.stockDisponible) {
        producto.cantidad++;
        this.actualizarEstadoNavegacion();
      }
    }
  }

  disminuirCantidadEnResumen(prodId: number): void {
    const index = this.productos.findIndex(p => p.prod_Id === prodId);
    if (index !== -1 && this.productos[index].cantidad > 0) {
      this.productos[index].cantidad--;
      this.actualizarEstadoNavegacion();
    }
  }

  validarCantidadEnResumen(producto: any): void {
    let cantidad = producto.cantidad || 0;
    cantidad = Math.max(0, Math.min(999, cantidad));
    
    if (cantidad > 0) {
      if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0) {
        this.mostrarWarning('Debe seleccionar una sucursal primero');
        producto.cantidad = 0;
        return;
      }

      if (!producto.tieneStock) {
        this.mostrarWarning(`El producto "${producto.prod_Descripcion}" no tiene stock`);
        producto.cantidad = 0;
        return;
      }

      if (cantidad > producto.stockDisponible) {
        this.mostrarWarning(`Stock insuficiente. Máximo: ${producto.stockDisponible}`);
        cantidad = producto.stockDisponible;
      }
    }

    producto.cantidad = cantidad;
    this.actualizarEstadoNavegacion();
  }

  // ========== MÉTODOS PRIVADOS ==========
  private limpiarFormulario(): void {
    this.limpiarAlertas();
    this.venta = new VentaInsertar();
    this.venta.usua_Creacion = this.usuarioId;
    this.venta.fact_FechaEmision = new Date();
    this.venta.fact_FechaLimiteEmision = new Date();
    this.venta.regC_Id = 0;
    this.venta.diCl_Id = 0;
    this.venta.direccionId = 0;
    this.venta.vend_Id = 0;
    
    // Resetear selección de cliente y direcciones
    this.clienteSeleccionado = 0;
    this.direccionesCliente = [];
    
    this.productos.forEach((p) => {
      p.cantidad = 0;
      p.stockDisponible = 0;
      p.tieneStock = false;
    });

    this.tabActivo = 1;
    this.puedeAvanzarAResumen = false;

    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();

    this.inventarioSucursal = [];
    this.sucursalSeleccionadaAnterior = 0;
  }

  private limpiarAlertas(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

onFechaEmisionChange(event: any): void {
  const value = event.target.value; // string en formato "YYYY-MM-DD"
  if (value) {
    this.venta.fact_FechaEmision = new Date(value); // Convierte a Date
  } else {
    this.venta.fact_FechaEmision = new Date(); // Valor por defecto
  }
}


private crearVenta(): void {
  const detalles = this.obtenerDetallesVenta();

  // Preparamos los datos según el formato requerido por el backend
  const datosEnviar = {
    fact_Numero: '',
    fact_TipoDeDocumento: '01',
    regC_Id: Number(this.venta.regC_Id), // ID del registro CAI
    sucu_Id: Number(this.sucursalSeleccionada), // ID de la sucursal
    diCl_Id: this.venta.diCl_Id,
    direccionId: this.venta.direccionId, // ID de la dirección del cliente (NO el ID del cliente)
    vend_Id: Number(this.venta.vend_Id),
    fact_TipoVenta: this.venta.fact_TipoVenta,
    fact_FechaEmision: this.venta.fact_FechaEmision.toISOString(),
    fact_Latitud: 14.123456,
    fact_Longitud: -87.123456,
    fact_Referencia: this.venta.fact_Referencia || 'Venta desde app web',
    fact_AutorizadoPor: 'SISTEMA',
    usua_Creacion: this.usuarioId || 1,
    detallesFacturaInput: detalles
  };
  
  // Verificamos que diCl_Id tenga un valor válido
  if (!datosEnviar.diCl_Id || datosEnviar.diCl_Id === 0) {
    this.mostrarError('Error: No se ha seleccionado una dirección de cliente válida');
    this.guardando = false;
    return;
  }
  
  // Verificamos que regC_Id (registro CAI) tenga un valor válido
  if (!datosEnviar.regC_Id || datosEnviar.regC_Id === 0) {
    this.mostrarError('Error: No se ha seleccionado un registro CAI válido');
    this.guardando = false;
    return;
  }

  // Verificamos que sucu_Id (sucursal) tenga un valor válido
  if (!datosEnviar.sucu_Id || datosEnviar.sucu_Id === 0) {
    this.mostrarError('Error: No se ha seleccionado una sucursal válida');
    this.guardando = false;
    return;
  }

  console.log(datosEnviar);

  this.http
    .post<any>(`${environment.apiBaseUrl}/Facturas/InsertarEnSucursal`, datosEnviar, {
      headers: this.obtenerHeaders(),
    })
    .subscribe({
      next: (response) => {
        this.guardando = false;
        const id = this.extraerId(response);
        if (id > 0) {
            this.mostrarExito(`Venta guardada con éxito (${detalles.length} productos). Mostrando detalles...`);
          
          // Emitir evento para notificar al componente padre con el ID de la factura
          // y la acción 'detalles' para que muestre automáticamente los detalles
          setTimeout(() => {
            this.onSave.emit({ 
              fact_Id: id, 
              action: 'detalles',
              mostrarDetalles: true // Indicador explícito para mostrar detalles
            });
            
            // Limpiar el formulario después de crear la venta exitosamente
            this.limpiarFormulario();
          }, 2000);
        } else {
          this.mostrarError('No se pudo obtener el ID de la venta');
        }
      },
      error: (err) => {
        this.guardando = false;
        
        // DEBUGGING DETALLADO - Analizar estructura completa del error
        console.group('🔍 ANÁLISIS DETALLADO DEL ERROR');
        console.log('1. Error completo:', err);
        console.log('2. Tipo de err:', typeof err);
        console.log('3. err.error:', err.error);
        console.log('4. Tipo de err.error:', typeof err.error);
        console.log('5. err.status:', err.status);
        console.log('6. err.statusText:', err.statusText);
        console.log('7. err.message:', err.message);
        console.log('8. err.name:', err.name);
        
        // Si err.error es string, intentar parsearlo como JSON
        if (typeof err.error === 'string') {
          console.log('9. err.error es string, intentando parsear JSON...');
          try {
            const parsedError = JSON.parse(err.error);
            console.log('10. JSON parseado exitosamente:', parsedError);
          } catch (parseError) {
            console.log('10. Error al parsear JSON:', parseError);
          }
        }
        
        // Verificar todas las propiedades del objeto error
        console.log('11. Propiedades de err:', Object.keys(err));
        if (err.error && typeof err.error === 'object') {
          console.log('12. Propiedades de err.error:', Object.keys(err.error));
        }
        console.groupEnd();
        
        // Intentar extraer el mensaje de error de diferentes formas
        let errorMessage = 'Error al guardar la venta';
        
        // Método 1: err.error como objeto con message
        if (err.error && typeof err.error === 'object' && err.error.message) {
          errorMessage = err.error.message;
          console.log('✅ Mensaje extraído de err.error.message:', errorMessage);
        }
        // Método 2: err.error como string JSON
        else if (typeof err.error === 'string') {
          try {
            const parsedError = JSON.parse(err.error);
            if (parsedError.message) {
              errorMessage = parsedError.message;
              console.log('✅ Mensaje extraído de JSON parseado:', errorMessage);
            }
          } catch (e) {
            console.log('❌ No se pudo parsear err.error como JSON');
          }
        }
        // Método 3: err.message directo
        else if (err.message) {
          errorMessage = err.message;
          console.log('✅ Mensaje extraído de err.message:', errorMessage);
        }
        
        this.mostrarError(errorMessage);
      },
    });
}

  private extraerId(response: any): number {
    const data = response?.data;
    if (!data || data.code_Status !== 1) return 0;
    
    // Intentar extraer el ID del mensaje de estado
    if (data.message_Status) {
      // El formato esperado es: "Venta insertada correctamente. ID: 102. Factura creada exitosamente. Total: 5.00"
      const match = data.message_Status.match(/ID:\s*(\d+)/i);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    
    // Si no se encuentra en el mensaje, intentar con los campos tradicionales
    return data.fact_Id || data.Fact_Id || data.id || 0;
  }



  private obtenerHeaders(): any {
    return {
      'X-Api-Key': environment.apiKey,
      'Content-Type': 'application/json',
      accept: '*/*',
    };
  }

  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mostrarAlertaExito = true;
  }

  private mostrarError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mostrarAlertaError = true;
    setTimeout(() => this.limpiarAlertas(), 5000);
  }

  private mostrarWarning(mensaje: string): void {
    this.mensajeWarning = mensaje;
    this.mostrarAlertaWarning = true;
    setTimeout(() => this.limpiarAlertas(), 4000);
  }
}