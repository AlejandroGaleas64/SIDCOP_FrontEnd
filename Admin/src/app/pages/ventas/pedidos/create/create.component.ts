// ===== IMPORTACIONES DE ANGULAR CORE =====
import { Component, Output, EventEmitter } from '@angular/core';

// ===== IMPORTACIONES DE MÓDULOS ANGULAR =====
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// ===== IMPORTACIONES DE MODELOS Y SERVICIOS =====
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

// ===== IMPORTACIONES DE BIBLIOTECAS EXTERNAS =====
import { NgSelectModule } from '@ng-select/ng-select';

/**
 * Componente para crear nuevos pedidos
 * Maneja formularios complejos, validaciones y cálculos automáticos de totales
 */
@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
})
export class CreateComponent {
  // ===== COMUNICACIÓN CON COMPONENTE PADRE =====
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Pedido>();

  // ===== SISTEMA DE ALERTAS Y VALIDACIONES =====
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // ===== DATOS MAESTROS PARA FORMULARIOS =====
  Clientes: any[] = [];
  Direccines: any[] = [];
  productos: any[] = [];
  Math = Math; // Disponible para cálculos en templates

  // ===== GESTIÓN DE BÚSQUEDA Y PAGINACIÓN DE PRODUCTOS =====
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 8;

  // listarProductos(): void {
  //   this.http
  //     .get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
  //       headers: { 'x-api-key': environment.apiKey },
  //     })
  //     .subscribe({
  //       next: (data) => {
  //         this.productos = data.map((producto: any) => ({
  //           ...producto,
  //           cantidad: 0,
  //           precio: producto.prod_PrecioUnitario || 0,
  //         }));
  //         this.aplicarFiltros(); // Usar el nuevo método de filtrado
  //       },
  //       error: () => {
  //         this.mostrarAlertaError = true;
  //         this.mensajeError = 'Error al cargar productos.';
  //       },
  //     });
  // }

  // ===== MÉTODOS DE BÚSQUEDA Y FILTRADO DE PRODUCTOS =====

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
   * Filtra por nombre de producto usando coincidencia parcial insensible a mayúsculas
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

  // ===== MÉTODOS AUXILIARES DE PAGINACIÓN =====

