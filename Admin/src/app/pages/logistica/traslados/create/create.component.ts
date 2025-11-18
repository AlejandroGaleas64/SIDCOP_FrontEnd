import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Traslado } from 'src/app/Modelos/logistica/TrasladoModel';
import { environment } from 'src/environments/environment';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent implements OnInit {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Traslado>();
  
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
  traslado: Traslado = new Traslado();
  origenes: any[] = [];
  destinos: any[] = [];
  productos: any[] = [];
  recargas: any[] = [];

  // ========== NUEVAS PROPIEDADES PARA INVENTARIO ==========
  inventarioSucursal: any[] = [];
  cargandoInventario = false;
  origenSeleccionadoAnterior: number = 0;

  // ========== PROPIEDADES PARA BÚSQUEDA Y PAGINACIÓN ==========
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 12;

  // ========== PROPIEDADES PARA RECARGAS ==========
  cargandoRecargas = false;
  recargaSeleccionada: any = null;

  /**
   * Constructor del componente
   * @param http - Cliente HTTP para realizar peticiones al API
   */
  constructor(private http: HttpClient) {
    this.inicializar();
  }

  /**
   * Inicializa el componente y carga la lista de productos
   */
  ngOnInit(): void {
    this.listarProductos();
  }

  /**
   * Inicializa el componente configurando fecha actual y cargando datos iniciales
   */
  private inicializar(): void {
    this.inicializarFechaActual();
    this.cargarDatosIniciales();
  }

  /**
   * Establece la fecha actual como fecha por defecto del traslado
   */
  private inicializarFechaActual(): void {
    const hoy = new Date();
    this.fechaActual = hoy.toISOString().split('T')[0];
    this.traslado.tras_Fecha = hoy;
  }

  /**
   * Carga los datos iniciales necesarios: sucursales, bodegas y recargas
   * Utiliza forkJoin para realizar las peticiones en paralelo
   */
  private cargarDatosIniciales(): void {
    this.cargandoRecargas = true;
    const headers = { 'x-api-key': environment.apiKey };
    
    forkJoin({
      origenes: this.http.get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, { headers }),
      destinos: this.http.get<any>(`${environment.apiBaseUrl}/Bodega/Listar`, { headers }),
      recargas: this.http.get<any>(`${environment.apiBaseUrl}/Recargas/Listar`, { headers })
    }).subscribe({
      next: (data) => {
        this.origenes = data.origenes;
        this.destinos = data.destinos;
        this.recargas = data.recargas;
        this.cargandoRecargas = false;
      },
      error: (error) => {
        this.mostrarError('Error al cargar datos iniciales');
        this.cargandoRecargas = false;
        console.error('Error cargando datos iniciales:', error);
      }
    });
  }

  /**
   * Maneja el cambio del switch de recarga
   * Limpia los campos relacionados cuando se activa/desactiva
   */
  onEsRecargaChange(): void {
    if (!this.traslado.tras_EsRecarga) {
      // Si se desactiva el switch, limpiar la recarga seleccionada y el destino
      this.traslado.reca_Id = 0;
      this.traslado.tras_Destino = 0;
      this.recargaSeleccionada = null;
    } else {
      // Si se activa el switch, limpiar el destino para que se establezca automáticamente
      this.traslado.tras_Destino = 0;
    }
  }

  // ========== MÉTODOS PARA MANEJO DE RECARGAS ==========

  /**
   * Maneja el cambio de recarga seleccionada
   * Establece automáticamente el destino según la recarga
   */
 onRecargaChange(): void {
  if (this.traslado.reca_Id && this.traslado.reca_Id > 0) {
    this.recargaSeleccionada = this.recargas.find(r => r.reca_Id == this.traslado.reca_Id);
    //console.log('Recarga seleccionada:', this.recargaSeleccionada);
    
    // Si es una recarga y se seleccionó una, establecer automáticamente el destino
    if (this.traslado.tras_EsRecarga && this.recargaSeleccionada && this.recargaSeleccionada.bode_Id) {
      this.traslado.tras_Destino = this.recargaSeleccionada.bode_Id;
 
      const destinoEncontrado = this.destinos.find(d => d.bode_Id == this.recargaSeleccionada.bode_Id);

    }
  } else {
    this.recargaSeleccionada = null;
    // Si es una recarga pero no hay recarga seleccionada, limpiar destino
    if (this.traslado.tras_EsRecarga) {
      this.traslado.tras_Destino = 0;
    }
  }
}

  /**
   * Obtiene el nombre del destino automático para recargas
   * @returns Nombre del destino o cadena vacía
   */
  getNombreDestinoAutomatico(): string {
    if (this.traslado.tras_EsRecarga && this.recargaSeleccionada && this.recargaSeleccionada.bode_Id) {
      const destino = this.destinos.find(d => d.bode_Id === this.recargaSeleccionada.bode_Id);
      return destino ? destino.bode_Descripcion : 'Destino de recarga';
    }
    return '';
  }

  /**
   * Obtiene el nombre de la recarga seleccionada
   * @returns Nombre de la recarga o 'No seleccionada'
   */
  getNombreRecarga(): string {
    if (this.recargaSeleccionada) {
      return this.recargaSeleccionada.recarga;
    }
    const recarga = this.recargas.find(r => r.reca_Id === this.traslado.reca_Id);
    return recarga ? recarga.recarga : 'No seleccionada';
  }

  /**
   * Verifica si hay una recarga seleccionada válida
   * @returns true si hay recarga seleccionada, false en caso contrario
   */
  tieneRecargaSeleccionada(): boolean {
    return typeof this.traslado.reca_Id === 'number' && this.traslado.reca_Id > 0;
  }

  /**
   * Carga la lista de productos desde el API
   * Inicializa propiedades adicionales para manejo de inventario
   */
  listarProductos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.productos = data.map((producto: any) => ({
          ...producto,
          cantidad: 0,
          observaciones: '',
          stockDisponible: 0, // Stock disponible en la sucursal seleccionada
          tieneStock: false,   // Si tiene stock en la sucursal
          excedioStock: false  // Nueva propiedad
        }));
        this.aplicarFiltros();
      },
      error: () => this.mostrarError('Error al cargar productos')
    });
  }

  // ========== MÉTODOS PARA MANEJO DE INVENTARIO ==========

  /**
   * Maneja el cambio de sucursal de origen
   * Limpia cantidades y recarga el inventario de la nueva sucursal
   */
  onOrigenChange(): void {
    // Si cambió la sucursal, limpiar cantidades seleccionadas
    if (this.origenSeleccionadoAnterior !== this.traslado.tras_Origen) {
      this.limpiarCantidadesSeleccionadas();
      this.origenSeleccionadoAnterior = this.traslado.tras_Origen;
    }

    if (this.traslado.tras_Origen && this.traslado.tras_Origen > 0) {
      this.cargarInventarioSucursal();
    } else {
      this.limpiarInventario();
    }
  }

  /**
   * Carga el inventario disponible en la sucursal seleccionada
   * Actualiza el stock disponible de cada producto
   */
  private cargarInventarioSucursal(): void {
    this.cargandoInventario = true;
    this.limpiarAlertas();
    
    const headers = { 'x-api-key': environment.apiKey };
    
    this.http.get<any[]>(`${environment.apiBaseUrl}/InventarioSucursales/Buscar/${this.traslado.tras_Origen}`, { headers })
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
        }
      });
  }

  /**
   * Actualiza el stock disponible de cada producto según el inventario de la sucursal
   * Marca los productos que tienen stock disponible
   */
  private actualizarStockProductos(): void {
    this.productos.forEach(producto => {
      const inventarioItem = this.inventarioSucursal.find(inv => inv.prod_Id === producto.prod_Id);
      
      if (inventarioItem) {
        producto.stockDisponible = inventarioItem.inSu_Cantidad;
        producto.tieneStock = inventarioItem.inSu_Cantidad > 0;
      } else {
        producto.stockDisponible = 0;
        producto.tieneStock = false;
      }
    });
    
    this.aplicarFiltros(); // Refiltrar productos
  }

  /**
   * Valida si la sucursal tiene productos con stock disponible
   * Muestra advertencia si no hay productos disponibles
   */
  private validarProductosConStock(): void {
    const productosConStock = this.productos.filter(p => p.tieneStock);
    
    if (productosConStock.length === 0) {
      this.mostrarWarning('La sucursal seleccionada no tiene productos disponibles en inventario');
    }
  }

  /**
   * Limpia las cantidades seleccionadas de todos los productos
   * Se ejecuta cuando cambia la sucursal de origen
   */
  private limpiarCantidadesSeleccionadas(): void {
    this.productos.forEach(producto => {
      producto.cantidad = 0;
    });
    this.actualizarEstadoNavegacion();
  }

  /**
   * Limpia todos los datos de inventario y resetea el stock de productos
   */
  private limpiarInventario(): void {
    this.inventarioSucursal = [];
    this.productos.forEach(producto => {
      producto.stockDisponible = 0;
      producto.tieneStock = false;
    });
  }

  /**
   * Obtiene el stock disponible de un producto específico
   * @param prodId - ID del producto
   * @returns Cantidad de stock disponible
   */
  getStockDisponible(prodId: number): number {
    const producto = this.productos.find(p => p.prod_Id === prodId);
    return producto ? producto.stockDisponible : 0;
  }

  /**
   * Verifica si un producto tiene stock disponible en la sucursal
   * @param prodId - ID del producto
   * @returns true si tiene stock, false en caso contrario
   */
  tieneStockDisponible(prodId: number): boolean {
    const producto = this.productos.find(p => p.prod_Id === prodId);
    return producto ? producto.tieneStock : false;
  }

  // ========== MÉTODOS DE CANTIDAD CON VALIDACIÓN DE INVENTARIO ==========
  
  /**
   * Aumenta la cantidad de un producto validando stock disponible
   * @param index - Índice del producto en el array
   */
  aumentarCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length) {
      const producto = this.productos[index];
      
      // Validar que hay sucursal seleccionada
      if (!this.traslado.tras_Origen || this.traslado.tras_Origen === 0) {
        this.mostrarWarning('Debe seleccionar una sucursal de origen primero');
        return;
      }

      // Validar que el producto tiene stock
      if (!producto.tieneStock) {
        this.mostrarWarning(`El producto "${producto.prod_Descripcion}" no tiene stock disponible en esta sucursal`);
        return;
      }

      // Validar que no exceda el stock disponible
      if (producto.cantidad >= producto.stockDisponible) {
        this.mostrarWarning(`Stock insuficiente. Solo hay ${producto.stockDisponible} unidades disponibles de "${producto.prod_Descripcion}"`);
        return;
      }

      producto.cantidad = (producto.cantidad || 0) + 1;
      this.actualizarEstadoNavegacion();
    }
  }
  
  /**
   * Disminuye la cantidad de un producto
   * @param index - Índice del producto en el array
   */
  disminuirCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length && this.productos[index].cantidad > 0) {
      this.productos[index].cantidad--;
      this.actualizarEstadoNavegacion();
    }
  }
  
 /**
 * Valida y ajusta la cantidad ingresada manualmente para un producto
 * @param index - Índice del producto en el array
 */
