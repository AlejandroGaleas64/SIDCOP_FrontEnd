import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import {
  VentaInsertar,
  VentaDetalle,
} from 'src/app/Modelos/ventas/Facturas.model';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment.prod';
import { forkJoin } from 'rxjs';
import {
  obtenerUsuarioId,
  esAdministrador,
  obtenerPersonaId,
  obtenerSucursalId,
  obtenerRegCId,
} from 'src/app/core/utils/user-utils';
import Swal from 'sweetalert2';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
})
/**
 * Componente para la creación de ventas.
 * Permite seleccionar cliente, sucursal, productos, vendedor y registrar una nueva venta.
 * Incluye validaciones, manejo de inventario, ubicación, crédito y alertas.
 */
export class CreateComponent implements OnInit {
  // === Control de usuario y eventos ===
  esAdmin: boolean = false;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();
  guardandoVenta: boolean = false;

  // === Estados de UI y alertas ===
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // === Fechas y carga ===
  fechaActual = '';
  cargando = false;
  guardando = false;

  // === Navegación ===
  tabActivo = 1;
  puedeAvanzarAResumen = false;

  // === Datos maestros ===
  clientes: any[] = [];
  clientesFiltrados: any[] = [];
  sucursales: any[] = [];
  productos: any[] = [];
  vendedores: any[] = [];

  // === Selecciones del usuario ===
  clienteSeleccionado: number = 0;
  clienteActual: any = null;
  direccionesCliente: any[] = [];
  sucursalSeleccionada: number = 0;
  sucursalSeleccionadaAnterior: number = 0;

  // === Datos de la venta ===
  venta: VentaInsertar = new VentaInsertar();

  // === Crédito ===
  mostrarInfoCredito: boolean = false;

  // === Ubicación ===
  obteniendoUbicacion = false;
  errorUbicacion = '';

  // === Inventario ===
  inventarioSucursal: any[] = [];
  cargandoInventario = false;

  // === Productos (búsqueda y paginación) ===
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 12;

  // === Identificadores del usuario ===
  usuarioId: number = 0;

  /**
   * Constructor del componente. Inicializa el formulario y obtiene la fecha actual.
   * @param http Cliente HTTP para llamadas a la API
   */
  constructor(
    private http: HttpClient,
    private imageUploadService: ImageUploadService
  ) {
    this.inicializar();
  }

  /**
   * Inicializa el componente y carga datos iniciales, verifica el rol del usuario.
   */
  ngOnInit(): void {
    // Verificar si el usuario es administrador
    this.esAdmin = esAdministrador();
    this.usuarioId = obtenerUsuarioId();

    // Si no es administrador, asignar automáticamente la sucursal y el vendedor
    if (!this.esAdmin) {
      const sucursalId = obtenerSucursalId();
      if (sucursalId > 0) {
        this.sucursalSeleccionada = sucursalId;
      }

      const regCId = obtenerRegCId();
      if (regCId > 0) {
        this.venta.regC_Id = regCId;
        this.venta.regC_Id_Vendedor = regCId;
      }

      const personaId = obtenerPersonaId();
      if (personaId > 0) {
        this.venta.vend_Id = personaId;
      }
    }

    this.cargarDatosIniciales();
  }

  /**
   * Inicializa la venta con valores por defecto y obtiene la ubicación actual.
   */
  private inicializar(): void {
    const hoy = new Date();
    this.fechaActual = hoy.toISOString().split('T')[0];

    this.venta = new VentaInsertar({
      fact_Numero: '',
      fact_TipoDeDocumento: '01',
      regC_Id: 0,
      diCl_Id: 0,
      direccionId: 0,
      fact_TipoVenta: '',
      fact_FechaEmision: hoy,
      fact_Latitud: 0,
      fact_Longitud: 0,
      fact_Referencia: '',
      fact_AutorizadoPor: 'SISTEMA',
      vend_Id: 0,
      usua_Creacion: 1,
      detallesFacturaInput: [],
    });

    this.obtenerUbicacionActual();
  }

  /**
   * Carga los datos iniciales del sistema: sucursales, clientes, vendedores y productos.
   */
  private cargarDatosIniciales(): void {
    if (!this.esAdmin) {
      const sucursalId = obtenerSucursalId();
      this.sucursalSeleccionada = sucursalId;
      this.venta.regC_Id = obtenerRegCId();
      this.venta.vend_Id = obtenerPersonaId();

      if (sucursalId) {
        this.cargarVendedoresPorSucursal(sucursalId);
      }
    }

    this.cargando = true;
    const headers = { 'x-api-key': environment.apiKey };

    forkJoin({
      sucursales: this.http.get<any>(
        `${environment.apiBaseUrl}/Sucursales/Listar`,
        { headers }
      ),
      clientes: this.http.get<any[]>(
        `${environment.apiBaseUrl}/Cliente/Listar`,
        { headers }
      ),
      vendedores: this.http.get<any[]>(
        `${environment.apiBaseUrl}/Vendedores/ListarDDL`,
        { headers }
      ),
    }).subscribe({
      next: (data) => {
        this.sucursales = data.sucursales;
        this.clientes = data.clientes;
        this.vendedores = data.vendedores;
        this.cargando = false;
      },
      error: () => {
        this.mostrarError('Error al cargar datos iniciales');
        this.cargando = false;
      },
    });

    this.listarProductos();
  }

