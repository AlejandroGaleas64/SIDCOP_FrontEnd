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
import { Factura } from 'src/app/Modelos/ventas/Facturas.model';

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

  facturaOriginal: any = null;
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
    //console.log('Vendedor seleccionado:', vendedor);
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
        this.clientesFiltrados = (data || []).filter(cliente => cliente.ruta_Id === rutaId || cliente.clie_Id === 1);
        this.cargando = false;
        // if (this.clientesFiltrados.length === 1) { 
        //   this.visita.cliente = this.clientesFiltrados[0]; 
        // } else { 
        //   this.visita.cliente = null; 
        //   this.visita.direccion = null; 
        // }
        //console.log('Clientes filtrados:', this.clientesFiltrados);
        
      },
      error: () => { 
        this.mostrarMensaje('Error al cargar la lista de clientes', 'error'); 
        this.cargando = false; 
        this.clientesFiltrados = []; 
      }
    });
  }

  onClienteSeleccionado(cliente: any) {
    //console.log('Cliente recibido en onClienteSeleccionado:', cliente);
    
    if (!cliente) { 
      this.direcciones = [];
      this.facturasFiltradas = [];
      this.clienteSeleccionado = null;
      return;
    }

    this.clienteSeleccionado = cliente; // Guardar referencia
    this.cargarDireccionesCliente(cliente.clie_Id);
    //console.log('Cliente seleccionado:', cliente);
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
        //console.log('Direcciones cargadas:', this.direcciones);
        
        // Cargar facturas después de tener las direcciones
        if (this.vendedorSeleccionado && this.direcciones.length > 0) {
          this.cargarYFiltrarFacturas();
        } else if (this.direcciones.length === 0) {
          //console.log('No hay direcciones para este cliente');
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

    //console.log('Cargando facturas para vendedor:', this.vendedorSeleccionado.vend_Id);
    
    this.cargando = true;//${this.vendedorSeleccionado.vend_Id}
    this.http.get<any>(`${environment.apiBaseUrl}/Facturas/ListarConLimiteDevolucion`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (res) => {
        //console.log('Respuesta facturas completa:', res);
        const todasFacturas = res?.data || res || []; // Intentar ambas estructuras

        // Obtener la fecha actual en formato YYYY-MM-DD
        //const fechaActual = new Date().toISOString().split('T')[0];

        // Obtener los IDs de las direcciones
        const direccionesIds = this.direcciones.map(d => d.diCl_Id);
        //console.log('IDs de direcciones:', direccionesIds);

        // Log de las facturas para ver su estructura
        //console.log('Todas las facturas:', todasFacturas);
        if (todasFacturas.length > 0) {
          //console.log('Ejemplo de factura:', todasFacturas[0]);
          //console.log('Campos disponibles:', Object.keys(todasFacturas[0]));
        }

        // Filtrar facturas - revisar diferentes nombres de campo posibles
        this.facturasFiltradas = todasFacturas.filter((factura: any) => {
          // Intentar diferentes nombres de campo que podrían contener el ID de dirección
          const direccionId = factura.dicl_Id || factura.diCl_Id || factura.direccion_Id || factura.cliente_direccion_Id;
          const coincideDireccion = direccionesIds.includes(direccionId);
          const vendedor = factura.vend_Id === this.vendedorSeleccionado.vend_Id;
          // Convertir fact_FechaEmision a formato YYYY-MM-DD para comparar
          const fechaEmision = new Date(factura.fact_FechaEmision).toISOString().split('T')[0];
          //const coincideFecha = fechaEmision === fechaActual;
          
          // Validar que la factura no esté anulada
          const noAnulada = factura.fact_Anulado === false;
          
          if (coincideDireccion && noAnulada) {
            //console.log(`Factura ${factura.fact_Numero || factura.numero} coincide con dirección ${direccionId}, fecha actual y no está anulada`);
          }
          
          return coincideDireccion && noAnulada && vendedor;
        });

        //console.log('Facturas filtradas final:', this.facturasFiltradas);
        
        if (this.facturasFiltradas.length === 0) {
          console.warn('No se encontraron facturas que coincidan con las direcciones del cliente, la fecha actual y que no estén anuladas');
          //console.log('Verificar si el nombre del campo de dirección en las facturas es correcto');
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
        //console.log('Respuesta completa:', res);
        const todasFacturas = res?.data || [];
        
        // Obtener la fecha actual en formato YYYY-MM-DD
        const fechaActual = new Date().toISOString().split('T')[0];
        
        // Solo filtrar si ya tenemos direcciones cargadas
        if (this.direcciones && this.direcciones.length > 0) {
          const direccionesIds = this.direcciones.map(d => d.diCl_Id);
          this.facturasFiltradas = todasFacturas.filter((f: any) => {
            // Convertir fact_FechaEmision a formato YYYY-MM-DD para comparar
            const fechaEmision = new Date(f.fact_FechaEmision).toISOString().split('T')[0];
            // Validar que la factura no esté anulada
            const noAnulada = f.fact_Anulado === false;
            return direccionesIds.includes(f.dicl_Id) && fechaEmision === fechaActual && noAnulada;
          });
        } else {
          // Si no hay direcciones, no mostrar facturas
          this.facturasFiltradas = [];
        }
        //console.log('Facturas filtradas:', this.facturasFiltradas);
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

    // Mantenemos la carga de productos como antes
    this.listarProductos(factura.fact_Id);

    // Además, mostramos los datos completos de la factura
    this.obtenerFacturaCompleta(factura.fact_Id);
  }

  obtenerFacturaCompleta(factId: number) {
    if (!factId) return;

    this.http.get<any>(`${environment.apiBaseUrl}/Facturas/ObtenerCompleta/${factId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (facturaCompleta) => {
        this.facturaOriginal = facturaCompleta;
        //console.log('📄 Factura completa recibida:', facturaCompleta);
      },
      error: (err) => {
        console.error('❌ Error al obtener factura completa:', err);
        this.mostrarMensaje('Error al cargar la factura completa', 'error');
      }
    });
  }

  listarProductos(id: number): void {
    if (!id) return;

    this.cargando = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Productos/BuscarPorFactura/${id}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        // Inicializar productos con la cantidad vendida original como máximo
        this.productos = (data || []).map((producto: any) => ({
          ...producto,
          cantidadVendida: 0, // Cantidad actual seleccionada para devolución
          cantidadOriginal: producto.cantidadVendida || 0, // Cantidad original de la factura (límite máximo)
          observaciones: '',
          stockDisponible: producto.cantidadVendida || 0, // Para mantener compatibilidad
          tieneStock: (producto.cantidadVendida || 0) > 0
        }));
        this.aplicarFiltros();
        //console.log('Productos cargados:', this.productos);
      },
      error: () => this.mostrarMensaje('Error al cargar productos'),
      complete: () => this.cargando = false
    });
  }

  aumentarCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length) {
      const producto = this.productos[index];
      
      // Validar que no exceda la cantidad original de la factura
      if (producto.cantidadVendida >= producto.cantidadOriginal) {
        this.mostrarMensaje(`No puede devolver más de ${producto.cantidadOriginal} unidades de "${producto.prod_Descripcion}". Esta fue la cantidad original vendida., 'advertencia'`);
        return;
      }

      producto.cantidadVendida = (producto.cantidadVendida || 0) + 1;
    }
  }

  disminuirCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length && this.productos[index].cantidadVendida > 0) {
      this.productos[index].cantidadVendida--;
    }
  }

  validarCantidad(index: number): void {
    if (index >= 0 && index < this.productos.length) {
      const producto = this.productos[index];
      let cantidad = producto.cantidadVendida || 0;

      // Validar rango básico
      cantidad = Math.max(0, cantidad);

      // Validar que no exceda la cantidad original de la factura
      if (cantidad > producto.cantidadOriginal) {
        this.mostrarMensaje(`No puede devolver más de ${producto.cantidadOriginal} unidades de "${producto.prod_Descripcion}". Esta fue la cantidad original vendida., 'advertencia'`);
        cantidad = producto.cantidadOriginal;
      }

      producto.cantidadVendida = cantidad;
    }
  }

  // Método para obtener productos que realmente van a devolución (cantidad menor a la original)
  obtenerProductosParaDevolucion(): any[] {
    return this.productos
      .filter(producto => producto.cantidadVendida < producto.cantidadOriginal)
      .map(producto => ({
        prod_Id: producto.prod_Id,
        prod_Descripcion: producto.prod_Descripcion,
        cantidadDevolucion: producto.cantidadOriginal - producto.cantidadVendida, // Cantidad real a devolver
        cantidadVendida: producto.cantidadVendida, // Cantidad que se queda
        cantidadOriginal: producto.cantidadOriginal, // Cantidad original
        observaciones: producto.observaciones || ''
      }));
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
        cantidad: producto.cantidadVendida,
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

  searchVendedor = (term: string, item: any) => {
    if (!term) return true;
    const t = term.toLowerCase();
    const nombre = (item?.vendedorNombre || '').toString().toLowerCase();
    const apellido = (item?.vendedorApellido || '').toString().toLowerCase();
    const ruta = (item?.rutaDescripcion || '').toString().toLowerCase();
    return nombre.indexOf(t) > -1 || apellido.indexOf(t) > -1 || ruta.indexOf(t) > -1;
  }

  searchCliente = (term: string, item: any) => {
    if (!term) return true;
    term = term.toLowerCase();
    return item.clie_Codigo?.toLowerCase().includes(term) || item.clie_Nombres?.toLowerCase().includes(term) || item.clie_Apellidos?.toLowerCase().includes(term) || item.clie_NombreNegocio?.toLowerCase().includes(term);
  };

  guardar() {
    //console.log('\n=== INICIO DE insertarDevolucion ===');
    
    // Validaciones básicas
    if (!this.devolucion.fact_Id) {
      this.mostrarMensaje('Debe seleccionar una factura', 'error');
      return;
    }

    if (!this.devolucion.devo_Motivo || this.devolucion.devo_Motivo.trim() === '') {
      this.mostrarMensaje('Debe ingresar el motivo de la devolución', 'error');
      return;
    }

    if (!this.clienteSeleccionado) {
      this.mostrarMensaje('Debe seleccionar un cliente', 'error');
      return;
    }

    // Obtener productos seleccionados (con cantidad > 0)
    // const productosSeleccionados = this.productos.filter(producto => producto.cantidad > 0);
    
    // if (productosSeleccionados.length === 0) {
    //   this.mostrarMensaje('Debe seleccionar al menos un producto para devolver', 'error');
    //   return;
    // }

    const productosParaDevolver = this.productos.filter(producto => {
      const cantidadADevolver = producto.cantidadVendida || 0;
    
      return cantidadADevolver > 0; // Solo productos con cantidad seleccionada > 0
    });

    //console.log('Total productos evaluados:', this.productos.length);
    //console.log('Productos que cumplen el filtro:', productosParaDevolver.length);

    if (productosParaDevolver.length === 0) {
      this.mostrarMensaje('Debe seleccionar al menos un producto para devolver. Use los controles + y - para establecer la cantidad a devolver.', 'error');
      return;
    }

    //console.log('fact_Id:', this.devolucion.fact_Id);
    //console.log('clie_Id:', this.clienteSeleccionado.clie_Id);
    //console.log('devo_Motivo:', this.devolucion.devo_Motivo);
    //console.log('Productos seleccionados:', this.productos.length);

    // Construir el XML de detalles
  let detalleXml = '<DevolucionDetalle>';
    
    productosParaDevolver.forEach((producto, index) => {
      const cantidadADevolver = producto.cantidadVendida || 0; // Esta es la cantidad que el usuario seleccionó para devolver
      
      //console.log(`  Producto ${index + 1}:`);
      //console.log(`    prod_Id: ${producto.prod_Id}`);
      //console.log(`    cantidadOriginal: ${producto.cantidadOriginal}`);
      //console.log(`    cantidadADevolver: ${cantidadADevolver}`);
      //console.log(`    descripcion: ${producto.prod_Descripcion}`);
      
      // Estructura XML idéntica a Flutter
      detalleXml += `<Producto><Prod_Id>${producto.prod_Id}</Prod_Id><DevD_Cantidad>${cantidadADevolver}</DevD_Cantidad></Producto>`;
    });
    
    detalleXml += '</DevolucionDetalle>';
    
    //console.log('XML generado paso a paso:');
    //console.log('- Inicio XML:', '<DevolucionDetalle>');
    productosParaDevolver.forEach((producto, index) => {
      const cantidadADevolver = producto.cantidadVendida || 0;
      const xmlProducto = `<Producto><Prod_Id>${producto.prod_Id}</Prod_Id><DevD_Cantidad>${cantidadADevolver}</DevD_Cantidad></Producto>`;
      //console.log(`- Producto ${index + 1}:`, xmlProducto);
    });
    //console.log('- Fin XML:', '</DevolucionDetalle>');

    const now = new Date().toISOString();
    const fechaDevolucion = now;
    
    // Obtener el ID del usuario actual
    const usuarioId = getUserId() || 1; // Usar 1 como fallback si no se puede obtener

    // Construir el body de la petición
    const body = {
      devo_Id: 0,
      clie_Id: this.clienteSeleccionado.clie_Id,
      fact_Id: this.devolucion.fact_Id,
      devo_Fecha: fechaDevolucion,
      devo_Motivo: this.devolucion.devo_Motivo.trim(),
      usua_Creacion: usuarioId,
      devo_FechaCreacion: now,
      usua_Modificacion: 0,
      devo_FechaModificacion: now,
      devo_Estado: true,
      nombre_Completo: ' ',
      clie_NombreNegocio: ' ',
      usuarioCreacion: ' ',
      usuarioModificacion: ' ',
      devoDetalle_XML: detalleXml,
      item: []
    };

    //console.log('Body de la petición:', body);
    //console.log('XML generado:', detalleXml);

    //console.log('FACTURA ID A ELIMINAR:', this.devolucion.fact_Id);
    this.cargando = true;
    this.mostrarErrores = false;

    this.http.post<any>(`${environment.apiBaseUrl}/Devoluciones/Insertar`, body, {
      headers: { 
        'x-api-key': environment.apiKey,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        //console.log('Respuesta del servidor:', response);
        
        if (response && response.success === true) {
          this.mostrarMensaje('Devolución creada exitosamente', 'exito');
          
          this.anularFactura(this.devolucion.fact_Id);

          this.crearFacturaConProductosRestantes();
          // Limpiar el formulario después de guardar
          this.limpiarFormularioCompleto();
          
          // Emitir evento de guardado exitoso
          this.onSave.emit(response);
          // Opcional: navegar a otra página o cerrar el formulario
          // this.router.navigate(['/devoluciones']);
        } else {
          const mensajeError = response?.message || 'Error al procesar la devolución';
          this.mostrarMensaje(mensajeError, 'error');
        }
      },
      error: (error) => {
        console.error('Error en insertarDevolucion:', error);
        
        let mensajeError = 'Error al crear la devolución';
        
        if (error.error?.message) {
          mensajeError = error.error.message;
        } else if (error.message) {
          mensajeError = error.message;
        } else if (error.status) {
          mensajeError = `Error en la solicitud: ${error.status}`;
        }
        
        this.mostrarMensaje(mensajeError, 'error');
      },
      complete: () => {
        this.cargando = false;
      }
    });
  }

  // Método para generar número de factura aleatorio con el formato 000-000-00-00000000
  generarNumeroFacturaAleatorio(): string {
    const pad = (num: number, size: number) => {
      let s = num.toString();
      while (s.length < size) s = '0' + s;
      return s;
    };

    const part1 = pad(this.getRandomInt(1, 999), 3);
    const part2 = pad(this.getRandomInt(1, 999), 3);
    const part3 = pad(this.getRandomInt(1, 99), 2);
    const part4 = pad(this.getRandomInt(1, 99999999), 8);

    return `${part1}-${part2}-${part3}-${part4}`;
  }

  getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Nuevo método para crear la factura con productos restantes
  crearFacturaConProductosRestantes(): void {
    if (!this.facturaOriginal) {
      this.mostrarMensaje('No se ha cargado la factura original', 'error');
      return;
    }

    if (!this.clienteSeleccionado || !this.vendedorSeleccionado) {
      this.mostrarMensaje('Faltan datos de cliente o vendedor para crear la factura', 'error');
      return;
    }
    
    // Filtrar solo productos con cantidadVendida > 0 (productos restantes)
    const productosRestantes = this.productos
      .filter(p => p.cantidadVendida < p.cantidadOriginal)
      .map(p => ({
        prod_Id: p.prod_Id,
        faDe_Cantidad: p.cantidadOriginal - p.cantidadVendida
      }));

    if (productosRestantes.length === 0) {
      this.mostrarMensaje('No hay productos restantes para crear la nueva factura', 'advertencia');
      return;
    }

    // Generar nuevo número de factura aleatorio
    const nuevoNumero = this.generarNumeroFacturaAleatorio();

    // Construir el body para la nueva factura
    const body = {
      fact_Numero: nuevoNumero,
      fact_TipoDeDocumento: this.facturaOriginal.fact_TipoDeDocumento || '01',
      regC_Id: this.facturaOriginal.regC_Id || 21,
      diCl_Id: this.facturaOriginal.diCl_Id || this.direcciones[0]?.diCl_Id || 0,
      vend_Id: this.vendedorSeleccionado.vend_Id,
      fact_TipoVenta: this.facturaOriginal.fact_TipoVenta || 'CONTADO',
      fact_FechaEmision: new Date().toISOString(),
      fact_Latitud: this.facturaOriginal.fact_Latitud || 14.123456,
      fact_Longitud: this.facturaOriginal.fact_Longitud || -87.123456,
      fact_Referencia: `Factura ajustada por devolución - Original: ${this.facturaOriginal.fact_Numero}`,
      fact_AutorizadoPor: this.facturaOriginal.fact_AutorizadoPor || 'yo',
      usua_Creacion: getUserId(),
      detallesFacturaInput: productosRestantes
    };

    //console.log('Creando nueva factura:', body);

    this.http.post<any>(`${environment.apiBaseUrl}/Facturas/Insertar`, body, {
      headers: {
        'x-api-key': environment.apiKey,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        //console.log('Nueva factura creada:', response);
        if (response && (response.success === true || response.Success === true)) {
          this.mostrarMensaje('Nueva factura creada exitosamente', 'exito');
        } else {
          this.mostrarMensaje(response?.message || 'Error al crear la nueva factura', 'error');
        }
      },
      error: (error) => {
        const errMsg = error.error?.message || error.message || 'Error en la creación de la factura';
        this.mostrarMensaje(errMsg, 'error');
      }
    });
  }


  anularFactura(fact_Id: number) {
    // if (!fact_Id) {
    //   console.error('No se proporcionó un ID de factura válido para anular');
    //   this.mostrarMensaje('Error: No se puede anular la factura sin un ID válido', 'error');
    //   return;
    // }
    
    //console.log('Anulando factura con ID:', fact_Id);

    // Obtener el ID del usuario actual
    const usuarioId = getUserId() || 1;

    const body = {
      fact_Id: fact_Id,
      motivo: this.devolucion.devo_Motivo || 'Anulación por devolución',
      usua_Modificacion: usuarioId
    };

    //console.log('Body para anular factura:', body);

    this.http.post<any>(`${environment.apiBaseUrl}/Facturas/AnularFactura`, body, {
      headers: { 
        'x-api-key': environment.apiKey,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        //console.log('Respuesta de anulación de factura:', response);
        
        if (response && (response.success === true || response.Success === true)) {
          //console.log('Factura anulada exitosamente');
          this.mostrarMensaje('Factura anulada exitosamente', 'exito');
        } else {
          console.warn('Respuesta inesperada al anular factura:', response);
          // Aunque la respuesta no tenga el formato esperado, 
          // si no hay error HTTP, podríamos considerar que fue exitoso
          this.mostrarMensaje('Factura procesada para anulación', 'exito');
        }
      },
      error: (error) => {
        console.error('Error al anular la factura:', error);
        
        let mensajeError = 'Error al anular la factura';
        
        if (error.error?.message) {
          mensajeError += ': ' + error.error.message;
        } else if (error.message) {
          mensajeError += ': ' + error.message;
        } else if (error.status) {
          mensajeError += ` (HTTP ${error.status})`;
        }
        
        this.mostrarMensaje(mensajeError, 'error');
      }
    });
  }

  // Método auxiliar para limpiar el formulario completo
  limpiarFormularioCompleto() {
    // Resetear el objeto devolucion
    this.devolucion = {
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

    // Limpiar selecciones
    this.vendedorSeleccionado = null;
    this.clienteSeleccionado = null;

    // Limpiar arrays
    this.clientesFiltrados = [];
    this.facturasFiltradas = [];
    this.direcciones = [];
    this.productos = [];
    this.productosFiltrados = [];

    // Resetear búsqueda y paginación
    this.busquedaProducto = '';
    this.paginaActual = 1;

    // Limpiar estados de error
    this.mostrarErrores = false;
    this.cerrarAlerta();
  }
}