  /**
   * Obtiene la lista completa de productos filtrados
   * Útil para conteos y validaciones generales
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
   * Basado en productos filtrados y productos por página configurados
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

  /**
   * Calcula el número del primer registro mostrado en la página actual
   * Maneja caso especial cuando no hay productos filtrados
   */
  getInicioRegistro(): number {
    return this.productosFiltrados.length === 0 ? 0 : (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  /**
   * Calcula el número del último registro mostrado en la página actual
   * Considera que la última página puede tener menos registros
   */
  getFinRegistro(): number {
    return this.productosFiltrados.length === 0 ? 0 : Math.min(this.paginaActual * this.productosPorPagina, this.productosFiltrados.length);
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

  //Codigo de precios

  getPrecioPorCantidad(producto: any, cantidad: number): number {
    let precioBase = producto.prod_PrecioUnitario || 0;

    // Si hay lista de precios y cantidad válida
    if (producto.listasPrecio_JSON && cantidad > 0) {
      let escalaAplicada = null;

      for (const lp of producto.listasPrecio_JSON) {
        if (cantidad >= lp.PreP_InicioEscala && cantidad <= lp.PreP_FinEscala) {
          escalaAplicada = lp;
          break;
        }
      }

      // Si no encontró escala, usa la última si la cantidad excede
      if (!escalaAplicada && producto.listasPrecio_JSON.length > 0) {
        const ultimaEscala =
          producto.listasPrecio_JSON[producto.listasPrecio_JSON.length - 1];
        if (cantidad > ultimaEscala.PreP_FinEscala) {
          escalaAplicada = ultimaEscala;
        }
      }

      if (escalaAplicada) {
        precioBase = escalaAplicada.PreP_PrecioContado;
      }
    }

    // Aplica descuento si corresponde
    return this.aplicarDescuento(producto, cantidad, precioBase);
  }

  aplicarDescuento(
    producto: any,
    cantidad: number,
    precioBase: number
  ): number {
    const descEsp = producto.desc_EspecificacionesJSON || {};

    if (
      !producto.descuentosEscala_JSON ||
      !descEsp ||
      descEsp.Desc_TipoFactura !== 'AM'
    ) {
      return precioBase;
    }

    const descuentosEscala = producto.descuentosEscala_JSON;

    let descuentoAplicado = null;

    for (const desc of descuentosEscala) {
      if (
        cantidad >= desc.DeEs_InicioEscala &&
        cantidad <= desc.DeEs_FinEscala
      ) {
        descuentoAplicado = desc;
        break;
      }
    }

    // Si no encontró descuento, usa el último si la cantidad excede
    if (!descuentoAplicado && descuentosEscala.length > 0) {
      const ultimoDescuento = descuentosEscala[descuentosEscala.length - 1];
      if (cantidad > ultimoDescuento.DeEs_FinEscala) {
        descuentoAplicado = ultimoDescuento;
      }
    }

    if (descuentoAplicado) {
      return this.calcularDescuento(
        precioBase,
        descEsp,
        descuentoAplicado.DeEs_Valor
      );
    }

    return precioBase;
  }

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

  //Codigo de precios end

  // Método para obtener la cantidad de un producto específico
  getCantidadProducto(prodId: number): number {
    const producto = this.productos.find((p) => p.prod_Id === prodId);
    return producto ? producto.cantidad || 0 : 0;
  }

  getPrecioBasePorCantidad(producto: any, cantidad: number): number {
    let precioBase = producto.prod_PrecioUnitario || 0;

    if (producto.listasPrecio_JSON && cantidad > 0) {
      let escalaAplicada = null;

      for (const lp of producto.listasPrecio_JSON) {
        if (cantidad >= lp.PreP_InicioEscala && cantidad <= lp.PreP_FinEscala) {
          escalaAplicada = lp;
          break;
        }
      }

      if (!escalaAplicada && producto.listasPrecio_JSON.length > 0) {
        const ultimaEscala =
          producto.listasPrecio_JSON[producto.listasPrecio_JSON.length - 1];
        if (cantidad > ultimaEscala.PreP_FinEscala) {
          escalaAplicada = ultimaEscala;
        }
      }

      if (escalaAplicada) {
        precioBase = escalaAplicada.PreP_PrecioContado;
      }
    }

    return precioBase;
  }

  obtenerProductosSeleccionados(): any[] {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .map((p) => {
        const cantidad = p.cantidad;

        // Precio base puro, sin descuento ni impuesto
        const precioBase = this.getPrecioBasePorCantidad(p, cantidad);

        // Precio final con descuentos aplicados, sin impuesto
        const precioFinalSinImpuesto = this.getPrecioPorCantidad(p, cantidad);

        // Impuesto si corresponde
        const aplicaImpuesto = p.impu_Valor && p.prod_PagaImpuesto === 'S';
        const impuesto = aplicaImpuesto
          ? precioFinalSinImpuesto * p.impu_Valor
          : 0;

        const subtotal = precioFinalSinImpuesto * cantidad;

        return {
          prod_Id: p.prod_Id,
          peDe_Cantidad: cantidad,
          peDe_ProdPrecio: precioBase, // este es el base sin descuentos ni impuestos
          peDe_Impuesto: impuesto,
          peDe_Subtotal: subtotal,
          peDe_ProdPrecioFinal: precioFinalSinImpuesto + impuesto, // unitario final con impuesto
          // Otros campos si necesitas
        };
      });
  }

  // ========== MÉTODOS DE CLIENTES (SIN CAMBIOS) ==========

  searchCliente = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.clie_Codigo?.toLowerCase().includes(term) ||
      item.clie_Nombres?.toLowerCase().includes(term) ||
      item.clie_Apellidos?.toLowerCase().includes(term) ||
      item.clie_NombreNegocio?.toLowerCase().includes(term)
    );
  };

  pedidos: any[] = [];

  cargarPedidos() {
    this.http
      .get<any[]>(`${environment.apiBaseUrl}/Pedido/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe(
        (data) => {
          this.pedidos = data;
          this.generarSiguienteCodigo();
        },
        (error) => {
          //.error('Error al cargar las pedios:', error);
        }
      );
  }

  generarSiguienteCodigo(): void {
    const direccionSeleccionada = this.Direccines.find(
      (d) => d.diCl_Id === this.pedido.diCl_Id
    );
    if (!direccionSeleccionada) {
      //.error('Dirección no encontrada.');
      return;
    }

    const clienteId = direccionSeleccionada.clie_Id;

    const cliente = this.Clientes.find((c) => c.clie_Id === clienteId);
    if (!cliente || !cliente.ruta_Id) {
      //.error('Cliente no encontrado o sin ruta_Id.');
      return;
    }

    const rutaId = cliente.ruta_Id;

    // Obtener la ruta del backend
    this.http
      .get<any>(`${environment.apiBaseUrl}/Rutas/Buscar/${rutaId}`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (ruta) => {
          const rutaCodigo = ruta.ruta_Codigo; // ej: RT-012
          const rutaCodigoNumerico = rutaCodigo.split('-')[1]; // extrae "012"

          // Filtrar códigos existentes de esta ruta
          const codigosRuta = this.pedidos
            .map((p) => p.pedi_Codigo)
            .filter((c) =>
              new RegExp(`^PED-${rutaCodigoNumerico}-\\d{7}$`).test(c)
            );

          let siguienteNumero = 1;
          if (codigosRuta.length > 0) {
            const ultimoNumero = codigosRuta
              .map((codigo) => parseInt(codigo.split('-')[2], 10)) // extraer solo el número final
              .sort((a, b) => b - a)[0]; // ordenar descendentemente y tomar el mayor

            siguienteNumero = ultimoNumero + 1;
          }

          const nuevoCodigo = `PED-${rutaCodigoNumerico}-${siguienteNumero
            .toString()
            .padStart(7, '0')}`;
          this.pedido.pedi_Codigo = nuevoCodigo;
          //.log('Código generado:', nuevoCodigo);
        },
        error: (error) => {
          //.error('Error al obtener ruta:', error);
        },
      });
  }

  cargarClientes() {
    this.http
      .get<any>(`${environment.apiBaseUrl}/Cliente/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (data) => {
          this.Clientes = data;
          //.log('Clientes cargados:', this.Clientes);
        },
        error: (error) => {
          //.error('Error al cargar clientes:', error);
          this.mostrarAlertaError = true;
          this.mensajeError =
            'Error al cargar clientes. Por favor, intente nuevamente.';
        },
      });
  }

