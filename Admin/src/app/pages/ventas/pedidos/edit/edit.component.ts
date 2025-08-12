import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
})
export class EditComponent implements OnInit, OnChanges {
  @Input() PedidoData: Pedido | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Pedido>();

  //Clientes: any[] = [];
  //Direccines: any[] = [];
  productos: any[] = [];
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 8;

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
      this.productosFiltrados = this.productos.filter((producto) =>
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

  getInicioRegistro(): number {
    return (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  getFinRegistro(): number {
    const fin = this.paginaActual * this.productosPorPagina;
    return Math.min(fin, this.productosFiltrados.length);
  }

  // Método para obtener el índice real del producto en el array principal
  getProductoIndex(prodId: number): number {
    return this.productos.findIndex((p) => p.prod_Id === prodId);
  }

  // ========== MÉTODOS DE CANTIDAD MEJORADOS ==========

  aumentarCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (index >= 0 && index < this.productos.length) {
      this.productos[index].cantidad =
        (this.productos[index].cantidad || 0) + 1;
    }
  }

  disminuirCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (
      index >= 0 &&
      index < this.productos.length &&
      this.productos[index].cantidad > 0
    ) {
      this.productos[index].cantidad--;
    }
  }

  validarCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (index >= 0 && index < this.productos.length) {
      const cantidad = this.productos[index].cantidad || 0;
      this.productos[index].cantidad = Math.max(0, Math.min(999, cantidad));
    }
  }

  // Método para obtener la cantidad de un producto específico
  getCantidadProducto(prodId: number): number {
    const producto = this.productos.find((p) => p.prod_Id === prodId);
    return producto ? producto.cantidad || 0 : 0;
  }

  obtenerProductosSeleccionados(): any[] {
    return this.productos
      .filter((p) => p.cantidad > 0)
      .map((p) => ({
        prod_Id: p.prod_Id,
        peDe_Cantidad: p.cantidad,
        peDe_ProdPrecio: p.precio || 0,
      }));
  }

  listarProductosDesdePedido(): void {
    this.http
      .get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (data) => {
          this.productos = data.map((producto: any) => {
            const detalle = this.pedidoEditada.detalles.find(
              (d: any) => d.id == producto.prod_Id
            );
            return {
              ...producto,
              cantidad: detalle?.cantidad || 0,
              precio: detalle?.precio || producto.prod_PrecioUnitario || 0,
            };
          });
          this.filtrarProductos();
        },
        error: () => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al cargar productos.';
        },
      });
  }

  pedidoEditada: Pedido = {
    pedi_Id: 0,
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

  PEOriginal: any = {};
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

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
        producto.prod_Descripcion.toLowerCase().includes(query)
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
        console.error('Error al parsear detallesJson:', e);
        this.pedidoEditada.detalles = [];
      }

      // Cargar productos con cantidades desde los detalles
      this.listarProductosDesdePedido();
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

    if (this.pedidoEditada.muni_Descripcion.trim()) {
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
      ? `${dir.diCl_DireccionExacta || 'Dirección sin nombre'} (${cliente?.clie_NombreNegocio || cliente?.clie_Nombres || 'Cliente desconocido'})`
      : 'No seleccionada';

  this.cambiosDetectados.direccionCliente = {
    anterior: formatDireccion(direccionAnterior, clienteAnterior),
    nuevo: formatDireccion(direccionNueva, clienteNuevo),
    label: 'Dirección y Cliente',
  };
}

    try {
      productosOriginal = JSON.parse(this.PedidoData?.detallesJson ?? '[]');
    } catch (e) {
      console.error('Error al parsear detallesJson:', e);
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
      const prod = this.productos.find((p) => parseInt(p.prod_Id) === id);
      return prod ? prod.prod_Descripcion : `ID ${id}`;
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

    if (
      this.pedidoEditada.diCl_Id &&
      this.pedidoEditada.pedi_FechaEntrega &&
      productosSeleccionados.length > 0
    ) {
      const PEActualizar = {
        pedi_Id: this.pedidoEditada.pedi_Id,
        diCl_Id: this.pedidoEditada.diCl_Id,
        vend_Id: getUserId(), // Asumiendo que el usuario actual es el vendedor
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

      console.log('Datos a enviar:', PEActualizar);

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
            console.error('Error al actualizar Punto de Emision:', error);
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
    this.http
      .get<any>(`${environment.apiBaseUrl}/Cliente/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe({
        next: (cliente) => {
          this.Clientes = cliente;
          console.log('Clientes cargados:', this.Clientes);
          this.http
            .get<any>(
              `${environment.apiBaseUrl}/DireccionesPorCliente/Listar`,
              {
                headers: { 'x-api-key': environment.apiKey },
              }
            )
            .subscribe({
              next: (direcciones) => {
                console.log('Direcciones cargadas:', direcciones);
                this.TodasDirecciones = direcciones;
                this.configurarUbicacionInicial();
              },
            });
        },
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
    }
  }

  cargarMunicipios(codigoDepa: number): void {
    this.pedidoEditada.clie_Id = parseInt(codigoDepa.toString());
    console.log('Código del departamento seleccionado:', codigoDepa);
    this.Direcciones = this.TodasDirecciones.filter(
      (m: any) => m.clie_Id === parseInt(codigoDepa.toString())
    );
    this.selectedDireccion = 0;
    this.pedidoEditada.diCl_Id = 0;
  }
}