validarCantidad(index: number): void {
  if (index >= 0 && index < this.productos.length) {
    const producto = this.productos[index];
    let cantidad = producto.cantidad || 0;

    // Validar rango básico
    cantidad = Math.max(0, Math.min(999, cantidad));

    // Validar contra stock disponible
    if (cantidad > 0) {
      // Validar que hay sucursal seleccionada
      if (!this.traslado.tras_Origen || this.traslado.tras_Origen === 0) {
        this.mostrarWarning('Debe seleccionar una sucursal de origen primero');
        producto.cantidad = 0;
        producto.excedioStock = false;
        return;
      }

      // Validar que el producto tiene stock
      if (!producto.tieneStock) {
        this.mostrarWarning(`El producto "${producto.prod_Descripcion}" no tiene stock disponible en esta sucursal`);
        producto.cantidad = 0;
        producto.excedioStock = false;
        return;
      }

      // Validar que no exceda el stock disponible
      if (cantidad > producto.stockDisponible) {
        this.mostrarWarning(`Stock insuficiente. Solo hay ${producto.stockDisponible} unidades disponibles de "${producto.prod_Descripcion}"`);
        cantidad = producto.stockDisponible;
      }
    }

    producto.cantidad = cantidad;
    producto.excedioStock = false; // Limpiar el flag después de ajustar
    this.actualizarEstadoNavegacion();
  }
}

  /**
 * Valida la cantidad mientras el usuario escribe en el input
 * @param index - Índice del producto en el array
 * @param event - Evento del input
 */