  cargarDirecciones(clienteId: number) {
    this.http
      .get<any>(
        `${environment.apiBaseUrl}/DireccionesPorCliente/Buscar/${clienteId}`,
        {
          headers: { 'x-api-key': environment.apiKey },
        }
      )
      .subscribe((data) => (this.Direccines = data));

    //this.cargarPedidos();
  }

  onClienteSeleccionado(clienteId: number) {
    this.cargarDirecciones(clienteId);
    this.pedido.diCl_Id = 0; // Reiniciar dirección seleccionada
    this.pedido.pedi_Codigo = '';
    this.cargarProductosPorCliente(clienteId);
  }

  onDireccionSeleccionada(direccionId: number) {
    this.pedido.diCl_Id = parseInt(direccionId.toString());
     this.http
    .get<any[]>(`${environment.apiBaseUrl}/Pedido/Listar`, {
      headers: { 'x-api-key': environment.apiKey },
    })
    .subscribe({
      next: (data) => {
        this.pedidos = data;
        this.generarSiguienteCodigo(); // ✅ Ahora sí se llama con los pedidos cargados
      },
      error: (error) => {
        //.error('Error al cargar los pedidos:', error);
      },
    });
  }

  cargarProductosPorCliente(clienteId: number): void {
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

          // Mapear productos para agregar cantidad y precio
          this.productos = productos.map((producto: any) => ({
            ...producto,
            cantidad: 0,
            precio: producto.precio || producto.prod_PrecioUnitario || 0,
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
          }));
          this.aplicarFiltros();
          //.log('Productos cargados para el cliente:', this.productos);
          //.log('Productos cargados para el cliente:', this.productos);
          // //.log("Listas de precio del producto:", productos.listasPrecio);
        },
        error: (error) => {
          //.error('Error al obtener productos:', error);
          this.mostrarAlertaWarning = true;
          this.mensajeWarning =
            'No se pudieron obtener los productos para el cliente seleccionado.';
        },
      });
  }

  constructor(private http: HttpClient) {
    this.cargarClientes();
      (this.pedido.pedi_FechaEntrega as any) = this.getTodayAsDateInput();
    // this.listarProductos();
  }

  private getTodayAsDateInput(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

  // Agregar al componente TypeScript
  trackByProducto(index: number, producto: any): number {
    return producto.prod_Id;
  }

  pedido: Pedido = {
    pedi_Id: 0,
    pedi_Codigo: '',
    diCl_Id: 0,
    vend_Id: 0,
    pedi_FechaPedido: new Date(),
    pedi_FechaEntrega: new Date(),
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
    prod_Codigo: '',
    prod_Descripcion: '',
    peDe_ProdPrecio: 0,
    peDe_Cantidad: 0,
    detalles: [],
    detallesJson: '',
    // Propiedades adicionales para la factura
    regC_Id: 0,
    pedi_Latitud: 0,
    pedi_Longitud: 0,
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

  getTotalProductosSeleccionados(): number {
    return this.productos
      .filter((producto) => producto.cantidad > 0)
      .reduce((total, producto) => total + producto.cantidad, 0);
  }

  cancelar(): void {
    this.busquedaProducto = '';
    this.paginaActual = 1;
    this.aplicarFiltros();
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.productos.forEach((p) => {
      p.cantidad = 0;
      p.prod_PrecioUnitario = 0;
    });
    this.pedido = {
      pedi_Id: 0,
      pedi_Codigo: '',
      // Propiedades adicionales para la factura
      regC_Id: 0,
      pedi_Latitud: 0,
      pedi_Longitud: 0,
      diCl_Id: 0,
      vend_Id: 0,
      pedi_FechaPedido: new Date(),
      pedi_FechaEntrega: new Date(),
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
    this.onCancel.emit();
  }

// ...existing code...
onKeyDown(event: KeyboardEvent): void {
  const input = event.target as HTMLInputElement;
  const value = input.value;
  
  // Permitir teclas de control (backspace, delete, flechas, etc)
  if (event.key === 'Backspace' || 
      event.key === 'Delete' || 
      event.key === 'ArrowLeft' || 
      event.key === 'ArrowRight' ||
      event.key === 'Tab') {
    return;
  }
  
  // Prevenir entrada de caracteres no numéricos
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
    return;
  }

  // Prevenir entrada si ya hay 3 dígitos y no hay texto seleccionado
  if (value.length >= 3 && !input.selectionStart && !input.selectionEnd) {
    event.preventDefault();
  }
}

onCantidadChange(prodId: number, valor: any): void {
  const index = this.getProductoIndex(prodId);
  if (index >= 0) {
    // Convertir a string y remover caracteres no numéricos
    let cantidad = String(valor).replace(/\D/g, '');
    
    // Limitar a 3 dígitos
    if (cantidad.length > 3) {
      cantidad = cantidad.slice(0, 3);
    }
    
    // Convertir a número
    let cantidadNum = parseInt(cantidad, 10);
    
    // Validar rango
    if (isNaN(cantidadNum) || cantidadNum < 0) {
      cantidadNum = 0;
    } else if (cantidadNum > 999) {
      cantidadNum = 999;
    }
    
    // Actualizar el producto
    this.productos[index].cantidad = cantidadNum;
    this.actualizarPrecio(this.productos[index]);
  }
}
// ...existing code...
  
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  guardar(): void {
    this.mostrarErrores = true;
    const productosSeleccionados = this.obtenerProductosSeleccionados();

    if (
      !this.pedido.diCl_Id ||
      !this.pedido.pedi_FechaEntrega ||
      productosSeleccionados.length === 0
    ) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos y seleccione al menos un producto.';
      return;
    }

    if (this.pedido.diCl_Id && this.pedido.pedi_FechaEntrega) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;

      this.mostrarAlertaError = false;

      const pedidoGuardar = {
        pedi_Id: 0,
        diCl_Id: this.pedido.diCl_Id,
        pedi_Codigo: this.pedido.pedi_Codigo, //meter el codigo
        vend_Id: getUserId(), // Asumiendo que el usuario actual es el vendedor
        pedi_FechaPedido: new Date().toISOString(),
        pedi_FechaEntrega: this.pedido.pedi_FechaEntrega,
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
        usua_Creacion: getUserId(),
        pedi_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: null,
        pedi_FechaModificacion: null,
        pedi_Estado: true,
        secuencia: 0,
      };

      //.log('Guardando pedido:', pedidoGuardar);

      this.http
        .post<any>(`${environment.apiBaseUrl}/Pedido/Insertar`, pedidoGuardar, {
          headers: {
            'X-Api-Key': environment.apiKey,
            'Content-Type': 'application/json',
            accept: '*/*',
          },
        })
        .subscribe({
          next: (response) => {
            this.mostrarErrores = false;
            this.onSave.emit(this.pedido);
            this.cancelar();
          },
          error: (error) => {
            //.log('Entro esto', this.pedido);
            //.error('Error al guardar punto de emision:', error);
            this.mostrarAlertaError = true;
            this.mensajeError =
              'Error al guardar el pedido. Por favor, intente nuevamente.';
            this.mostrarAlertaExito = false;

            // Ocultar la alerta de error después de 5 segundos
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          },
        });
    } else {
      // Mostrar alerta de warning para campos vacíos
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;

      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}
