import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Categoria } from 'src/app/Modelos/inventario/CategoriaModel';
import { useAnimation } from '@angular/animations';
import { Promocion } from 'src/app/Modelos/inventario/PromocionModel';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  mostrarOverlayCarga = false;
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  subcategorias: Categoria[] = [];
  categorias: any[] = [];
  subcategoriasFiltradas: Categoria[] = [];
  categoriaseleccionada: any[] = [];
  marcas: any[] = [];
  promociones: any[] = [];
  proveedores: any[] = [];
  impuestos: any[] = [];
  filtro: string = '';
  seleccionados: number[] = [];
  clientesAgrupados: { canal: string, clientes: any[], filtro: string, collapsed: boolean }[] = [];
  clientesSeleccionados: number[] = [];
  activeTab: number = 1;
  change(event: any) {
  }
  categoria: Categoria = {
    cate_Id: 0,
    cate_Descripcion: '',
    cate_Estado: true,
    cate_FechaCreacion: new Date(),
    cate_FechaModificacion: new Date(),
    usua_Creacion: 0, 
    usua_Modificacion: 0,
    code_Status: 0,
    subc_Id: 0,
    subC_Descripcion: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    message_Status: ''
  }

  producto: Promocion = {
    prod_Id: 0,
    prod_Codigo: '',
    prod_CodigoBarra: '',
    prod_Descripcion: '',
    prod_DescripcionCorta: '',
    prod_Imagen: 'assets/images/users/32/agotado.png',
    cate_Id: 0,
    cate_Descripcion: '',
    prod_Peso: 0,
    unPe_Id: 0,
    subc_Id: 0,
    marc_Id: 0,
    prov_Id: 0,
    impu_Id: 0,
    prod_PrecioUnitario: 0,
    prod_PagaImpuesto: "S",
    prod_EsPromo: "",
    prod_Impulsado: false,
    prod_Estado: true,
    usua_Creacion: 0,
    prod_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    prod_FechaModificacion: new Date(),
    marc_Descripcion: '',
    prov_NombreEmpresa: '',
    subc_Descripcion: '',
    impu_Descripcion: '',
    promDesc: '',
    secuencia: 0,
    code_Status: 0,
    message_Status: '',
  };

  precioFormatoValido: boolean = true;
  precioValido: boolean = true;

  constructor(
    private http: HttpClient,
    private imageUploadService: ImageUploadService
  ) {
    this.cargarPromos();
    this.cargarImpuestos();
    this.listarClientes();
    this.listarProductos();
  }

  ngOnInit() {
    this.producto.prod_EsPromo = this.producto.prod_EsPromo || 'N';
    this.producto.prod_PagaImpuesto = this.producto.prod_PagaImpuesto || 'N';
    this.producto.impu_Id = this.producto.impu_Id || 0;
    this.cargarPromos();
 // si usas todo el listado para algo
    if (this.categoria.cate_Id) {
      this.filtrarSubcategoriasPorCategoria(this.categoria.cate_Id);
    }
  }

  validarPrecioUnitario() {
    const valor = this.producto.prod_PrecioUnitario;
    // Convertir a string para validar con regex
    const valorStr = valor?.toString() || "";
    // Validar si el valor cumple el formato 10 enteros + 2 decimales
    const regex = /^\d{1,10}(\.\d{1,2})?$/;

    this.precioFormatoValido = regex.test(valorStr);
    this.precioValido = !valor && this.precioFormatoValido && Number(valor) > 0;
  }

  onPagaImpuestoChange() {
    if (!this.producto.prod_PagaImpuesto) {
      this.producto.impu_Id = 0;
    }
  }

  onCategoriaChange(event: any) {
    const categoriaId = this.producto.cate_Id;
    if (categoriaId === undefined || categoriaId === 0) {
      this.subcategoriasFiltradas = [];
      this.producto.subc_Id = 0;
      return;
    }
    console.log('Filtrando subcategorías para categoría:', categoriaId);
    this.filtrarSubcategoriasPorCategoria(categoriaId);
  }

  listarClientes(): void {
      this.http.get<any>(`${environment.apiBaseUrl}/Cliente/Listar`, {
          headers: { 'x-api-key': environment.apiKey }
        }).subscribe((data) => {
      const agrupados: { [canal: string]: any[] } = {};
  
      for (const cliente of data) {
        const canal = cliente.cana_Descripcion || 'Sin canal';
        if (!agrupados[canal]) {
          agrupados[canal] = [];
        }
        agrupados[canal].push(cliente);
      }
  
      this.clientesAgrupados = Object.keys(agrupados).map(canal => ({
        canal,
        filtro: '', // Se agrega filtro para el buscador individual
        clientes: agrupados[canal],
        collapsed: true // Inicialmente todos los canales están expandidos
      }));
    });
  }



  cargarPromos() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Promociones/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.promociones = data; this.producto.prod_Codigo = this.generarSiguienteCodigo();},
      error => {
        console.error('Error al cargar las promociones:', error);
      }
    );
  }



  cargarImpuestos() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Impuestos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.impuestos = data;},
      error => {
        console.error('Error al cargar los impuestos:', error);
      }
    );
  }

  

  isCargandoSubcategorias: boolean = false;

  filtrarSubcategoriasPorCategoria(categoriaId: number) {
    console.log('Filtrando subcategorías para categoría:', categoriaId);
    if (!categoriaId) {
      this.subcategoriasFiltradas = [];
      this.producto.subc_Id = 0;
      this.isCargandoSubcategorias = false;
      return;
    }
    this.isCargandoSubcategorias = true; // comienza carga  
    const categoriaBuscar: Categoria = {
      cate_Id: categoriaId,
      cate_Descripcion: '',
      cate_Estado: true,
      cate_FechaCreacion: new Date(),
      cate_FechaModificacion: new Date(),
      usua_Creacion: 0, 
      usua_Modificacion: 0,
      code_Status: 0,
      subc_Id: 0,
      subC_Descripcion: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      message_Status: ''
    }
    this.http.post<{data: Categoria[]}>(`${environment.apiBaseUrl}/Categorias/FiltrarSubcategorias`, categoriaBuscar, {
      headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
    }).subscribe(response  => {
      console.log('Subcategorías recibidas:', response);
      this.subcategoriasFiltradas = response.data;
      console.log('Subcategorías filtradas:', this.subcategoriasFiltradas);
      this.producto.subc_Id = 0; // Reset subcategory selection
      this.isCargandoSubcategorias = false; // terminó carga
    }, error => {
      console.error('Error al filtrar subcategorías por categoría:', error);
      this.subcategoriasFiltradas = [];
      this.isCargandoSubcategorias = false; // error, pero terminó carga
    });
  }

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.producto = {
      prod_Id: 0,
      prod_Codigo: '',
      prod_CodigoBarra: '',
      prod_Descripcion: '',
      prod_DescripcionCorta: '',
      prod_Imagen: 'assets/images/users/32/agotado.png',
      cate_Id: 0,
      cate_Descripcion: '',
      prod_Peso: 0,
      unPe_Id: 0,
      subc_Id: 0,
      marc_Id: 0,
      prov_Id: 0,
      impu_Id: 0,
      prod_PrecioUnitario: 0,
      prod_PagaImpuesto: "",
      prod_EsPromo: "",
      prod_Impulsado: false,
      prod_Estado: true,
      usua_Creacion: 0,
      prod_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      prod_FechaModificacion: new Date(),
      marc_Descripcion: '',
      prov_NombreEmpresa: '',
      subc_Descripcion: '',
      impu_Descripcion: '',
      promDesc: '',
      secuencia: 0,
      code_Status: 0,
      message_Status: '',
    };
    this.producto.prod_Codigo = this.generarSiguienteCodigo();
    this.activeTab = 1
    this.clientesSeleccionados = [];
    this.productos = [];
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

      guardar(): void {
        console.log('guardar() llamado');
        this.mostrarErrores = true;
        if (this.producto.prod_Codigo.trim() && this.producto.prod_Descripcion.trim() && this.producto.prod_DescripcionCorta.trim() 
          && (this.producto.prod_PrecioUnitario != null && this.producto.prod_PrecioUnitario >= 0) )

        {
          const productosSeleccionados = this.obtenerProductosSeleccionados();
          this.mostrarAlertaWarning = false;
          this.mostrarAlertaError = false;
          const promocionGuardar = {
            prod_Id: 0,
            secuencia: 0,
            prod_Codigo: this.producto.prod_Codigo.trim(),
            prod_CodigoBarra: '',
            prod_Descripcion: this.producto.prod_Descripcion.trim(),
            prod_DescripcionCorta: this.producto.prod_DescripcionCorta.trim(),
            prod_Imagen: this.producto.prod_Imagen,
            cate_Id: 0,
            cate_Descripcion: '',
            subc_Id: 0,
            marc_Id: 0,
            prov_Id: 0,
            impu_Id: this.producto.prod_PagaImpuesto ? Number(this.producto.impu_Id) : 0,
            prod_PrecioUnitario: Number(this.producto.prod_PrecioUnitario),
            prod_CostoTotal: 0,
            prod_PagaImpuesto: this.producto.prod_PagaImpuesto ? 'S' : 'N',
            prod_EsPromo: 'N',
            prod_Estado: true,
            usua_Creacion: getUserId(),
            prod_FechaCreacion: new Date().toISOString(),
            usua_Modificacion: 0,
            prod_FechaModificacion: new Date().toISOString(),
            marc_Descripcion: '',
            prov_NombreEmpresa: '',
            subc_Descripcion: '',
            impu_Descripcion: '',
            usuarioCreacion: '',
            usuarioModificacion: '',
             idClientes: this.clientesSeleccionados,
            productos: '',
            clientes: '',
            productos_Json: productosSeleccionados,
          };
          console.log(promocionGuardar);
          if (this.producto.prod_PagaImpuesto) {
            promocionGuardar.impu_Id = Number(this.producto.impu_Id);
          }
          console.log('Datos a enviar:', promocionGuardar);
          this.http.post<any>(`${environment.apiBaseUrl}/Promociones/Insertar`, promocionGuardar, {
            headers: { 
              'X-Api-Key': environment.apiKey,
              'Content-Type': 'application/json',
              'accept': '*/*'
            }
          }).subscribe({
            next: (response) => {
              this.mostrarOverlayCarga = false;
              if (response?.data?.code_Status === 1) {
                this.mostrarErrores = false;

                setTimeout(() => {
                  this.mostrarAlertaExito = false;
                  this.onSave.emit(this.producto);
                  this.cancelar();
                }, 3000);
              } else {
                this.mostrarAlertaError = true;
                this.mensajeError = response?.data?.message_Status || 'No se pudo crear la promocion.';
                this.mostrarAlertaExito = false;

                setTimeout(() => {
                  this.mostrarAlertaError = false;
                  this.mensajeError = '';
                }, 5000);
              }
        
            },
            error: (error) => {
              console.error('Error HTTP detectado:', error);
              console.error('Error completo:', error);
              if (error.status === 400) {
                console.error('400 Bad Request:', error.error); // posible detalle del error
              }
              this.mostrarAlertaError = true;
              this.mensajeError = 'Error al guardar la promocion. Por favor, revise los datos e intente nuevamente.';
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            }
            // error: (error) => {
            //   console.error('Error completo:', error); // ⬅️ Esto es clave
            //   console.error('Detalle del error:', error.error);
            //   this.mostrarAlertaError = true;
            //   this.mensajeError = 'Error al guardar el producto. Por favor, intente nuevamente.';
            //   this.mostrarAlertaExito = false;
            //   setTimeout(() => {
            //     this.mostrarAlertaError = false;
            //     this.mensajeError = '';
            //   }, 5000);
            // }
          });
        } else {
          if(this.producto.prod_PrecioUnitario == null || this.producto.prod_PrecioUnitario < 0) {
            this.mostrarAlertaWarning = true;
            this.mensajeWarning = 'El precio unitario debe ser mayor o igual a 0.';
            this.mostrarAlertaError = false;
            this.mostrarAlertaExito = false;
          }
          else{
          this.mostrarAlertaWarning = true;
          this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
          this.mostrarAlertaError = false;
          this.mostrarAlertaExito = false;
          }
          setTimeout(() => {
            this.mostrarAlertaWarning = false;
            this.mensajeWarning = '';
          }, 4000);
        }
  }

  onImagenSeleccionada(event: any) {
    // Obtenemos el archivo seleccionado desde el input tipo file
    const file = event.target.files[0];

    if (file) {
      // Mostrar indicador de carga
      this.mostrarOverlayCarga = true;
      
      // Crear una URL temporal para mostrar la imagen inmediatamente
      const tempImageUrl = URL.createObjectURL(file);
      this.producto.prod_Imagen = tempImageUrl;
      
      // Usar el servicio de carga de imágenes
      this.imageUploadService.uploadImageAsync(file)
        .then(imagePath => {
          // Construir la URL completa para mostrar la imagen
          const baseUrl = environment.apiBaseUrl.replace('/api', '');
          this.producto.prod_Imagen = `${baseUrl}/${imagePath.startsWith('/') ? imagePath.substring(1) : imagePath}`;
          this.mostrarOverlayCarga = false;
          console.log('Imagen subida correctamente:', this.producto.prod_Imagen);
        })
        .catch(error => {
          console.error('Error al subir la imagen:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al subir la imagen. Por favor, intente nuevamente.';
          this.mostrarOverlayCarga = false;
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 3000);
        });
    }
  }


  validarPasoActual(): boolean {
  switch (this.activeTab) {
    case 1: // Información general
      return this.validarPasoInformacionGeneral();
    case 2: // Aplica para
    const productosSeleccionados = this.obtenerProductosSeleccionados();
      return productosSeleccionados.length > 0;
    case 3: // Clientes
      return this.clientesSeleccionados.length > 0;
    default:
      return false;
  }
}

