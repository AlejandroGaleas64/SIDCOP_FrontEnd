import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VentaInsertar, VentaDetalle } from 'src/app/Modelos/ventas/Facturas.model';
import { environment } from 'src/environments/environment';
import {obtenerUsuarioId} from 'src/app/core/utils/user-utils';
@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
})
export class CreateComponent implements OnInit {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<VentaInsertar>();

  // Estados de alertas
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  fechaActual = '';

  // Control de tabs
  tabActivo = 1;
  puedeAvanzarAResumen = false;

  // Datos del formulario
  venta: VentaInsertar = new VentaInsertar();
  sucursales: any[] = [];
  productos: any[] = [];
  usuarioId: number = 0;
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
    this.fechaActual = new Date().toISOString().split('T')[0];
    this.venta.fact_FechaEmision = new Date();
    this.venta.fact_FechaLimiteEmision = new Date();
    this.venta.usua_Creacion = this.usuarioId;
  }

  private cargarDatosIniciales(): void {
    const headers = { 'x-api-key': environment.apiKey };

    // Cargar sucursales
    this.http
      .get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, { headers })
      .subscribe({
        next: (data) => {
          this.sucursales = data;
        },
        error: (error) => {
          this.mostrarError('Error al cargar las sucursales');
          console.error('Error:', error);
        },
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

  // ========== INVENTARIO POR SUCURSAL ==========
  onSucursalChange(): void {
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

  private crearVenta(): void {
    const detalles = this.obtenerDetallesVenta();

    const datos = {
      ...this.venta,
      fact_FechaEmision: new Date(this.venta.fact_FechaEmision).toISOString(),
      fact_FechaLimiteEmision: new Date(this.venta.fact_FechaLimiteEmision).toISOString(),
      usua_Creacion: environment.usua_Id,
      detallesFacturaInput: detalles,
    };

    this.http
      .post<any>(`${environment.apiBaseUrl}/VentaInsertar/Insertar`, datos, {
        headers: this.obtenerHeaders(),
      })
      .subscribe({
        next: (response) => {
          const id = this.extraerId(response);
          if (id > 0) {
            this.mostrarExito(`Venta guardada con éxito (${detalles.length} productos)`);
            setTimeout(() => {
              this.onSave.emit(this.venta);
              this.cancelar();
            }, 3000);
          } else {
            this.mostrarError('No se pudo obtener el ID de la venta');
          }
        },
        error: () => this.mostrarError('Error al guardar la venta'),
      });
  }

  private extraerId(response: any): number {
    const data = response?.data;
    if (!data || data.code_Status !== 1) return 0;
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