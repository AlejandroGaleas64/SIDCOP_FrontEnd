import { Component, Output, EventEmitter, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Categoria } from 'src/app/Modelos/inventario/CategoriaModel';
import { useAnimation } from '@angular/animations';
import { Promocion } from 'src/app/Modelos/inventario/PromocionModel';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnInit, OnChanges {
  mostrarOverlayCarga = false;
  @Input() productoData: Promocion | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Promocion>();

  subcategorias: Categoria[] = [];
  categorias: any[] = [];
  subcategoriasFiltradas: Categoria[] = [];
  categoriaSeleccionada: number = 0;
  marcas: any[] = [];
  proveedores: any[] = [];
  impuestos: any[] = [];
  subcategoriaOriginalDescripcion: string = '';
  categoriaOriginalId: number = 0;
  filtro: string = '';
  seleccionados: number[] = [];
  clientesAgrupados: { canal: string, clientes: any[], filtro: string, collapsed: boolean }[] = [];
  clientesSeleccionados: number[] = [];
  activeTab: number = 1;

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
    prod_Imagen: '',
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
    clientes: '',
    productos: '',
  };

  productoOriginal: any = {};
  imagenSeleccionada = false;
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  constructor(private http: HttpClient, private imageUploadService: ImageUploadService, private cdr: ChangeDetectorRef) {
    this.cargarImpuestos();
    this.listarClientes();
    this.listarProductos();
    console.log(this.productoData);
    console.log(this.producto);
  }

  precioFormatoValido: boolean = true;
  precioValido: boolean = true;

  // Puente booleano para el switch (UI) <-> 'S'/'N' (backend)
  get pagaImpuestoBool(): boolean {
    const v: any = this.producto?.prod_PagaImpuesto;
    // Acepta 'S'/'N' y también boolean por si ya fue mapeado
    if (typeof v === 'string') {
      return v.toUpperCase() === 'S';
    }
    return !!v;
  }

  set pagaImpuestoBool(value: boolean) {
    this.producto.prod_PagaImpuesto = value ? 'S' : 'N';
    if (!value) {
      // Si no paga impuesto, limpiar impuesto seleccionado
      this.producto.impu_Id = 0;
    }
  }

  inicializarProducto(data: Promocion) {
    if (data) {
      
      this.producto = { ...data };
      // Obtener descripción de marca a partir del id al cargar producto
      const marcaActual = this.marcas.find(m => m.marc_Id === this.producto.marc_Id);
      this.producto.marc_Descripcion = marcaActual ? marcaActual.marc_Descripcion : '';
      const proveedorActual = this.proveedores.find(p => p.prov_Id === this.producto.prov_Id);
      this.producto.prov_NombreEmpresa = proveedorActual ? proveedorActual.prov_NombreEmpresa : '';
      this.productoOriginal = { ...this.productoData };
      this.subcategoriaOriginalDescripcion = this.productoData?.subc_Descripcion ?? '';
      this.categoriaOriginalId = this.productoData?.cate_Id ?? 0;
      this.mostrarErrores = false;
      this.cerrarAlerta();
      this.producto.prod_EsPromo = this.producto.prod_EsPromo || 'N';
      this.producto.prod_PagaImpuesto = this.producto.prod_PagaImpuesto || 'N';
      this.producto.impu_Id = this.producto.impu_Id || 0;
<<<<<<< Updated upstream
      console.log('Productos cargados:', this.producto);
=======

   
>>>>>>> Stashed changes
      // Parseo seguro de clientes
      let clientesLista: any[] = [];
      try {
        const jsonRaw = this.producto.clientes?.replace(/\\"/g, '"').replace(/^"|"$/g, '') ?? '[]';
        clientesLista = JSON.parse(jsonRaw);
      } catch (error) {
<<<<<<< Updated upstream
        console.warn('Error parsing clientes JSON:', error);
        console.log('Raw clientes data:', this.producto.clientes);
=======

>>>>>>> Stashed changes
        clientesLista = [];
      }

      // Parseo seguro de productos
      let productosLista: any[] = [];
      try {
     
        let productosRaw = this.producto.productos ?? '[]';
<<<<<<< Updated upstream
        console.log('Raw productos data:', productosRaw);
=======

>>>>>>> Stashed changes
        
       
         if (typeof productosRaw === 'string') {
          productosRaw = productosRaw.trim();
          // Si está doblemente serializado (ej: '"[...]"'), quita las comillas externas
          if (productosRaw.startsWith('"') && productosRaw.endsWith('"')) {
            productosRaw = productosRaw.slice(1, -1);
          }
          // Reemplaza comillas escapadas
          productosRaw = productosRaw.replace(/\\"/g, '"');
        }

        productosLista = JSON.parse(productosRaw);
        
      } catch (error) {
<<<<<<< Updated upstream
        console.warn('Error parsing productos JSON:', error);
        console.log('Raw productos data:', this.producto.productos);
=======
      
>>>>>>> Stashed changes
        productosLista = [];
      }

      // Si solo necesitas los IDs
      const clientesIds = clientesLista.map((c: any) => c.id);
      // Importante: crear copias para evitar referencias compartidas que impidan detectar cambios
      this.producto.idClientes = [...clientesIds];
<<<<<<< Updated upstream
      console.log('Productos lista:', productosLista);
=======
   
>>>>>>> Stashed changes
      // Transformar y aplicar las cantidades de productos seleccionados
      if (productosLista.length > 0) {
  // Normaliza los IDs si vienen como 'id' en vez de 'prod_Id'
  productosLista = productosLista.map((item: any) => ({
    prod_Id: item.prod_Id ?? item.id,
    cantidad: parseInt(item.cantidad) || 0
  }));

  // Crear un mapa de cantidades por producto ID
  const cantidadesPorProducto = new Map<number, number>();
  productosLista.forEach((item: any) => {
    const prodId = parseInt(item.prod_Id);
    const cantidad = item.cantidad;
    cantidadesPorProducto.set(prodId, cantidad);
  });

  // Actualizar las cantidades en los productos existentes
  this.productos.forEach((producto: any) => {
    const cantidadGuardada = cantidadesPorProducto.get(producto.prod_Id);
    if (cantidadGuardada !== undefined) {
      producto.cantidad = cantidadGuardada;
    }
  });

  this.producto.productos_Json = productosLista.map((item: any) => ({
    prod_Id: item.prod_Id,
    prDe_Cantidad: item.cantidad
  }));

<<<<<<< Updated upstream
  console.log('Cantidades aplicadas a productos:', cantidadesPorProducto);
=======

>>>>>>> Stashed changes
}
      
      // Copia independiente para que las mutaciones del UI no modifiquen el arreglo original por referencia
      this.clientesSeleccionados = [...clientesIds];
      
<<<<<<< Updated upstream
      console.log('Clientes seleccionados cargados:', this.clientesSeleccionados);
      console.log('Productos cargados:', this.productos);
=======
    
>>>>>>> Stashed changes

  }}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productoData'] && changes['productoData'].currentValue) {
      this.inicializarProducto(changes['productoData'].currentValue);
    }
  }

  ngOnInit(): void {
    // Puedes dejar la lógica aquí para el primer render
    if (this.productoData) {
      this.inicializarProducto(this.productoData);
    }
  }

  validarPrecioUnitario() {
    const valor = this.producto.prod_PrecioUnitario;
    // Convertir a string para validar con regex
    const valorStr = valor?.toString() || "";
    // Validar si el valor cumple el formato 10 enteros + 2 decimales
    const regex = /^\d{1,10}(\.\d{1,2})?$/;

    this.precioFormatoValido = regex.test(valorStr);
    this.precioValido = !valor && this.precioFormatoValido && Number(valor) > 8.20;
  }

  onPagaImpuestoChange() {
    if (!this.pagaImpuestoBool) {
      this.producto.impu_Id = 0;
    }
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

  cargarImpuestos() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Impuestos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.impuestos = data;},
      error => {
        console.error('Error al cargar los impuestos:', error);
      }
    );
  }

  onImagenSeleccionada(event: any) {
    // Obtenemos el archivo seleccionado desde el input tipo file
    const file = event.target.files[0];
    if (file) {
      this.mostrarOverlayCarga = true;
      
      // Crear una URL temporal para mostrar la imagen inmediatamente
      const tempImageUrl = URL.createObjectURL(file);
      this.producto.prod_Imagen = tempImageUrl;
      
      this.imageUploadService.uploadImageAsync(file)
        .then(imagePath => {
          // Construir la URL completa para mostrar la imagen
          const baseUrl = environment.apiBaseUrl.replace('/api', '');
          this.producto.prod_Imagen = `${baseUrl}/${imagePath.startsWith('/') ? imagePath.substring(1) : imagePath}`;
          this.mostrarOverlayCarga = false;
<<<<<<< Updated upstream
          console.log('Imagen subida correctamente:', this.producto.prod_Imagen);
=======
 
>>>>>>> Stashed changes
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

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/agotado.png';
  }

  cancelar(): void {
    this.activeTab = 1
    this.cerrarAlerta();
    this.producto = { ...this.productoOriginal };
    this.productoData = null;
    this.seleccionados = [];
    this.clientesSeleccionados = [];
    this.productos.forEach(producto => producto.cantidad = 0);
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

  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cambiosDetectados: any = {};

  hayDiferencias(): boolean {
    const a = this.producto;
    const b = this.productoOriginal;
    this.cambiosDetectados = {};

    // Verificar cada campo y almacenar los cambios
    if (a.prod_Codigo !== b.prod_Codigo) {
      this.cambiosDetectados.codigo = {
        anterior: b.prod_Codigo,
        nuevo: a.prod_Codigo,
        label: 'Código del Producto'
      };
    }

    if (a.prod_PagaImpuesto !== b.prod_PagaImpuesto) {
      this.cambiosDetectados.pagaImpuesto = {
        anterior: (b.prod_PagaImpuesto ?? '').toString().toUpperCase() === 'S' ? 'Sí' : 'No',
        nuevo: (a.prod_PagaImpuesto ?? '').toString().toUpperCase() === 'S' ? 'Sí' : 'No',
        label: 'Paga Impuesto'
      };
    }

    if (
  JSON.stringify(this.clientesSeleccionados.slice().sort()) !==
  JSON.stringify((a.idClientes ?? []).slice().sort())
) {

  const getNombreNegocio = (id: number) => {
    for (const grupo of this.clientesAgrupados) {
      const cliente = grupo.clientes.find((c: any) => c.clie_Id === id);
      if (cliente) return cliente.clie_NombreNegocio || cliente.clie_NombreComercial || cliente.clie_NombreCompleto || id;
    }
    return id;
  };

  this.cambiosDetectados.clientes = {
    anterior: (a.idClientes ?? []).map(getNombreNegocio).join(', ') || 'Sin clientes',
    nuevo: this.clientesSeleccionados.map(getNombreNegocio).join(', ') || 'Sin clientes',
    label: 'Clientes'
  };
}

const productosOriginal = (a.productos_Json ?? []).map((p: any) => ({
  prod_Id: p.prod_Id ?? p.id,
  cantidad: p.prDe_Cantidad ?? p.cantidad ?? 0
}));
const productosActual = this.obtenerProductosSeleccionados().map((p: any) => ({
  prod_Id: p.prod_Id ?? p.id,
  cantidad: p.prDe_Cantidad ?? p.cantidad ?? 0
}));

// Función para obtener la descripción del producto por ID
const getDescripcionProducto = (id: number) => {
  const prod = this.productos.find((p: any) => p.prod_Id === id);
  return prod ? prod.prod_Descripcion : `ID ${id}`;
};

// Serializar para comparar
const serializeProductos = (arr: any[]) =>
  arr
    .sort((a, b) => a.prod_Id - b.prod_Id)
    .map(p => `${p.prod_Id}:${p.cantidad}`)
    .join(',');

if (serializeProductos(productosOriginal) !== serializeProductos(productosActual)) {
  this.cambiosDetectados.productos = {
    anterior: productosOriginal.length
      ? productosOriginal.map((p: { prod_Id: number; cantidad: number }) => `${getDescripcionProducto(p.prod_Id)} (x${p.cantidad})`).join(', ')
      : 'Sin productos',
    nuevo: productosActual.length
      ? productosActual.map(p => `${getDescripcionProducto(p.prod_Id)} (x${p.cantidad})`).join(', ')
      : 'Sin productos',
    label: 'Productos seleccionados'
  };
}


    if (a.prod_Imagen !== b.prod_Imagen) {
    this.cambiosDetectados.imagen = {
      anterior: b.prod_Imagen ? 'Imagen actual' : 'Sin imagen',
      nuevo: a.prod_Imagen ? 'Nueva imagen' : 'Sin imagen',
      label: 'Imagen del Producto'
    };
  }

    

    if (a.prod_Descripcion !== b.prod_Descripcion) {
      this.cambiosDetectados.descripcion = {
        anterior: b.prod_Descripcion,
        nuevo: a.prod_Descripcion,
        label: 'Descripción del Producto'
      };
    }

    if (a.prod_DescripcionCorta !== b.prod_DescripcionCorta) {
      this.cambiosDetectados.descripcionCorta = {
        anterior: b.prod_DescripcionCorta,
        nuevo: a.prod_DescripcionCorta,
        label: 'Descripción Corta del Producto'
      };
    }

    

    

    if (a.prod_PrecioUnitario !== b.prod_PrecioUnitario) {
      this.cambiosDetectados.precioUnitario = {
        anterior: b.prod_PrecioUnitario,
        nuevo: a.prod_PrecioUnitario,
        label: 'Precio Unitario'
      };
    }

    

    if (a.impu_Id !== b.impu_Id) {
      this.cambiosDetectados.impuesto = {
        anterior: b.impu_Descripcion,
        nuevo: a.impu_Descripcion,
        label: 'Impuesto'
      };
    }

    if (a.prod_Imagen !== b.prod_Imagen) {
      this.cambiosDetectados.imagen = {
        anterior: b.prod_Imagen ? 'Imagen actual' : 'Sin imagen',
        nuevo: a.prod_Imagen ? 'Nueva imagen' : 'Sin imagen',
        label: 'Imagen del Producto'
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  validarEdicion(): void {
    this.mostrarErrores = true;
    const productosSeleccionados = this.obtenerProductosSeleccionados();
    if (
      this.producto.prod_Codigo.trim() &&
      this.producto.prod_Descripcion.trim() &&
      this.producto.prod_DescripcionCorta.trim() &&
      this.producto.prod_PrecioUnitario != null &&  
      this.producto.prod_PrecioUnitario >= 0 &&
      this.clientesSeleccionados.length > 0 &&
      productosSeleccionados.length > 0 
    ) {
      // const hayCambios = 
      //   this.producto.prod_Imagen !== this.productoData?.prod_Imagen ||
      //   this.producto.prod_Codigo.trim() !== this.productoData?.prod_Codigo?.trim() ||
      //   this.producto.prod_Descripcion.trim() !== this.productoData?.prod_Descripcion?.trim() ||
      //   this.producto.prod_DescripcionCorta.trim() !== this.productoData?.prod_DescripcionCorta?.trim() ||
      //   this.producto.subc_Id !== this.productoData?.subc_Id ||
      //   this.producto.marc_Id !== this.productoData?.marc_Id ||
      //   this.producto.prov_Id !== this.productoData?.prov_Id ||
      //   this.producto.prod_PrecioUnitario !== this.productoData?.prod_PrecioUnitario ||
      //   this.producto.prod_CostoTotal !== this.productoData?.prod_CostoTotal
      if (this.hayDiferencias()) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
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

  private guardar(): void {
    this.mostrarErrores = true;

    if (
      this.producto.prod_Codigo.trim() &&
      this.producto.prod_Descripcion.trim() &&
      this.producto.prod_DescripcionCorta.trim() &&
      this.producto.prod_PrecioUnitario != null &&
      this.producto.prod_PrecioUnitario >= 0
    ) {
      const productosSeleccionados = this.obtenerProductosSeleccionados();
      // Mapear correctamente boolean -> 'S'/'N'
      this.producto.prod_PagaImpuesto = this.pagaImpuestoBool ? 'S' : 'N';
      const promocionActualizar = {
        ...this.producto,
        usua_Modificacion: getUserId(),
        prod_FechaModificacion: new Date(),
        idClientes: this.clientesSeleccionados,
        productos: '',
        clientes: '',
        productos_Json: productosSeleccionados,

      }

      if (this.producto.prod_PagaImpuesto === 'S' && !this.producto.impu_Id) {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Debe seleccionar un impuesto si el producto paga impuesto.';
        setTimeout(() => this.cerrarAlerta(), 4000);
        return;
      }
<<<<<<< Updated upstream
      console.log('Datos a actualizar:', promocionActualizar);
=======

>>>>>>> Stashed changes
      this.mostrarOverlayCarga = true;
      this.http.put<any>(`${environment.apiBaseUrl}/Promociones/Actualizar`, promocionActualizar, {
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
            this.mensajeError = response?.data?.message_Status || 'No se pudo actualizar el producto.';
            this.mostrarAlertaExito = false;

            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        },
        error: (error) => {
          this.mostrarOverlayCarga = false;
          this.mostrarAlertaError = true;
          this.mensajeError = error?.error?.data?.message_Status || 'Error al actualizar el producto. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
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
} 