validarCantidadInput(index: number, event: any): void {
  if (index >= 0 && index < this.productos.length) {
    const producto = this.productos[index];
    let valor = parseInt(event.target.value) || 0;
    
    // Validar que no sea negativo
    if (valor < 0) {
      valor = 0;
    }
    
    // Limitar a 999 como máximo general
    if (valor > 999) {
      valor = 999;
    }
    
    // Marcar si excede el stock (sin limitar aún, solo marcar)
    producto.excedioStock = producto.tieneStock && valor > producto.stockDisponible;
    
    // Actualizar el valor temporalmente (la validación final se hará en blur)
    producto.cantidad = valor;
    
    // Actualizar estado de navegación
    this.actualizarEstadoNavegacion();
  }
}

  // ========== MÉTODOS PARA BÚSQUEDA Y PAGINACIÓN ==========

  /**
   * Ejecuta la búsqueda de productos y resetea la paginación
   */
  buscarProductos(): void {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  /**
   * Limpia el filtro de búsqueda y muestra todos los productos
   */
  limpiarBusqueda(): void {
    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  /**
   * Aplica los filtros de búsqueda a la lista de productos
   */
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

  /**
   * Obtiene la lista de productos filtrados
   * @returns Array de productos filtrados
   */
  getProductosFiltrados(): any[] {
    return this.productosFiltrados;
  }

  /**
   * Obtiene los productos de la página actual
   * @returns Array de productos paginados
   */
  getProductosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    const fin = inicio + this.productosPorPagina;
    return this.productosFiltrados.slice(inicio, fin);
  }

  /**
   * Calcula el número total de páginas
   * @returns Número total de páginas
   */
  getTotalPaginas(): number {
    return Math.ceil(this.productosFiltrados.length / this.productosPorPagina);
  }

  /**
   * Cambia a una página específica
   * @param pagina - Número de página a mostrar
   */
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.getTotalPaginas()) {
      this.paginaActual = pagina;
    }
  }

  /**
   * Calcula las páginas visibles en el paginador
   * @returns Array con los números de página a mostrar
   */
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

  /**
   * Obtiene el número del primer registro de la página actual
   * @returns Número del primer registro
   */
  getInicioRegistro(): number {
    return (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  /**
   * Obtiene el número del último registro de la página actual
   * @returns Número del último registro
   */
  getFinRegistro(): number {
    const fin = this.paginaActual * this.productosPorPagina;
    return Math.min(fin, this.productosFiltrados.length);
  }

  /**
   * Obtiene el índice de un producto en el array por su ID
   * @param prodId - ID del producto
   * @returns Índice del producto o -1 si no se encuentra
   */
  getProductoIndex(prodId: number): number {
    return this.productos.findIndex(p => p.prod_Id === prodId);
  }

  // ========== MÉTODOS DE NAVEGACIÓN DE TABS ==========
  
  /**
   * Cambia entre las pestañas del formulario
   * @param tab - Número de pestaña a activar
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
   * Navega a la pestaña de resumen validando los datos básicos
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
   * Valida que los datos básicos del traslado estén completos
   * @returns true si los datos son válidos, false en caso contrario
   */
  private validarDatosBasicos(): boolean {
    const errores = [];
    
    if (!this.traslado.tras_Origen || this.traslado.tras_Origen == 0) {
      errores.push('Origen');
    }
    if (!this.traslado.tras_Destino || this.traslado.tras_Destino == 0) {
      errores.push('Destino');
    }
    if (!this.traslado.tras_Fecha) {
      errores.push('Fecha');
    }
    
    // Validar recarga (solo si tras_EsRecarga es true)
    if (this.traslado.tras_EsRecarga && (!this.traslado.reca_Id || this.traslado.reca_Id == 0)) {
      errores.push('Recarga');
    }
    
    const productosSeleccionados = this.getProductosSeleccionados();
    if (productosSeleccionados.length === 0) {
      errores.push('Al menos un producto');
    }
    
    if (errores.length > 0) {
      this.mostrarWarning(`Complete los campos: ${errores.join(', ')}`);
      return false;
    }
    
    return true;
  }

  // ========== MÉTODOS PARA EL RESUMEN ==========

  /**
   * Obtiene el nombre de la sucursal de origen seleccionada
   * @returns Nombre de la sucursal o 'No seleccionado'
   */
  getNombreOrigen(): string {
    const origen = this.origenes.find(o => o.sucu_Id == this.traslado.tras_Origen);
    return origen ? origen.sucu_Descripcion : 'No seleccionado';
  }

  /**
   * Obtiene el nombre de la bodega de destino seleccionada
   * @returns Nombre de la bodega o 'No seleccionado'
   */
  getNombreDestino(): string {
    const destino = this.destinos.find(d => d.bode_Id == this.traslado.tras_Destino);
    return destino ? destino.bode_Descripcion : 'No seleccionado';
  }

  /**
   * Calcula el total de unidades seleccionadas de todos los productos
   * @returns Número total de unidades
   */
  getTotalProductosSeleccionados(): number {
    return this.productos
      .filter(producto => producto.cantidad > 0)
      .reduce((total, producto) => total + producto.cantidad, 0);
  }

  /**
   * Obtiene la lista de productos que tienen cantidad seleccionada
   * @returns Array de productos seleccionados
   */
  getProductosSeleccionados(): any[] {
    return this.productos.filter(producto => producto.cantidad > 0);
  }

  private actualizarEstadoNavegacion(): void {
    if (this.tabActivo === 2) {
      this.puedeAvanzarAResumen = this.validarDatosBasicos();
      if (!this.puedeAvanzarAResumen) {
        this.tabActivo = 1;
        this.mostrarWarning('Se detectaron cambios. Complete los datos requeridos.');
      }
    }
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

  // ========== MÉTODOS DE ACCIONES PRINCIPALES ==========

  /**
   * Cancela la creación del traslado y limpia el formulario
   */
  cancelar(): void {
    this.limpiarFormulario();
    this.onCancel.emit();
  }

  /**
   * Cierra todas las alertas activas
   */
  cerrarAlerta(): void {
    this.limpiarAlertas();
  }

  /**
   * Guarda el traslado validando todos los datos
   */
  guardar(): void {
    this.mostrarErrores = true;
    const productosSeleccionados = this.obtenerProductosSeleccionados();
    
    if (!this.validarFormularioCompleto(productosSeleccionados)) {
      this.tabActivo = 1;
      return;
    }
    
    this.limpiarAlertas();
    this.crearTraslado(productosSeleccionados);
  }

  // ========== MÉTODOS PRIVADOS ==========

  private limpiarFormulario(): void {
    this.limpiarAlertas();
    this.traslado = new Traslado();
    this.productos.forEach(p => { 
      p.cantidad = 0; 
      p.observaciones = '';
      p.stockDisponible = 0;
      p.tieneStock = false;
      p.excedioStock = false;
    });
    this.inicializarFechaActual();
    
    // Resetear estado de tabs
    this.tabActivo = 1;
    this.puedeAvanzarAResumen = false;
    
    // Resetear búsqueda y paginación
    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();

    // Resetear inventario y recargas
    this.inventarioSucursal = [];
    this.origenSeleccionadoAnterior = 0;
    this.recargaSeleccionada = null;
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

  private validarFormularioCompleto(productos: any[]): boolean {
  const errores = [];
  
  if (!this.traslado.tras_Origen || this.traslado.tras_Origen == 0) errores.push('Origen');
  if (!this.traslado.tras_Destino || this.traslado.tras_Destino == 0) errores.push('Destino');
  if (!this.traslado.tras_Fecha) errores.push('Fecha');
  
  // Solo validar recarga si tras_EsRecarga es true
  if (this.traslado.tras_EsRecarga && (!this.traslado.reca_Id || this.traslado.reca_Id == 0)) {
    errores.push('Recarga');
  }
  
  if (productos.length === 0) errores.push('Al menos un producto');
  
  if (errores.length > 0) {
    this.mostrarWarning(`Complete los campos: ${errores.join(', ')}`);
    return false;
  }
  return true;
}

  private crearTraslado(productos: any[]): void {
    const origen = this.origenes.find(o => o.sucu_Id == this.traslado.tras_Origen);
    const destino = this.destinos.find(d => d.bode_Id == this.traslado.tras_Destino);
    const recarga = this.recargas.find(r => r.reca_Id == this.traslado.reca_Id);
    
    const datos = {
      tras_Id: 0,
      tras_Origen: Number(this.traslado.tras_Origen),
      origen: origen?.sucu_Descripcion || '',
      tras_Destino: Number(this.traslado.tras_Destino),
      destino: destino?.bode_Descripcion || '',
      tras_Fecha: new Date(this.traslado.tras_Fecha).toISOString(),
      tras_Observaciones: this.traslado.tras_Observaciones || '',
      reca_Id: this.traslado.tras_EsRecarga ? 
             (this.traslado.reca_Id && this.traslado.reca_Id > 0 ? Number(this.traslado.reca_Id) : null) : 
             null,
      recarga: recarga?.recarga || '', // Agregar descripción de la recarga
      tras_EsRecarga: this.traslado.tras_EsRecarga || false,
      usua_Creacion: environment.usua_Id,
      tras_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: 0,
      tras_FechaModificacion: new Date().toISOString(),
      tras_Estado: true,
      usuaCreacion: '',
      usuaModificacion: '',
    };

    this.http.post<any>(`${environment.apiBaseUrl}/Traslado/Insertar`, datos, {
      headers: this.obtenerHeaders()
    }).subscribe({
      next: (response) => {
        const id = this.extraerIdTraslado(response);
        if (id > 0) {
          this.crearDetalles(id, productos);
        } else {
          this.mostrarError('No se pudo obtener el ID del traslado');
        }
      },
      error: () => this.mostrarError('Error al crear el traslado')
    });
  }

  private extraerIdTraslado(response: any): number {
    const datos = response?.data;
    if (!datos || datos.code_Status !== 1) return 0;
    
    const ids = [datos.Tras_Id, datos.tras_Id, datos.id, datos.data];
    const id = ids.find(id => id && Number(id) > 0);
    
    return id ? Number(id) : 0;
  }

  private crearDetalles(trasladoId: number, productos: any[]): void {
    let completadas = 0;
    let errores = 0;
    const total = productos.length;

    productos.forEach((producto, index) => {
      const detalle = {
        trDe_Id: 0,
        tras_Id: trasladoId,
        prod_Id: Number(producto.prod_Id),
        trDe_Cantidad: Number(producto.cantidad),
        trDe_Observaciones: producto.observaciones || '',
        usua_Creacion: Number(environment.usua_Id),
        trDe_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        trDe_FechaModificacion: new Date().toISOString(),
        prod_Descripcion: producto.prod_Descripcion,
        prod_Imagen: producto.prod_Imagen || ''
      };

      this.http.post<any>(`${environment.apiBaseUrl}/Traslado/InsertarDetalle`, detalle, {
        headers: this.obtenerHeaders()
      }).subscribe({
        next: () => {
          completadas++;
          this.verificarCompletitud(completadas, errores, total);
        },
        error: () => {
          errores++;
          completadas++;
          this.verificarCompletitud(completadas, errores, total);
        }
      });
    });
  }

  private verificarCompletitud(completadas: number, errores: number, total: number): void {
    if (completadas === total) {
      if (errores === 0) {
        this.mostrarExito(`Traslado guardado exitosamente con ${total} producto(s)`);
        setTimeout(() => {
          this.onSave.emit(this.traslado);
          this.cancelar();
        }, 3000);
      } else {
        this.mostrarWarning(`Traslado guardado, pero ${errores} de ${total} productos fallaron`);
      }
    }
  }

  private obtenerHeaders(): any {
    return { 
      'X-Api-Key': environment.apiKey,
      'Content-Type': 'application/json',
      'accept': '*/*'
    };
  }

  private mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mostrarAlertaExito = true;
    this.mostrarErrores = false;
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