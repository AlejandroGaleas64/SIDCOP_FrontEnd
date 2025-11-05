// ===== IMPORTACIONES DE ANGULAR CORE =====
import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';

// ===== IMPORTACIONES DE MÓDULOS ANGULAR =====
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ===== IMPORTACIONES DE MODELOS Y SERVICIOS =====
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { esVendedor } from 'src/app/core/utils/user-utils';
import { esAdministrador } from 'src/app/core/utils/user-utils';
import { obtenerPersonaId } from 'src/app/core/utils/user-utils';

// ===== IMPORTACIONES DE BIBLIOTECAS EXTERNAS =====
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePipe } from '@angular/common';

/**
 * Componente para editar pedidos existentes
 * Maneja formularios complejos con productos, cantidades y cálculos automáticos
 */
@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
})
export class EditComponent implements OnInit, OnChanges {
  // ===== COMUNICACIÓN CON COMPONENTE PADRE =====
  @Input() PedidoData: Pedido | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Pedido>();

  // ===== GESTIÓN DE PRODUCTOS Y BÚSQUEDA =====
  productos: any[] = [];
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 8;

  /**
   * Busca productos según el término ingresado
   * Reinicia la paginación para mostrar resultados desde el inicio
   */
  buscarProductos(): void {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  /**
   * Limpia el campo de búsqueda y muestra todos los productos
   * Útil para resetear filtros rápidamente
   */
  limpiarBusqueda(): void {
    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  /**
   * Aplica filtros de búsqueda y paginación a la lista de productos
   * Filtra por nombre de producto usando coincidencia parcial
   */
  private aplicarFiltros(): void {
    if (!this.busquedaProducto.trim()) {
      this.productosFiltrados = [...this.productos];
    } else {
      const termino = this.busquedaProducto.toLowerCase().trim();
      this.productosFiltrados = this.productos.filter((producto) =>
        producto.prod_DescripcionCorta.toLowerCase().includes(termino)
      );
    }
  }

  /**
   * Obtiene la lista completa de productos filtrados
   * Útil para conteos y validaciones
   */
  getProductosFiltrados(): any[] {
    return this.productosFiltrados;
  }

  /**
   * Obtiene productos para la página actual según paginación
   * Implementa slice para mostrar solo productos de la página seleccionada
   */
  getProductosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    const fin = inicio + this.productosPorPagina;
    return this.productosFiltrados.slice(inicio, fin);
  }

  /**
   * Calcula el número total de páginas necesarias
   * Basado en productos filtrados y productos por página
   */
  getTotalPaginas(): number {
    return Math.ceil(this.productosFiltrados.length / this.productosPorPagina);
  }

  /**
   * Cambia a una página específica con validación de límites
   * Previene navegación fuera del rango válido de páginas
   */
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.getTotalPaginas()) {
      this.paginaActual = pagina;
    }
  }

  /**
   * Calcula qué páginas mostrar en el navegador de páginas
   * Implementa lógica inteligente para mostrar máximo 5 páginas relevantes
   */
  getPaginasVisibles(): number[] {
    const totalPaginas = this.getTotalPaginas();
    const paginaActual = this.paginaActual;
    const paginas: number[] = [];

    if (totalPaginas <= 5) {
      // Si hay 5 o menos páginas, mostrar todas
      for (let i = 1; i <= totalPaginas; i++) {
        paginas.push(i);
      }
    } else {
      // Lógica compleja para mostrar páginas relevantes
      if (paginaActual <= 3) {
        // Inicio: mostrar páginas 1-5
        for (let i = 1; i <= 5; i++) {
          paginas.push(i);
        }
      } else if (paginaActual >= totalPaginas - 2) {
        // Final: mostrar últimas 5 páginas
        for (let i = totalPaginas - 4; i <= totalPaginas; i++) {
          paginas.push(i);
        }
      } else {
        // Medio: mostrar página actual ± 2
        for (let i = paginaActual - 2; i <= paginaActual + 2; i++) {
          paginas.push(i);
        }
      }
    }

    return paginas;
  }

  // ===== MÉTODOS AUXILIARES DE PAGINACIÓN =====
  
  /**
   * Calcula el número del primer registro mostrado en la página actual
   * Útil para mostrar "Mostrando 1-10 de 50 registros"
   */
  getInicioRegistro(): number {
    return (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  /**
   * Calcula el número del último registro mostrado en la página actual
   * Considera que la última página puede tener menos registros
   */
  getFinRegistro(): number {
    const fin = this.paginaActual * this.productosPorPagina;
    return Math.min(fin, this.productosFiltrados.length);
  }

  /**
   * Encuentra el índice de un producto en el array principal
   * Útil para operaciones que requieren la posición exacta del producto
   */
  getProductoIndex(prodId: number): number {
    return this.productos.findIndex((p) => p.prod_Id === prodId);
  }

  // ===== GESTIÓN DE CANTIDADES DE PRODUCTOS =====

  /**
   * Aumenta la cantidad de un producto específico
   * Recalcula automáticamente el precio según descuentos por volumen
   */
  aumentarCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (index >= 0 && index < this.productos.length) {
      const producto = this.productos[index];
      producto.cantidad = (producto.cantidad || 0) + 1;
      producto.precio = this.getPrecioPorCantidad(producto, producto.cantidad);
    }
  }

  /**
   * Disminuye la cantidad de un producto específico
   * Valida que la cantidad no sea menor a 0 y recalcula precios
   */
  disminuirCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (
      index >= 0 &&
      index < this.productos.length &&
      this.productos[index].cantidad > 0
    ) {
      const producto = this.productos[index];
      producto.cantidad--;
      producto.precio = this.getPrecioPorCantidad(producto, producto.cantidad);
    }
  }

  /**
   * Actualiza el precio de un producto basado en su cantidad actual
   * Útil para recalcular después de cambios manuales de cantidad
   */
  actualizarPrecio(producto: any): void {
    producto.precio = this.getPrecioPorCantidad(producto, producto.cantidad);
  }

  /**
   * Valida y corrige la cantidad ingresada por el usuario
   * Establece límites mínimos (0) y máximos (999) para prevenir errores
   */
  validarCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (index >= 0 && index < this.productos.length) {
      const producto = this.productos[index];
      const cantidad = producto.cantidad || 0;
      producto.cantidad = Math.max(0, Math.min(999, cantidad));
      producto.precio = this.getPrecioPorCantidad(producto, producto.cantidad);
    }
  }

  // ===== MÉTODOS AUXILIARES DE PRODUCTOS =====

  /**
   * Obtiene la cantidad actual de un producto específico
   * Retorna 0 si el producto no existe o no tiene cantidad definida
   */
  getCantidadProducto(prodId: number): number {
    const producto = this.productos.find((p) => p.prod_Id === prodId);
    return producto ? producto.cantidad || 0 : 0;
  }

  /**
   * Calcula el precio unitario basado en cantidad y escalas de descuento
   * Implementa lógica de precios por volumen usando listasPrecio_JSON
   */
  getPrecioPorCantidad(producto: any, cantidad: number): number {
    let precioBase = producto.prod_PrecioUnitario || 0;

    // Aplicar descuentos por volumen si existen escalas de precio
    if (producto.listasPrecio_JSON && cantidad > 0) {
      let escalaAplicada = null;

      // Buscar escala que corresponda a la cantidad
      for (const lp of producto.listasPrecio_JSON) {
        if (cantidad >= lp.PreP_InicioEscala && cantidad <= lp.PreP_FinEscala) {
          escalaAplicada = lp;
          break;
        }
      }

      // Si la cantidad excede todas las escalas, usar la última
      if (!escalaAplicada && producto.listasPrecio_JSON.length > 0) {
        const ultimaEscala =
          producto.listasPrecio_JSON[producto.listasPrecio_JSON.length - 1];
        if (cantidad > ultimaEscala.PreP_FinEscala) {
          escalaAplicada = ultimaEscala;
        }
      }

      // Aplicar precio de la escala encontrada
      if (escalaAplicada) {
        precioBase = escalaAplicada.PreP_PrecioContado;
      }
    }

    // Aplicar descuentos adicionales si corresponde
    return this.aplicarDescuento(producto, cantidad, precioBase);
  }

  /**
   * Aplica descuentos específicos según configuración del producto
   * Maneja descuentos por escala y tipos de factura específicos
   */
  aplicarDescuento(
    producto: any,
    cantidad: number,
    precioBase: number
  ): number {
    const descEsp = producto.desc_EspecificacionesJSON || {};

    // Validar si aplican descuentos (solo para tipo de factura 'AM')
    if (
      !producto.descuentosEscala_JSON ||
      !descEsp ||
      descEsp.Desc_TipoFactura !== 'AM'
    ) {
      return precioBase;
    }

    const descuentosEscala = producto.descuentosEscala_JSON;
    let descuentoAplicado = null;

    // Buscar descuento que corresponda a la cantidad
    for (const desc of descuentosEscala) {
      if (
        cantidad >= desc.DeEs_InicioEscala &&
        cantidad <= desc.DeEs_FinEscala
      ) {
        descuentoAplicado = desc;
        break;
      }
    }

    // Si la cantidad excede todas las escalas, usar el último descuento
    if (!descuentoAplicado && descuentosEscala.length > 0) {
      const ultimoDescuento = descuentosEscala[descuentosEscala.length - 1];
      if (cantidad > ultimoDescuento.DeEs_FinEscala) {
        descuentoAplicado = ultimoDescuento;
      }
    }

    // Aplicar el descuento encontrado
    if (descuentoAplicado) {
      return this.calcularDescuento(
        precioBase,
        descEsp,
        descuentoAplicado.DeEs_Valor
      );
    }

    return precioBase;
  }

  /**
   * Calcula el descuento final aplicando porcentajes o valores fijos
   * Maneja diferentes tipos de descuento según configuración
   */
  calcularDescuento(
    precioBase: number,
    descEsp: any,
    valorDescuento: number
  ): number {
    if (descEsp.Desc_Tipo === 0) {
      // Descuento por porcentaje
      return precioBase - precioBase * (valorDescuento / 100);
    } else if (descEsp.Desc_Tipo === 1) {
      // Descuento por monto fijo
      return precioBase - valorDescuento;
    }
    return precioBase;
  }

  obtenerProductosSeleccionados(): any[] {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .map((p) => ({
        prod_Id: p.prod_Id,
        peDe_Cantidad: p.cantidad,
        peDe_ProdPrecio: p.prod_PrecioUnitario || 0, // Precio unitario base
        peDe_ProdPrecioFinal: this.getPrecioPorCantidad(p, p.cantidad), // Precio final con descuento/escalas
      }));
  }

  

  cargarProductosPorCliente(clienteId: number): void {
    this.mostrarOverlayCarga = true; // Activar el overlay
    
    this.http
      .get<any>(
        `${environment.apiBaseUrl}/Productos/ListaPrecio/${clienteId}`,
        {
          headers: { 'x-api-key': environment.apiKey },
        }
      )
      .subscribe({
        next: (productos) => {
          // Aplicar corrección de URLs de imágenes
          productos.forEach((item: any) => {
            item.prod_Imagen = item.prod_Imagen.includes("http") ? item.prod_Imagen : environment.apiBaseUrl + item.prod_Imagen;
          });

          // Paso 2.1: Parsear productos con lógica adicional
          this.productos = productos.map((producto: any) => {
            const detalleExistente = this.pedidoEditada.detalles?.find(
              (d: any) => parseInt(d.id) === parseInt(producto.prod_Id)
            );

            const cantidad = detalleExistente
              ? parseInt(detalleExistente.cantidad || '0')
              : 0;
            const precioBase = producto.prod_PrecioUnitario || 0;

            return {
              ...producto,
              cantidad: cantidad,
              precio: this.getPrecioPorCantidad(producto, cantidad),
              listasPrecio_JSON:
                typeof producto.listasPrecio_JSON === 'string'
                  ? JSON.parse(producto.listasPrecio_JSON)
                  : producto.listasPrecio_JSON,
              descuentosEscala_JSON:
                typeof producto.descuentosEscala_JSON === 'string'
                  ? JSON.parse(producto.descuentosEscala_JSON)
                  : producto.descuentosEscala_JSON,
              desc_EspecificacionesJSON:
                typeof producto.desc_EspecificacionesJSON === 'string'
                  ? JSON.parse(producto.desc_EspecificacionesJSON)
                  : producto.desc_EspecificacionesJSON,
            };
          });

          this.aplicarFiltros();
          this.mostrarOverlayCarga = false; // Desactivar el overlay
       
        },
        error: (error) => {
          //('Error al obtener productos:', error);
          this.mostrarAlertaWarning = true;
          this.mensajeWarning =
            'No se pudieron obtener los productos para el cliente seleccionado.';
          this.mostrarOverlayCarga = false; // Desactivar el overlay en caso de error
        },
      });
  }

  pedidoEditada: Pedido = {
    pedi_Id: 0,
    pedi_Codigo: '',
    diCl_Id: 0,
    vend_Id: 0,
    pedi_FechaPedido: new Date(),
    pedi_FechaEntrega: new Date(),
    clie_Codigo: '',
    clie_Id: 0,
    clie_NombreNegocio: '',
    // Propiedades adicionales para la factura
    regC_Id: 0,
    pedi_Latitud: 0,
    pedi_Longitud: 0,
    clie_Nombres: '',
    clie_Apellidos: '',
    colo_Descripcion: '',
    muni_Descripcion: '',
    depa_Descripcion: '',
    diCl_DireccionExacta: '',
    vend_Nombres: '',
    vend_Apellidos: '',
    prod_Codigo: '',
    prod_Descripcion: '',
    peDe_ProdPrecio: 0,
    peDe_Cantidad: 0,
    detalles: [],
    detallesJson: '',

    usua_Creacion: 0,
    usua_Modificacion: 0,

    pedi_FechaCreacion: new Date(),
    pedi_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
    pedi_Estado: false,
  };

  PEOriginal: any = {};
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  // Variable para el overlay de carga (mismo patrón que list)
  mostrarOverlayCarga = false;

  trackByProducto(index: number, producto: any): number {
    return producto.prod_Id;
  }

  getTotalProductosSeleccionados(): number {
    return this.productos
      .filter((producto) => producto.cantidad > 0)
      .reduce((total, producto) => total + producto.cantidad, 0);
  }
  Math = Math; // para usar Math en la plantilla

  productosPaginados: any[] = []; // productos que se muestran en la página actual

  TodasDirecciones: any;
  Clientes: any;
  Direcciones: any[] = [];

  selectedCliente: number = 0;
  selectedDireccion: number = 0;

  listarProductos(): void {
    this.http
      .get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (data) => {
          // Aplicar corrección de URLs de imágenes
          data.forEach((item: any) => {
            item.prod_Imagen = item.prod_Imagen.includes("http") ? item.prod_Imagen : environment.apiBaseUrl + item.prod_Imagen;
          });

          this.productos = data.map((producto: any) => ({
            ...producto,
            cantidad: 0,
            precio: producto.prod_PrecioUnitario || 0,
          }));
          this.filtrarProductos(); // aplicar filtro inicial
        },
        error: () => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al cargar productos.';
        },
      });
  }

  searchQuery: string = ''; // Variable para almacenar la búsqueda

  // Filtrar productos según el nombre
  filtrarProductos(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (query === '') {
      this.productosFiltrados = [...this.productos];
    } else {
      this.productosFiltrados = this.productos.filter((producto) =>
        producto.prod_DescripcionCorta.toLowerCase().includes(query)
      );
    }
    this.paginaActual = 1; // reset a la página 1 tras filtrar
    this.actualizarProductosPaginados();
  }

  actualizarProductosPaginados(): void {
    const inicio = (this.paginaActual - 1) * this.productosPorPagina;
    const fin = inicio + this.productosPorPagina;
    this.productosPaginados = this.productosFiltrados.slice(inicio, fin);
  }

  constructor(private http: HttpClient) {}

  formatearFecha(fecha: Date | string): string {
    const d = new Date(fecha);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const anio = d.getFullYear();
    return `${anio}-${mes}-${dia}`; // formato 'yyyy-MM-dd'
  }

   formatFechaDDMMYYYY(fecha: Date | string | null | undefined): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  get fechaInicioFormato(): string {
    return new Date(this.pedidoEditada.pedi_FechaEntrega)
      .toISOString()
      .split('T')[0];
  }

  set fechaInicioFormato(value: string) {
    this.pedidoEditada.pedi_FechaEntrega = new Date(value);
  }

  ngOnInit(): void {
    this.cargarListados();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['PedidoData'] && changes['PedidoData'].currentValue) {
      this.pedidoEditada = { ...changes['PedidoData'].currentValue };
      this.PEOriginal = { ...this.PedidoData };
      this.mostrarErrores = false;

      this.pedidoEditada.pedi_FechaPedido = new Date(
        this.formatearFecha(this.pedidoEditada.pedi_FechaPedido)
      );
      this.pedidoEditada.pedi_FechaEntrega = new Date(
        this.formatearFecha(this.pedidoEditada.pedi_FechaEntrega)
      );

      try {
        this.pedidoEditada.detalles = JSON.parse(
          this.pedidoEditada.detallesJson || '[]'
        );
      } catch (e) {
        //('Error al parsear detallesJson:', e);
        this.pedidoEditada.detalles = [];
      }

      // Cargar productos con cantidades desde los detalles
      // this.listarProductosDesdePedido();
      this.cargarListados();
      this.cerrarAlerta();
    }
  }

  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  searchCliente = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.clie_Codigo?.toLowerCase().includes(term) ||
      item.clie_Nombres?.toLowerCase().includes(term) ||
      item.clie_Apellidos?.toLowerCase().includes(term) ||
      item.clie_NombreNegocio?.toLowerCase().includes(term)
    );
  };

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.pedidoEditada.diCl_Id && this.pedidoEditada.pedi_FechaEntrega) {
      if (this.hayDiferencias()) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  cambiosDetectados: any = {};

  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  hayDiferencias(): boolean {
    this.cambiosDetectados = {};

    let productosOriginal: any[] = [];

    const diClIdOriginal = this.PedidoData?.diCl_Id;
    const diClIdActual = this.pedidoEditada.diCl_Id;

    if (diClIdOriginal !== diClIdActual) {
      const direccionAnterior = this.TodasDirecciones?.find(
        (d: any) => d.diCl_Id === diClIdOriginal
      );
      const direccionNueva = this.TodasDirecciones?.find(
        (d: any) => d.diCl_Id === diClIdActual
      );

      // Obtener nombre del cliente
      const clienteAnterior = this.Clientes?.find(
        (c: any) => c.clie_Id === direccionAnterior?.clie_Id
      );
      const clienteNuevo = this.Clientes?.find(
        (c: any) => c.clie_Id === direccionNueva?.clie_Id
      );

      const formatDireccion = (dir: any, cliente: any) =>
        dir
          ? `${dir.diCl_DireccionExacta || 'Dirección sin nombre'} (${
              cliente?.clie_NombreNegocio ||
              cliente?.clie_Nombres ||
              'Cliente desconocido'
            })`
          : 'No seleccionada';

      this.cambiosDetectados.direccionCliente = {
        anterior: formatDireccion(direccionAnterior, clienteAnterior),
        nuevo: formatDireccion(direccionNueva, clienteNuevo),
        label: 'Dirección y Cliente',
      };
    }

    const fechaOriginalFormateada = this.formatFechaDDMMYYYY(
      this.PedidoData?.pedi_FechaEntrega
    );
    const fechaActualFormateada = this.formatFechaDDMMYYYY(
      this.pedidoEditada.pedi_FechaEntrega
    );

    if (fechaOriginalFormateada !== fechaActualFormateada) {
      this.cambiosDetectados.fechaEntrega = {
        anterior: fechaOriginalFormateada,
        nuevo: fechaActualFormateada,
        label: 'Fecha de Entrega',
      };
    }

    try {
      productosOriginal = JSON.parse(this.PedidoData?.detallesJson ?? '[]');
    } catch (e) {
      //('Error al parsear detallesJson:', e);
    }

    // Normalizamos ambos arreglos para compararlos por ID y cantidad
    productosOriginal = productosOriginal.map((p) => ({
      prod_Id: parseInt(p.id),
      cantidad: p.cantidad,
    }));

    const productosActual = this.obtenerProductosSeleccionados().map((p) => ({
      prod_Id: parseInt(p.prod_Id),
      cantidad: p.peDe_Cantidad,
    }));

    const getDescripcionProducto = (id: number) => {
      const prod = this.productos.find((p) => Number(p.prod_Id) === Number(id));
  return prod && prod.prod_DescripcionCorta ? prod.prod_DescripcionCorta : `ID ${id}`;
    };

    const serialize = (arr: any[]) =>
      arr
        .sort((a, b) => a.prod_Id - b.prod_Id)
        .map((p) => `${p.prod_Id}:${p.cantidad}`)
        .join(',');

    if (serialize(productosOriginal) !== serialize(productosActual)) {
      this.cambiosDetectados.productos = {
        anterior: productosOriginal.length
          ? productosOriginal
              .map(
                (p) => `${getDescripcionProducto(p.prod_Id)} (x${p.cantidad})`
              )
              .join(', ')
          : 'Sin productos',
        nuevo: productosActual.length
          ? productosActual
              .map(
                (p) => `${getDescripcionProducto(p.prod_Id)} (x${p.cantidad})`
              )
              .join(', ')
          : 'Sin productos',
        label: 'Productos seleccionados',
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  private guardar(): void {
    this.mostrarErrores = true;
    const productosSeleccionados = this.obtenerProductosSeleccionados();

    if (!esVendedor() && !esAdministrador()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Usuario incapaz de realizar pedidos.';
      return;
    }

    if (
      this.pedidoEditada.diCl_Id &&
      this.pedidoEditada.pedi_FechaEntrega &&
      productosSeleccionados.length > 0
    ) {
      const PEActualizar = {
        pedi_Id: this.pedidoEditada.pedi_Id,
         pedi_Codigo: this.pedidoEditada.pedi_Codigo, // El código se actualiza aquí
        diCl_Id: this.pedidoEditada.diCl_Id,
        vend_Id: obtenerPersonaId(), // Asumiendo que el usuario actual es el vendedor
        pedi_FechaPedido: new Date().toISOString(),
        pedi_FechaEntrega: this.pedidoEditada.pedi_FechaEntrega,
        clie_Codigo: '',
        clie_Id: 0,
        clie_NombreNegocio: '',
        clie_Nombres: '',
        clie_Apellidos: '',
        colo_Descripcion: '',
        muni_Descripcion: '',
        depa_Descripcion: '',
        diCl_DireccionExacta: '',
        vend_Nombres: '',
        vend_Apellidos: '',
        detalles: productosSeleccionados,
        usua_Creacion: 0,
        pedi_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: getUserId(),
        pedi_FechaModificacion: new Date().toISOString(),
        pedi_Estado: true,
        secuencia: 0,
      };

      //console.log('Datos a enviar:', PEActualizar);

      this.http
        .put<any>(`${environment.apiBaseUrl}/Pedido/Actualizar`, PEActualizar, {
          headers: {
            'X-Api-Key': environment.apiKey,
            'Content-Type': 'application/json',
            accept: '*/*',
          },
        })
        .subscribe({
          next: (response) => {
            this.mostrarErrores = false;
            this.onSave.emit(this.pedidoEditada);
            this.cancelar();
          },
          error: (error) => {
            //('Error al actualizar Punto de Emision:', error);
            this.mostrarAlertaError = true;
            this.mensajeError =
              'Error al actualizar el Pedido. Por favor, intente nuevamente.';
            setTimeout(() => this.cerrarAlerta(), 5000);
          },
        });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  cargarListados(): void {
    this.mostrarOverlayCarga = true; // Activar el overlay
    
    this.http
      .get<any>(`${environment.apiBaseUrl}/Cliente/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (cliente) => {
          this.Clientes = cliente;
          //console.log('Clientes cargados:', this.Clientes);
          this.http
            .get<any>(
              `${environment.apiBaseUrl}/DireccionesPorCliente/Listar`,
              {
                headers: { 'x-api-key': environment.apiKey },
              }
            )
            .subscribe({
              next: (direcciones) => {
                //console.log('Direcciones cargadas:', direcciones);
                this.TodasDirecciones = direcciones;
                this.configurarUbicacionInicial();
                this.mostrarOverlayCarga = false; // Desactivar el overlay cuando todo esté cargado
              },
              error: (error) => {
                //('Error al cargar direcciones:', error);
                this.mostrarOverlayCarga = false; // Desactivar el overlay en caso de error
              }
            });
        },
        error: (error) => {
          //('Error al cargar clientes:', error);
          this.mostrarOverlayCarga = false; // Desactivar el overlay en caso de error
        }
      });
  }

  configurarUbicacionInicial(): void {
    const direccion = this.TodasDirecciones.find(
      (m: any) => m.diCl_Id === this.pedidoEditada.diCl_Id
    );
    if (direccion) {
      this.selectedCliente = direccion.clie_Id;
      this.selectedDireccion = direccion.diCl_Id;
      this.Direcciones = this.TodasDirecciones.filter(
        (m: any) => m.clie_Id === this.selectedCliente
      );

      this.cargarProductosPorCliente(this.selectedCliente);
    }
  }

  cargarMunicipios(codigoDepa: number): void {
    this.pedidoEditada.clie_Id = parseInt(codigoDepa.toString());
    //console.log('Código del departamento seleccionado:', codigoDepa);
    this.Direcciones = this.TodasDirecciones.filter(
      (m: any) => m.clie_Id === parseInt(codigoDepa.toString())
    );
    this.selectedDireccion = 0;
    this.pedidoEditada.diCl_Id = 0;

    this.cargarProductosPorCliente(parseInt(codigoDepa.toString()));
  }
}
