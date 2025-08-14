import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VentaInsertar, VentaDetalle } from 'src/app/Modelos/ventas/Facturas.model';
import { environment } from 'src/environments/environment';
import { obtenerUsuarioId } from 'src/app/core/utils/user-utils';
import { forkJoin } from 'rxjs';
@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
})
export class CreateComponent implements OnInit {
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
    this.cargarDatosIniciales();
    this.usuarioId = obtenerUsuarioId();
  }

private inicializar(): void {
  const hoy = new Date();

  this.fechaActual = hoy.toISOString().split('T')[0];

  // Inicializar todos los campos obligatorios con valores por defecto
  this.venta = new VentaInsertar({
    fact_Numero: this.generarNumeroFactura(), // Generamos un número aleatorio
    fact_TipoDeDocumento: 'FAC',
    regC_Id: 0,
    clie_Id: 0,
    fact_TipoVenta: '', // se llenará en el formulario
    fact_FechaEmision: hoy, // Fecha de emisión siempre es la fecha actual
    fact_FechaLimiteEmision: hoy,
    fact_RangoInicialAutorizado: '010111',
    fact_RangoFinalAutorizado: '01099999',
    fact_Latitud: 0,
    fact_Longitud: 0,
    fact_Referencia: '',
    fact_AutorizadoPor: 'CARLOS',
    vend_Id: 0,
    usua_Creacion: obtenerUsuarioId(),
    detallesFacturaInput: []
  });
  
  // Obtener ubicación actual
  this.obtenerUbicacionActual();
}

  private cargarDatosIniciales(): void {
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
        console.log('Vendedores cargados:', this.vendedores);
        
        // Verificar la estructura de los datos para depuración
        if (this.vendedores && this.vendedores.length > 0) {
          const primerVendedor = this.vendedores[0];
          console.log('Propiedades del primer vendedor:', Object.keys(primerVendedor));
          
          // Verificar si los vendedores tienen alguna propiedad relacionada con sucursal
          const propiedadesSucursal = Object.keys(primerVendedor).filter(key => 
            key.toLowerCase().includes('sucu') || 
            key.toLowerCase().includes('sucur') || 
            key.toLowerCase().includes('regc'));
          
          if (propiedadesSucursal.length === 0) {
            console.warn('ADVERTENCIA: No se encontró ninguna propiedad relacionada con sucursal en los vendedores');
            console.log('Esto podría causar problemas al filtrar vendedores por sucursal');
            
            // Mostrar toda la estructura para análisis
            console.log('Estructura completa del primer vendedor:', primerVendedor);
          } else {
            console.log('Propiedades relacionadas con sucursal encontradas:', propiedadesSucursal);
          }
        }
      },
      error: (error) => {
        this.mostrarError('Error al cargar datos iniciales');
        console.error('Error:', error);
        this.cargando = false;
      }
    });

    // Cargar productos
    this.listarProductos();
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
          console.log('Ubicación obtenida:', this.venta.fact_Latitud, this.venta.fact_Longitud);
        },
        (error) => {
          this.obteniendoUbicacion = false;
          this.errorUbicacion = 'No se pudo obtener la ubicación: ' + this.getErrorUbicacion(error);
          console.error('Error de geolocalización:', error);
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
   * Filtra los vendedores por la sucursal seleccionada y captura el RegC_Id
   */
  getVendedoresPorSucursal(): any[] {
    if (!this.venta.regC_Id || this.venta.regC_Id === 0) {
      return [];
    }
    
    // Si no hay vendedores cargados, retornar array vacío
    if (!this.vendedores || this.vendedores.length === 0) {
      return [];
    }
    
    const sucursalId = Number(this.venta.regC_Id);
    
    // Determinar qué propiedad usar para el filtrado
    let propiedadSucursal = '';
    let propiedadRegCId = '';
    
    // Buscar la propiedad correcta que contiene el ID de sucursal y RegC_Id
    if (this.vendedores && this.vendedores.length > 0) {
      const primerVendedor = this.vendedores[0];
      
      // Buscar propiedad de sucursal
      const posiblesPropiedadesSucursal = ['sucu_Id', 'sucuId', 'sucursalId'];
      for (const prop of posiblesPropiedadesSucursal) {
        if (primerVendedor[prop] !== undefined) {
          propiedadSucursal = prop;
          break;
        }
      }
      
      // Buscar propiedad de RegC_Id
      if (primerVendedor['regC_Id'] !== undefined) {
        propiedadRegCId = 'regC_Id';
      } else {
        const propiedadesRegC = Object.keys(primerVendedor).find(key => 
          key.toLowerCase().includes('regc'));
        
        if (propiedadesRegC) {
          propiedadRegCId = propiedadesRegC;
        }
      }
      
      // Si no encontramos ninguna propiedad conocida para sucursal, buscar cualquiera que contenga 'sucu'
      if (!propiedadSucursal) {
        const propiedadesSucursal = Object.keys(primerVendedor).find(key => 
          key.toLowerCase().includes('sucu'));
        
        if (propiedadesSucursal) {
          propiedadSucursal = propiedadesSucursal;
        }
      }
      
      // Registrar las propiedades encontradas
      console.log('Propiedad de sucursal encontrada:', propiedadSucursal);
      console.log('Propiedad de RegC_Id encontrada:', propiedadRegCId);
    }
    
    // Si no se encontró ninguna propiedad relacionada con sucursal, mostrar advertencia
    if (!propiedadSucursal) {
      console.warn('No se pudo determinar la propiedad de sucursal en los vendedores');
      return [];
    }
    
    // Filtrar usando la propiedad encontrada y capturar RegC_Id si está disponible
    const vendedoresFiltrados = this.vendedores.filter(vendedor => {
      const vendedorSucursalId = Number(vendedor[propiedadSucursal]);
      return vendedorSucursalId === sucursalId;
    });
    
    // Si encontramos la propiedad RegC_Id y hay vendedores filtrados, capturar el valor
    if (propiedadRegCId && vendedoresFiltrados.length > 0) {
      const regCIdVendedor = vendedoresFiltrados[0][propiedadRegCId];
      if (regCIdVendedor) {
        console.log('RegC_Id capturado del vendedor:', regCIdVendedor);
        // Almacenar el RegC_Id del vendedor en una propiedad separada
        this.venta.regC_Id_Vendedor = regCIdVendedor;
      }
    }
    
    return vendedoresFiltrados;
  }

  // ========== INVENTARIO POR SUCURSAL ==========
  onSucursalChange(): void {
    // Filtrar vendedores por sucursal seleccionada
    const vendedoresFiltrados = this.getVendedoresPorSucursal();
    
    // Si hay vendedores disponibles, seleccionar el primero por defecto
    if (vendedoresFiltrados.length > 0) {
      this.venta.vend_Id = Number(vendedoresFiltrados[0].vend_Id);
    } else {
      this.venta.vend_Id = 0;
      
      // Si no hay vendedores para esta sucursal pero hay vendedores en general,
      // usar todos los vendedores como alternativa
      if (this.vendedores && this.vendedores.length > 0) {
        // Mostrar mensaje en consola
        console.warn('No se encontraron vendedores para la sucursal seleccionada. Mostrando todos los vendedores.');
      }
    }
    if (this.sucursalSeleccionadaAnterior !== this.venta.regC_Id) {
      this.limpiarCantidadesSeleccionadas();
      this.sucursalSeleccionadaAnterior = this.venta.regC_Id;
    }

    if (this.venta.regC_Id && this.venta.regC_Id > 0) {
      this.cargarInventarioSucursal();
    } else {
      this.limpiarInventario();
    }
  }




  private cargarInventarioSucursal(): void {
    this.cargandoInventario = true;
    this.limpiarAlertas();

    const headers = { 'x-api-key': environment.apiKey };
    this.http
      .get<any[]>(`${environment.apiBaseUrl}/InventarioSucursales/Buscar/${this.venta.regC_Id}`, { headers })
      .subscribe({
        next: (inventario) => {
          this.inventarioSucursal = inventario;
          this.actualizarStockProductos();
          this.validarProductosConStock();
          this.cargandoInventario = false;
        },
        error: (error) => {
          console.error('Error al cargar inventario:', error);
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
    if (index < 0 || index >= this.productos.length) return;
    const producto = this.productos[index];

    if (!this.venta.regC_Id || this.venta.regC_Id === 0) {
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
    if (index >= 0 && index < this.productos.length && this.productos[index].cantidad > 0) {
      this.productos[index].cantidad--;
      this.actualizarEstadoNavegacion();
    }
  }

  validarCantidad(index: number): void {
    if (index < 0 || index >= this.productos.length) return;
    const producto = this.productos[index];
    let cantidad = producto.cantidad || 0;

    cantidad = Math.max(0, Math.min(999, cantidad));

    if (cantidad > 0) {
      if (!this.venta.regC_Id || this.venta.regC_Id === 0) {
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
    this.productosFiltrados = !termino
      ? [...this.productos]
      : this.productos.filter((p) =>
          p.prod_Descripcion.toLowerCase().includes(termino)
        );
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

    if (!this.venta.regC_Id || this.venta.regC_Id == 0) errores.push('Sucursal');
    if (!this.venta.clie_Id || this.venta.clie_Id == 0) errores.push('Cliente');
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
    const sucursal = this.sucursales.find((s) => s.sucu_Id == this.venta.regC_Id);
    return sucursal?.sucu_Descripcion || 'No seleccionada';
  }

  getTotalProductosSeleccionados(): number {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .reduce((total, p) => total + p.cantidad, 0);
  }

  getProductosSeleccionados(): any[] {
    return this.productos.filter((p) => p.cantidad > 0);
  }

  obtenerDetallesVenta(): VentaDetalle[] {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .map((p) => ({
        prod_Id: p.prod_Id,
        faDe_Cantidad: p.cantidad,
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
      if (!this.venta.regC_Id || this.venta.regC_Id === 0) {
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
    this.venta.regC_Id = 19;
    this.venta.clie_Id =111;
    this.venta.vend_Id = 1;
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

  private validarFormularioCompleto(): boolean {
    const errores = [];
    if (!this.venta.regC_Id || this.venta.regC_Id == 0) errores.push('Sucursal');
    if (!this.venta.fact_TipoVenta) errores.push('Tipo de venta');
    if (!this.venta.fact_FechaEmision) errores.push('Fecha de emisión');
    if (this.obtenerDetallesVenta().length === 0) errores.push('Productos');

    if (errores.length > 0) {
      this.mostrarWarning(`Complete: ${errores.join(', ')}`);
      return false;
    }
    return true;
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
  if (!this.validarDatosBasicos()) return;

  this.guardando = true;
  
  // Generar un nuevo número de factura para este intento
  this.venta.fact_Numero = this.generarNumeroFactura();
  console.log('Número de factura generado:', this.venta.fact_Numero);
  
  const detalles = this.obtenerDetallesVenta();
  
  // Aseguramos que las fechas estén en formato ISO y utilizamos el ID de registro CAI del vendedor si está disponible
  const sucursalId = this.venta.regC_Id; // ID de sucursal seleccionada en el formulario
  const regCIdVendedor = this.venta.regC_Id_Vendedor; // ID de registro CAI capturado del vendedor
  
  // Determinar qué ID de registro CAI usar
  const regCIdFinal = regCIdVendedor || sucursalId;
  console.log('ID de sucursal seleccionada:', sucursalId);
  console.log('ID de registro CAI del vendedor:', regCIdVendedor);
  console.log('ID de registro CAI final a enviar:', regCIdFinal);
  
  const datosEnviar = {
    ...this.venta,
    regC_Id: regCIdFinal, // Usamos el ID de registro CAI del vendedor si está disponible, sino el de la sucursal
    fact_FechaEmision: this.venta.fact_FechaEmision.toISOString(),
    fact_FechaLimiteEmision: this.venta.fact_FechaLimiteEmision.toISOString(),
    detallesFacturaInput: detalles
  };

  // Verifica en consola lo que se envía
  console.log('ID de sucursal seleccionada:', this.venta.regC_Id);
  console.log('Datos enviados al backend:', datosEnviar);

  // Enviar al backend
  this.http
    .post<any>(
      `${environment.apiBaseUrl}/Facturas/Insertar`, 
      datosEnviar,
      { headers: this.obtenerHeaders() }
    )
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
          }, 2000);
        } else {
          this.mostrarError('No se pudo obtener el ID de la venta');
        }
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error al guardar la venta:', err);
        this.mostrarError('Error al guardar la venta');
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

  /**
   * Genera un número de factura aleatorio con formato XXXXXXXX (8 dígitos)
   * Utiliza el prefijo del rango inicial autorizado y genera los dígitos restantes
   */
  private generarNumeroFactura(): string {
    // Prefijo base (puedes ajustarlo según tus necesidades)
    const prefijo = 'FACT-010';
    
    // Generar 5 dígitos aleatorios para completar el número
    const min = 10000;
    const max = 99999;
    const numeroAleatorio = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Combinar prefijo con número aleatorio
    return prefijo + numeroAleatorio.toString();
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