  /**
   * Carga los vendedores filtrados por sucursal.
   * @param sucursalId ID de la sucursal para filtrar vendedores
   */
  private cargarVendedoresPorSucursal(sucursalId: number): void {
    if (!sucursalId) return;

    const headers = this.obtenerHeaders();
    this.http
      .get<any[]>(
        `${environment.apiBaseUrl}/Vendedores/PorSucursal/${sucursalId}`,
        { headers }
      )
      .subscribe({
        next: (response) => {
          if (Array.isArray(response)) {
            if (!this.esAdmin && this.usuarioId) {
              const vendedorUsuario = response.find(
                (v) => v.vend_Id === this.usuarioId
              );
              this.venta.vend_Id = vendedorUsuario
                ? vendedorUsuario.vend_Id
                : response[0]?.vend_Id || 0;
            }
          }
        },
        error: () => {},
      });
  }

  /**
   * Carga la lista completa de productos desde la API.
   */
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

          if (this.sucursalSeleccionada && this.sucursalSeleccionada > 0) {
            this.cargarInventarioSucursal();
          }
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
          this.errorUbicacion =
            'No se pudo obtener la ubicación: ' + this.getErrorUbicacion(error);
        }
      );
    } else {
      this.obteniendoUbicacion = false;
      this.errorUbicacion =
        'La geolocalización no está soportada por este navegador';
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
   * Construye la URL completa para mostrar la imagen
   */
  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
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
      this.mostrarWarning(
        'No hay vendedores disponibles para la sucursal seleccionada'
      );
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
      .get<any[]>(
        `${environment.apiBaseUrl}/InventarioSucursales/Buscar/${this.sucursalSeleccionada}`,
        { headers }
      )
      .subscribe({
        next: (inventario) => {
          this.inventarioSucursal = inventario;
          this.actualizarStockProductos();
          this.validarProductosConStock();
          this.cargandoInventario = false;
        },
        error: () => {
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
      producto.stockDisponible = inventarioItem
        ? inventarioItem.inSu_Cantidad
        : 0;
      producto.tieneStock = producto.stockDisponible > 0;
    });
    this.aplicarFiltros();
  }

  private validarProductosConStock(): void {
    const productosConStock = this.productos.filter((p) => p.tieneStock);
    if (productosConStock.length === 0) {
      this.mostrarWarning(
        'La sucursal seleccionada no tiene productos disponibles'
      );
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

  /**
   * Captura el regC_Id del vendedor seleccionado.
   * Solo actualiza regC_Id si el usuario es administrador.
   * Siempre asigna regC_Id_Vendedor con el registro CAI del vendedor.
   */
  onVendedorChange(): void {
    if (!this.venta.vend_Id || this.venta.vend_Id === 0) return;

    const vendedorSeleccionado = this.vendedores.find(
      (v) => Number(v.vend_Id) === Number(this.venta.vend_Id)
    );

    if (!vendedorSeleccionado) return;

    let registroCAI: number | undefined;

    if (vendedorSeleccionado.regC_Id !== undefined) {
      registroCAI = vendedorSeleccionado.regC_Id;
    } else {
      const regCProperty = Object.keys(vendedorSeleccionado).find((key) =>
        key.toLowerCase().includes('regc')
      );
      if (regCProperty) {
        registroCAI = vendedorSeleccionado[regCProperty];
      }
    }

    if (registroCAI !== undefined) {
      this.venta.regC_Id_Vendedor = registroCAI;
      if (this.esAdmin) {
        this.venta.regC_Id = registroCAI;
      }
    }

    this.actualizarEstadoNavegacion();
  }

  /**
   * Filtra los vendedores por la sucursal seleccionada.
   */
  getVendedoresPorSucursal(): any[] {
    if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0) {
      return [];
    }
    return this.vendedores.filter(
      (vendedor) =>
        Number(vendedor.sucu_Id) === Number(this.sucursalSeleccionada)
    );
  }

  // ========== MÉTODOS PARA MANEJAR CANTIDADES EN RESUMEN (PESTAÑA 2) ==========

  aumentarCantidadEnResumen(prodId: number): void {
    const index = this.productos.findIndex((p) => p.prod_Id === prodId);
    if (index !== -1) {
      const producto = this.productos[index];
      if (producto.cantidad < producto.stockDisponible) {
        producto.cantidad++;
        this.actualizarEstadoNavegacion();
      }
    }
  }

  disminuirCantidadEnResumen(prodId: number): void {
    const index = this.productos.findIndex((p) => p.prod_Id === prodId);
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
        this.mostrarWarning(
          `El producto "${producto.prod_Descripcion}" no tiene stock`
        );
        producto.cantidad = 0;
        return;
      }

      if (cantidad > producto.stockDisponible) {
        this.mostrarWarning(
          `Stock insuficiente. Máximo: ${producto.stockDisponible}`
        );
        cantidad = producto.stockDisponible;
      }
    }

    producto.cantidad = cantidad;
    this.actualizarEstadoNavegacion();
  }

  // ========== CONTROL DE CANTIDADES ==========

  /**
   * Aumenta en 1 la cantidad del producto en la posición indicada (respecto a la página actual).
   * Valida stock, sucursal y límites.
   */
  aumentarCantidad(index: number): void {
    const productosPaginados = this.getProductosPaginados();
    if (index < 0 || index >= productosPaginados.length) return;

    const producto = productosPaginados[index];

    if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0) {
      this.mostrarWarning('Debe seleccionar una sucursal primero');
      return;
    }

    if (!producto.tieneStock) {
      this.mostrarWarning(
        `El producto "${producto.prod_Descripcion}" no tiene stock`
      );
      return;
    }

    if (producto.cantidad >= producto.stockDisponible) {
      this.mostrarWarning(
        `Stock insuficiente. Máximo: ${producto.stockDisponible}`
      );
      return;
    }

    producto.cantidad++;
    this.actualizarEstadoNavegacion();
  }

  /**
   * Disminuye en 1 la cantidad del producto en la posición indicada (si es mayor que 0).
   */
  disminuirCantidad(index: number): void {
    const productosPaginados = this.getProductosPaginados();
    if (
      index >= 0 &&
      index < productosPaginados.length &&
      productosPaginados[index].cantidad > 0
    ) {
      productosPaginados[index].cantidad--;
      this.actualizarEstadoNavegacion();
    }
  }

  /**
   * Valida y corrige la cantidad ingresada manualmente en el input.
   */
  validarCantidad(index: number): void {
    const productosPaginados = this.getProductosPaginados();
    if (index < 0 || index >= productosPaginados.length) return;

    const producto = productosPaginados[index];
    let cantidad = Math.max(0, Math.min(999, producto.cantidad || 0));

    if (cantidad > 0) {
      // Validar sucursal
      if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0) {
        this.mostrarWarning('Debe seleccionar una sucursal primero');
        producto.cantidad = 0;
        return;
      }

      // Validar stock
      if (!producto.tieneStock) {
        this.mostrarWarning(
          `El producto "${producto.prod_Descripcion}" no tiene stock`
        );
        producto.cantidad = 0;
        return;
      }

      // Validar límite de stock
      if (cantidad > producto.stockDisponible) {
        this.mostrarWarning(
          `Stock insuficiente. Máximo: ${producto.stockDisponible}`
        );
        cantidad = producto.stockDisponible;
      }
    }

    producto.cantidad = cantidad;
    this.actualizarEstadoNavegacion();
  }

  // ========== BÚSQUEDA Y PAGINACIÓN ==========

  /**
   * Aplica la búsqueda actual y restablece la página a 1.
   */
  buscarProductos(): void {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  /**
   * Limpia el término de búsqueda y restablece la lista de productos.
   */
  limpiarBusqueda(): void {
    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  /**
   * Aplica el filtro de búsqueda y ordena los productos:
   * Primero los que tienen stock, luego alfabéticamente.
   */
  private aplicarFiltros(): void {
    const termino = this.busquedaProducto.trim().toLowerCase();
    const productosFiltrados = termino
      ? this.productos.filter((p) =>
          p.prod_Descripcion.toLowerCase().includes(termino)
        )
      : [...this.productos];

    this.productosFiltrados = productosFiltrados.sort((a, b) => {
      const aEsImpulsado = a.impulsacion === 'Impulsado';
      const bEsImpulsado = b.impulsacion === 'Impulsado';
      const aTieneStock = a.tieneStock;
      const bTieneStock = b.tieneStock;

      // Primero: agrupar por "tiene stock" → los que tienen stock van primero
      if (aTieneStock && !bTieneStock) return -1;
      if (!aTieneStock && bTieneStock) return 1;

      // Segundo: dentro del mismo grupo de stock (con o sin), priorizar IMPULSADOS
      if (aTieneStock === bTieneStock) {
        if (aEsImpulsado && !bEsImpulsado) return -1;
        if (!aEsImpulsado && bEsImpulsado) return 1;
      }

      // Tercero: orden alfabético como desempate
      return a.prod_Descripcion.localeCompare(b.prod_Descripcion);
    });
  }
  /**
   * Devuelve los productos correspondientes a la página actual.
   */
  getProductosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    const fin = inicio + this.productosPorPagina;
    return this.productosFiltrados.slice(inicio, fin);
  }

  /**
   * Calcula el número total de páginas según la cantidad de productos filtrados.
   */
  getTotalPaginas(): number {
    return Math.ceil(this.productosFiltrados.length / this.productosPorPagina);
  }

  /**
   * Cambia a una página específica si está dentro del rango válido.
   */
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.getTotalPaginas()) {
      this.paginaActual = pagina;
    }
  }

  /**
   * Genera un array de números de página visibles para la paginación (máx. 5 páginas).
   */
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
      for (let i = actual - rango; i <= actual + rango; i++) {
        paginas.push(i);
      }
    }

    return paginas;
  }

  /**
   * Índice del primer producto mostrado en la página actual.
   */
  getInicioRegistro(): number {
    return (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  /**
   * Índice del último producto mostrado en la página actual.
   */
  getFinRegistro(): number {
    return Math.min(
      this.paginaActual * this.productosPorPagina,
      this.productosFiltrados.length
    );
  }

  // ========== NAVEGACIÓN ENTRE PESTAÑAS ==========

  /**
   * Cambia a la pestaña indicada si se cumplen las validaciones necesarias.
   */
  cambiarTab(tab: number): void {
    if (tab === 2 && !this.puedeAvanzarAResumen) {
      this.mostrarWarning('Complete los datos requeridos antes de continuar');
      return;
    }
    this.tabActivo = tab;
    this.limpiarAlertas();
  }

  /**
   * Intenta avanzar al resumen después de validar los datos básicos.
   */
  irAResumen(): void {
    this.mostrarErrores = true;
    if (this.validarDatosBasicos()) {
      this.puedeAvanzarAResumen = true;
      this.tabActivo = 2;
      this.limpiarAlertas();
    }
  }

  /**
   * Valida que los campos obligatorios estén completos antes de avanzar a resumen.
   */
  private validarDatosBasicos(): boolean {
    const errores: string[] = [];

    if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0)
      errores.push('Sucursal');
    if (!this.clienteSeleccionado || this.clienteSeleccionado === 0)
      errores.push('Cliente');
    if (!this.venta.direccionId || this.venta.direccionId === 0)
      errores.push('Dirección del cliente');
    if (!this.venta.vend_Id || this.venta.vend_Id === 0)
      errores.push('Vendedor');
    if (!this.venta.fact_TipoVenta)
      errores.push('Tipo de venta (Contado/Crédito)');
    if (!this.venta.fact_FechaEmision) errores.push('Fecha de emisión');

    const productosSeleccionados = this.getProductosSeleccionados();
    if (productosSeleccionados.length === 0)
      errores.push('Al menos un producto');

    if (errores.length > 0) {
      this.mostrarWarning(`Complete: ${errores.join(', ')}`);
      return false;
    }
    return true;
  }

  // ========== TIPO DE VENTA Y CRÉDITO ==========

  /**
   * Maneja el cambio de tipo de venta (Contado/Crédito).
   * Aplica validaciones de crédito si corresponde.
   */
  cambiarTipoVenta(): void {
    this.mostrarInfoCredito = this.venta.fact_TipoVenta === 'CR';

    if (this.venta.fact_TipoVenta === 'CR') {
      if (!this.puedeUsarCredito()) {
        this.mostrarWarning(
          'Este cliente no puede usar crédito. Verifique límite de crédito o saldo vencido.'
        );
        this.venta.fact_TipoVenta = 'CO';
        this.mostrarInfoCredito = false;
        return;
      }

      if (this.excedeCreditoDisponible()) {
        const totalVenta = this.getTotalGeneral();
        const saldoDisponible = this.getSaldoDisponible();
        this.mostrarWarning(
          `El total de la venta (L. ${totalVenta.toFixed(
            2
          )}) excede el crédito disponible (L. ${saldoDisponible.toFixed(2)})`
        );
        this.venta.fact_TipoVenta = 'CO';
        this.mostrarInfoCredito = false;
        return;
      }
    }

    this.actualizarEstadoNavegacion();
  }

  // ========== MÉTODOS AUXILIARES PARA RESUMEN ==========

  getNombreSucursal(): string {
    const sucursal = this.sucursales.find(
      (s) => s.sucu_Id == this.sucursalSeleccionada
    );
    return sucursal?.sucu_Descripcion || 'No seleccionada';
  }

  getNombreCliente(): string {
    const cliente = this.clientes.find(
      (c) => c.clie_Id == this.clienteSeleccionado
    );
    return cliente
      ? `${cliente.clie_NombreNegocio} - ${cliente.clie_Nombres} ${cliente.clie_Apellidos}`
      : 'No seleccionado';
  }

  getNombreDireccion(): string {
    const direccion = this.direccionesCliente.find(
      (d) => d.diCl_Id == this.venta.direccionId
    );
    return direccion?.diCl_DireccionExacta || 'No seleccionada';
  }

  getNombreVendedor(): string {
    const vendedor = this.vendedores.find(
      (v) => v.vend_Id == this.venta.vend_Id
    );
    return vendedor
      ? `${vendedor.vend_Nombres} ${vendedor.vend_Apellidos}`
      : 'No seleccionado';
  }

  // ========== MÉTODOS PARA INFORMACIÓN DE CRÉDITO ==========

  /**
   * Verifica si el cliente seleccionado tiene crédito habilitado.
   * @returns true si el cliente tiene crédito, false en caso contrario
   */
  tieneCredito(): boolean {
    if (!this.clienteActual) return false;
    // Un cliente tiene crédito si tiene límite de crédito o días de crédito
    return (
      this.clienteActual.clie_LimiteCredito > 0 ||
      this.clienteActual.clie_DiasCredito > 0
    );
  }

  /**
   * Verifica si el cliente puede usar crédito (tiene crédito y no tiene saldo vencido).
   * @returns true si el cliente puede usar crédito, false en caso contrario
   */
  puedeUsarCredito(): boolean {
    if (!this.tieneCredito()) return false;
    if (this.tieneSaldoVencido()) return false;
    return true;
  }

  /**
   * Verifica si el total de la venta excede el crédito disponible del cliente.
   * @returns true si el total excede el crédito disponible, false en caso contrario
   */
  excedeCreditoDisponible(): boolean {
    if (this.venta.fact_TipoVenta !== 'CR') return false;
    if (!this.clienteActual || !this.tieneCredito()) return true;

    const totalVenta = this.getTotalGeneral();
    const saldoDisponible = this.getSaldoDisponible();
    return totalVenta > saldoDisponible;
  }

  /**
   * Obtiene el límite de crédito del cliente seleccionado.
   * @returns Límite de crédito o 0 si no tiene
   */
  getLimiteCredito(): number {
    return this.clienteActual?.clie_LimiteCredito || 0;
  }

  /**
   * Obtiene los días de crédito del cliente seleccionado.
   * @returns Días de crédito o 0 si no tiene
   */
  getDiasCredito(): number {
    return this.clienteActual?.clie_DiasCredito || 0;
  }

  /**
   * Obtiene el saldo actual del cliente seleccionado.
   * @returns Saldo actual o 0 si no tiene
   */
  getSaldoCliente(): number {
    return this.clienteActual?.clie_Saldo || 0;
  }

  /**
   * Calcula el saldo disponible para crédito (límite - saldo actual).
   * @returns Saldo disponible (nunca negativo)
   */
  getSaldoDisponible(): number {
    if (!this.clienteActual) return 0;
    const limite = this.getLimiteCredito();
    const saldoActual = this.getSaldoCliente();
    return Math.max(0, limite - saldoActual);
  }

  /**
   * Verifica si el cliente tiene saldo vencido.
   * @returns true si tiene saldo vencido, false en caso contrario
   */
  tieneSaldoVencido(): boolean {
    return this.clienteActual?.clie_Vencido || false;
  }

  /**
   * Calcula el porcentaje del crédito disponible usado por la venta actual.
   * @returns Porcentaje redondeado a 1 decimal, máximo 100%
   */
  getPorcentajeCredito(): number {
    if (!this.clienteActual || !this.tieneCredito()) return 0;
    const saldoDisponible = this.getSaldoDisponible();
    if (saldoDisponible <= 0) return 100;

    const totalVenta = this.getTotalGeneral();
    if (totalVenta <= 0) return 0;

    const porcentaje = (totalVenta / saldoDisponible) * 100;
    return Math.min(100, Math.round(porcentaje * 10) / 10);
  }

  /**
   * Obtiene el estado del crédito basado en el porcentaje usado.
   * @returns 'Seguro', 'Precaución' o 'Límite'
   */
  getEstadoCredito(): string {
    const porcentaje = this.getPorcentajeCredito();
    if (porcentaje < 70) return 'Seguro';
    if (porcentaje < 90) return 'Precaución';
    return 'Límite';
  }

  // ========== CÁLCULOS FINANCIEROS ==========

  /**
   * Calcula el subtotal de la venta (suma de cantidad × precio unitario).
   * @returns Subtotal (sin impuestos)
   */
  getSubtotal(): number {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .reduce((total, p) => total + p.cantidad * p.prod_PrecioUnitario, 0);
  }

  /**
   * Calcula los impuestos (ISV 15%) sobre el subtotal.
   * @returns Total de impuestos
   */
  getImpuestos(): number {
    return this.getSubtotal() * 0.15;
  }

  /**
   * Calcula el total general de la venta (subtotal + impuestos).
   * @returns Total general
   */
  getTotalGeneral(): number {
    return this.getSubtotal() + this.getImpuestos();
  }

  // ========== DIRECCIONES DEL CLIENTE ==========

  /**
   * Carga las direcciones asociadas a un cliente específico.
   * @param clienteId ID del cliente seleccionado
   */
  cargarDireccionesCliente(clienteId: number): void {
    if (!clienteId || clienteId === 0) {
      this.direccionesCliente = [];
      this.venta.direccionId = 0;
      this.venta.diCl_Id = 0;
      this.venta.clie_Id = 0;
      this.clienteActual = null;
      return;
    }

    // Asignar el ID del cliente globalmente
    this.venta.clie_Id = clienteId;

    // Buscar y guardar información completa del cliente
    this.clienteActual = this.clientes.find((c) => c.clie_Id === clienteId);

    const headers = this.obtenerHeaders();
    this.http
      .get<any>(
        `${environment.apiBaseUrl}/DireccionesPorCliente/Buscar/${clienteId}`,
        { headers }
      )
      .subscribe({
        next: (response) => {
          if (response) {
            this.direccionesCliente = response;
            if (this.direccionesCliente.length > 0) {
              const primeraDireccion = this.direccionesCliente[0];
              this.venta.direccionId = primeraDireccion.diCl_Id;
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
        error: () => {
          this.direccionesCliente = [];
          this.venta.direccionId = 0;
          this.venta.diCl_Id = 0;
          this.mostrarError('Error al cargar direcciones del cliente');
        },
      });
  }

  /**
   * Actualiza el ID de la dirección seleccionada en el modelo de venta.
   * @param direccionId ID de la dirección del cliente
   */
  actualizarDireccionSeleccionada(direccionId: number): void {
    if (!direccionId || direccionId === 0) {
      this.venta.diCl_Id = 0;
      this.venta.direccionId = 0;
      return;
    }
    this.venta.diCl_Id = direccionId;
    this.venta.direccionId = direccionId;
    this.actualizarEstadoNavegacion();
  }

  // ========== PRODUCTOS SELECCIONADOS Y DETALLES ==========

  /**
   * Obtiene la cantidad total de productos seleccionados (suma de cantidades).
   * @returns Número total de unidades seleccionadas
   */
  getTotalProductosSeleccionados(): number {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .reduce((total, p) => total + p.cantidad, 0);
  }

  /**
   * Obtiene la lista de productos con cantidad mayor a cero.
   * @returns Array de productos seleccionados
   */
  getProductosSeleccionados(): any[] {
    return this.productos.filter((p) => p.cantidad > 0);
  }

  /**
   * Prepara los detalles de la venta en el formato esperado por el backend.
   * Solo incluye prod_Id y faDe_Cantidad.
   * @returns Array de objetos con { prod_Id, faDe_Cantidad }
   */
  obtenerDetallesVenta(): any[] {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .map((p) => ({
        prod_Id: p.prod_Id,
        faDe_Cantidad: p.cantidad,
      }));
  }

  // ========== ACTUALIZACIÓN DEL ESTADO DE NAVEGACIÓN ==========

  /**
   * Evalúa si el formulario está completo y válido para avanzar o permanecer en resumen.
   * Si se detectan errores, retrocede a la pestaña 1 y muestra advertencia.
   */
  private actualizarEstadoNavegacion(): void {
    // Solo validar si estamos en la pestaña de resumen
    if (this.tabActivo === 2) {
      const valido = this.validarDatosBasicos();
      this.puedeAvanzarAResumen = valido;

      if (!valido) {
        this.tabActivo = 1;
        this.mostrarWarning(
          'Se detectaron cambios. Complete los datos requeridos.'
        );
        return;
      }

      // Validar crédito si aplica
      if (
        this.venta.fact_TipoVenta === 'CR' &&
        this.excedeCreditoDisponible()
      ) {
        const totalVenta = this.getTotalGeneral();
        const saldoDisponible = this.getSaldoDisponible();
        this.mostrarWarning(
          `El total de la venta (L. ${totalVenta.toFixed(
            2
          )}) excede el crédito disponible (L. ${saldoDisponible.toFixed(2)})`
        );
      }
    }
  }

  // ========== LIMPIEZA Y ALERTAS ==========

  /**
   * Limpia completamente el formulario y restablece todos los estados.
   */
  private limpiarFormulario(): void {
    this.limpiarAlertas();

    // Reiniciar modelo de venta
    this.venta = new VentaInsertar({
      fact_Numero: '',
      fact_TipoDeDocumento: '01',
      regC_Id: this.esAdmin ? 0 : obtenerRegCId(), // Mantener regC_Id si no es admin
      diCl_Id: 0,
      direccionId: 0,
      fact_TipoVenta: '',
      fact_FechaEmision: new Date(),
      fact_Latitud: 0,
      fact_Longitud: 0,
      fact_Referencia: '',
      fact_AutorizadoPor: 'SISTEMA',
      vend_Id: this.esAdmin ? 0 : obtenerPersonaId(), // Mantener vendedor si no es admin
      usua_Creacion: this.usuarioId,
      detallesFacturaInput: [],
    });

    // Reiniciar selecciones de cliente
    this.clienteSeleccionado = 0;
    this.direccionesCliente = [];
    this.clienteActual = null;

    // Reiniciar cantidades y stock de productos (siempre se limpian)
    this.productos.forEach((p) => {
      p.cantidad = 0;
      // No se restablece stockDisponible ni tieneStock aquí porque podrían volver a usarse
      // si la sucursal no cambia (especialmente en modo no admin)
    });

    // Reiniciar navegación y paginación
    this.tabActivo = 1;
    this.puedeAvanzarAResumen = false;
    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();

    // Reiniciar inventario
    this.inventarioSucursal = [];

    // Manejo de sucursal según rol
    if (this.esAdmin) {
      this.sucursalSeleccionada = 0;
      this.sucursalSeleccionadaAnterior = 0;
    } else {
      const sucursalId = obtenerSucursalId();
      this.sucursalSeleccionada = sucursalId;
      this.sucursalSeleccionadaAnterior = sucursalId;

      // Si ya hay productos y una sucursal, recargar inventario
      if (this.productos.length > 0 && sucursalId > 0) {
        this.cargarInventarioSucursal();
      }
    }

    // Reiniciar ubicación
    this.obtenerUbicacionActual();
  }

  /**
   * Oculta todas las alertas activas.
   */
  private limpiarAlertas(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  /**
   * Maneja el cambio de fecha de emisión desde el input HTML.
   * @param event Evento del input de tipo date
   */
  onFechaEmisionChange(event: any): void {
    const value = event.target.value; // Formato "YYYY-MM-DD"
    this.venta.fact_FechaEmision = value ? new Date(value) : new Date(); // Valor por defecto si está vacío
  }

  // ========== ACCIONES FINALES ==========

  /**
   * Cancela la creación de la venta y emite el evento de cancelación.
   */
  cancelar(): void {
    this.limpiarFormulario();
    this.onCancel.emit();
  }

  /**
   * Cierra cualquier alerta activa.
   */
  cerrarAlerta(): void {
    this.limpiarAlertas();
  }

  /**
   * Inicia el proceso de guardado de la venta.
   * Solicita ubicación actual y luego llama a `crearVenta`.
   */
  guardar(): void {
    this.guardandoVenta = true;
    this.mostrarErrores = true;
    if (!this.validarFormularioCompleto()) {
      this.tabActivo = 1;
      this.guardandoVenta = false;
      return;
    }
    this.limpiarAlertas();
    this.obteniendoUbicacion = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.venta.fact_Latitud = position.coords.latitude;
          this.venta.fact_Longitud = position.coords.longitude;
          this.obteniendoUbicacion = false;
          this.crearVenta();
        },
        (error) => {
          this.obteniendoUbicacion = false;
          this.errorUbicacion =
            'No se pudo obtener la ubicación: ' + this.getErrorUbicacion(error);
          this.crearVenta(); // Continuar igual sin ubicación
        },
        { timeout: 5000 }
      );
    } else {
      this.obteniendoUbicacion = false;
      this.errorUbicacion =
        'La geolocalización no está soportada por este navegador';
      this.crearVenta();
    }
  }

  /**
   * Valida todo el formulario antes del envío final.
   * Incluye validaciones adicionales de crédito y campos obligatorios.
   */
  private validarFormularioCompleto(): boolean {
    const errores: string[] = [];

    if (!this.sucursalSeleccionada || this.sucursalSeleccionada === 0)
      errores.push('Sucursal');
    if (!this.clienteSeleccionado || this.clienteSeleccionado === 0)
      errores.push('Cliente');
    if (!this.venta.direccionId || this.venta.direccionId === 0)
      errores.push('Dirección del cliente');
    if (!this.venta.fact_TipoVenta) errores.push('Tipo de venta');
    if (!this.venta.fact_FechaEmision) errores.push('Fecha de emisión');
    if (this.obtenerDetallesVenta().length === 0) errores.push('Productos');

    // Validación específica de crédito
    if (this.venta.fact_TipoVenta === 'CR' && this.excedeCreditoDisponible()) {
      const totalVenta = this.getTotalGeneral();
      const saldoDisponible = this.getSaldoDisponible();
      this.mostrarWarning(
        `El total de la venta (L. ${totalVenta.toFixed(
          2
        )}) excede el crédito disponible (L. ${saldoDisponible.toFixed(2)})`
      );
      return false;
    }

    if (errores.length > 0) {
      this.mostrarWarning(`Complete: ${errores.join(', ')}`);
      return false;
    }
    return true;
  }

  /**
   * Crea la venta en el backend con todos los datos validados y formateados.
   */
  private crearVenta(): void {
    const detalles = this.obtenerDetallesVenta();

    const datosEnviar = {
      fact_Numero: '',
      fact_TipoDeDocumento: '01',
      regC_Id: Number(this.venta.regC_Id),
      sucu_Id: Number(this.sucursalSeleccionada),
      diCl_Id: this.venta.diCl_Id,
      direccionId: this.venta.direccionId,
      vend_Id: Number(this.venta.vend_Id),
      fact_TipoVenta: this.venta.fact_TipoVenta,
      fact_FechaEmision: this.venta.fact_FechaEmision.toISOString(),
      fact_Latitud: this.venta.fact_Latitud || 0,
      fact_Longitud: this.venta.fact_Longitud || 0,
      fact_Referencia: this.venta.fact_Referencia || 'Venta desde app web',
      fact_AutorizadoPor: 'SISTEMA',
      usua_Creacion: this.usuarioId,
      detallesFacturaInput: detalles,
    };

    // Validaciones críticas antes de enviar
    if (!datosEnviar.diCl_Id || datosEnviar.diCl_Id === 0) {
      this.mostrarError(
        'No se ha seleccionado una dirección de cliente válida'
      );
      this.guardandoVenta = false;
      return;
    }
    if (!datosEnviar.regC_Id || datosEnviar.regC_Id === 0) {
      this.mostrarError('No se ha seleccionado un registro CAI válido');
      this.guardandoVenta = false;
      return;
    }
    if (!datosEnviar.sucu_Id || datosEnviar.sucu_Id === 0) {
      this.mostrarError('No se ha seleccionado una sucursal válida');
      this.guardandoVenta = false;
      return;
    }

    this.guardando = true;
    this.http
      .post<any>(
        `${environment.apiBaseUrl}/Facturas/InsertarEnSucursal`,
        datosEnviar,
        { headers: this.obtenerHeaders() }
      )
      .subscribe({
        next: (response) => {
          this.guardando = false;
          const id = this.extraerId(response);
          if (id > 0) {
            this.mostrarExito(
              `Venta guardada con éxito (${detalles.length} productos). Mostrando detalles...`
            );
            setTimeout(() => {
              this.limpiarFormulario();

              this.onSave.emit({
                fact_Id: id,
                action: 'detalles',
                mostrarDetalles: true,
              });
              this.guardandoVenta = false;
            }, 2000);
          } else {
            this.mostrarError('No se pudo obtener el ID de la venta');
            this.guardandoVenta = false;
          }
        },
        error: (err) => {
          this.guardando = false;
          this.guardandoVenta = false;
          let mensajeError = 'Error desconocido al guardar la venta';

          if (err.error?.message) {
            mensajeError = err.error.message;
          } else if (typeof err.error === 'string') {
            try {
              const parsed = JSON.parse(err.error);
              mensajeError = parsed.message || err.error;
            } catch {
              mensajeError = err.error;
            }
          } else if (err.message) {
            mensajeError = err.message;
          }

          this.mostrarError(mensajeError);
          this.guardandoVenta = false;
        },
      });
  }

  /**
   * Extrae el ID de la factura desde la respuesta del backend.
   */
  private extraerId(response: any): number {
    const data = response?.data;
    if (!data || data.code_Status !== 1) return 0;

    // Buscar en mensaje: "ID: 123"
    const match = data.message_Status?.match(/ID:\s*(\d+)/i);
    if (match?.[1]) return parseInt(match[1], 10);

    // Fallback a campos conocidos
    return data.fact_Id || data.Fact_Id || data.id || 0;
  }

  /**
   * Obtiene los encabezados HTTP estándar para las peticiones.
   */
  private obtenerHeaders(): any {
    return {
      'X-Api-Key': environment.apiKey,
      'Content-Type': 'application/json',
      accept: '*/*',
    };
  }

  /**
   * Muestra una alerta de éxito.
   */
  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mostrarAlertaExito = true;
  }

  /**
   * Muestra una alerta de error (desaparece en 5 segundos).
   */
  private mostrarError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mostrarAlertaError = true;
    setTimeout(() => this.limpiarAlertas(), 5000);
  }

  /**
   * Muestra una advertencia (desaparece en 4 segundos).
   */
  private mostrarWarning(mensaje: string): void {
    this.mensajeWarning = mensaje;
    this.mostrarAlertaWarning = true;
    setTimeout(() => this.limpiarAlertas(), 4000);
  }
}