validarPasoInformacionGeneral(): boolean {
  const d = this.producto;
    console.log('Validando paso de Información General:', d);
  const isv = d.prod_PagaImpuesto? 'S' : 'N';
  return !!d.prod_Codigo?.trim()
    && !!d.prod_Descripcion?.trim()
    && !!d.prod_DescripcionCorta?.trim()
    && d.prod_PrecioUnitario != null
    && d.prod_PrecioUnitario > 0
     && (
      (isv === 'N') ||
      (isv === 'S'  && d.impu_Id != null && d.impu_Id > 0)
    );


}


irAlSiguientePaso() {
  this.mostrarErrores = true;

  if (this.validarPasoActual()) {
    this.mostrarErrores = false;
   
    this.activeTab ++;
    
  } else {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning= 'Debe Completar todos los campos'

    setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 2000);
    // Podrías mostrar una alerta o dejar que los mensajes de error visibles lo indiquen
  }
}

// Nueva función para navegación inteligente de tabs
navegar(tabDestino: number) {
  // Si intenta ir hacia atrás, permitir siempre
  if (tabDestino < this.activeTab) {
    this.activeTab = tabDestino;
    this.mostrarErrores = false;
    return;
  }
  
  // Si intenta ir hacia adelante, validar todos los pasos intermedios
  if (tabDestino > this.activeTab) {
    // Validar todos los pasos desde el actual hasta el destino
    for (let paso = this.activeTab; paso < tabDestino; paso++) {
      if (!this.validarPaso(paso)) {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = `Debe completar todos los campos del paso ${this.getNombrePaso(paso)} antes de continuar.`;
        
        setTimeout(() => {
          this.mostrarAlertaWarning = false;
          this.mensajeWarning = '';
        }, 3000);
        return;
      }
    }
    
    // Si todos los pasos intermedios están válidos, navegar
    this.activeTab = tabDestino;
    this.mostrarErrores = false;
    return;
  }
  
  // Si es el mismo tab, no hacer nada
  if (tabDestino === this.activeTab) {
    return;
  }
}

// Función auxiliar para validar un paso específico
validarPaso(paso: number): boolean {
  switch (paso) {
    case 1: // Información general
      return this.validarPasoInformacionGeneral();
    case 2: // Aplica para
    const productosSeleccionados = this.obtenerProductosSeleccionados();
      return productosSeleccionados.length > 0;
    case 3: // Clientes
      return this.clientesSeleccionados.length > 0;
    default:
      return false;
  }
}

// Función auxiliar para obtener el nombre del paso
getNombrePaso(paso: number): string {
  switch (paso) {
    case 1: return 'Información General';
    case 2: return 'Productos Relacionados';
    case 3: return 'Clientes';
    default: return 'Paso ' + paso;
  }
}


productos: any[] = [];
  Math = Math; // para usar Math en la plantilla

  // ========== PROPIEDADES PARA BÚSQUEDA Y PAGINACIÓN MEJORADAS ==========
  busquedaProducto = '';
  productosFiltrados: any[] = [];
  paginaActual = 1;
  productosPorPagina = 8;

  listarProductos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.productos = data.map((producto: any) => ({
          ...producto,
          cantidad: 0,
          precio: producto.prod_PrecioUnitario || 0
        }));
        this.aplicarFiltros(); // Usar el nuevo método de filtrado
      },
      error: () => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar productos.';
      }
    });
  }

  // ========== MÉTODOS PARA BÚSQUEDA Y PAGINACIÓN MEJORADOS ==========

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

  getInicioRegistro(): number {
    return (this.paginaActual - 1) * this.productosPorPagina + 1;
  }

  getFinRegistro(): number {
    const fin = this.paginaActual * this.productosPorPagina;
    return Math.min(fin, this.productosFiltrados.length);
  }

  // Método para obtener el índice real del producto en el array principal
  getProductoIndex(prodId: number): number {
    return this.productos.findIndex(p => p.prod_Id === prodId);
  }

  // ========== MÉTODOS DE CANTIDAD MEJORADOS ==========

  aumentarCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (index >= 0 && index < this.productos.length) {
      this.productos[index].cantidad = (this.productos[index].cantidad || 0) + 1;
    }
  }

  disminuirCantidad(prodId: number): void {
    const index = this.getProductoIndex(prodId);
    if (index >= 0 && index < this.productos.length && this.productos[index].cantidad > 0) {
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
    const producto = this.productos.find(p => p.prod_Id === prodId);
    return producto ? (producto.cantidad || 0) : 0;
  }

  obtenerProductosSeleccionados(): any[] {
    return this.productos
      .filter(p => p.cantidad > 0)
      .map(p => ({
        prod_Id: p.prod_Id,
        prDe_Cantidad: p.cantidad
      }));
  }

   getTotalProductosSeleccionados(): number {
    return this.productos
      .filter(producto => producto.cantidad > 0)
      .reduce((total, producto) => total + producto.cantidad, 0);
  }

  trackByProducto(index: number, producto: any): number {
  return producto.prod_Id;
}

getClientesFiltrados(grupo: any): any[] {
  if (!grupo.filtro) return grupo.clientes;
  return grupo.clientes.filter((c: any) => {
    const searchText = (
      c.clie_NombreNegocio || 
      c.clie_NombreComercial || 
      c.clie_NombreCompleto || 
      ''
    ).toLowerCase();
    return searchText.includes(grupo.filtro.toLowerCase());
  });
}

alternarCliente(clienteId: number, checked: boolean): void {
 if (checked) {
    

    this.clientesSeleccionados.push(clienteId);
  } else {
    this.clientesSeleccionados = this.clientesSeleccionados.filter(id => id !== clienteId);
  }
}

onClickCheckbox(event: MouseEvent, clienteId: number) {
  const input = event.target as HTMLInputElement;
  const isChecked = input.checked;

  if (isChecked) {


    this.clientesSeleccionados.push(clienteId);
  } else {
    // Si estaba desmarcando, solo actualizar modelo
    this.clientesSeleccionados = this.clientesSeleccionados.filter(id => id !== clienteId);
  }
}



// Verificar si todos los clientes de un canal están seleccionados
estanTodosSeleccionados(grupo: any): boolean {
  return grupo.clientes.every((c: { clie_Id: number; }) => this.clientesSeleccionados.includes(c.clie_Id));
}

// Seleccionar/deseleccionar todos los clientes de un canal
seleccionarTodosClientes(grupo: any, seleccionar: boolean): void {
  grupo.clientes.forEach((cliente: { clie_Id: number; }) => {
    this.alternarCliente(cliente.clie_Id, seleccionar);
  });
}

// Alternar el estado colapsado/expandido de un canal
toggleCanal(grupo: any): void {
  grupo.collapsed = !grupo.collapsed;
}

generarSiguienteCodigo(): string {
  
  // Supón que tienes un array de promociones existentes llamado promociones
  const codigos = this.promociones
    .map(p => p.prod_Codigo)
    .filter(c => /^PROM-\d{5}$/.test(c));
  if (codigos.length === 0) return 'PROM-00001';

  // Ordena y toma el mayor
  const ultimoCodigo = codigos.sort().pop()!;
  const numero = parseInt(ultimoCodigo.split('-')[1], 10) + 1;
  return `PROM-${numero.toString().padStart(5, '0')}`;
}

}