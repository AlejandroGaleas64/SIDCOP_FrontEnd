import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Producto } from 'src/app/Modelos/inventario/Producto.Model';
import { Categoria } from 'src/app/Modelos/inventario/CategoriaModel';
import { useAnimation } from '@angular/animations';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  // Variable separada para la previsualización de la imagen
  imagenPreview: string = '';

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
  proveedores: any[] = [];
  Pesos: any[] = [];
  impuestos: any[] = [];

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

  producto: Producto = {
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
    impulsacion: '',
    unPe_Descripcion: '',
    unPe_Abreviatura: '',
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
    this.cargarMarcas();
    this.cargarProveedores();
    this.cargarPesos();
    this.cargarImpuestos();
  }

  ngOnInit() {
    this.producto.prod_EsPromo = this.producto.prod_EsPromo || 'N';
    this.producto.prod_PagaImpuesto = this.producto.prod_PagaImpuesto || 'N';
    this.producto.impu_Id = this.producto.impu_Id || 0;
    this.cargarCategorias();
    this.cargarSubcategorias(); // si usas todo el listado para algo
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

  cargarMarcas() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Marcas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.marcas = data;},
      error => {
        console.error('Error al cargar las marcas:', error);
      }
    );
  }

  cargarProveedores() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Proveedor/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.proveedores = data;},
      error => {
        console.error('Error al cargar los proveedores:', error);
      }
    );
  }

  cargarPesos() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/UnidadDePeso/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.Pesos = data;},
      error => {
        console.error('Error al cargar las unidades de peso:', error);
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

  cargarCategorias() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Categorias/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.categorias = data;}, 
      error => {
        console.error('Error al cargar las categorías:', error);
      }
    );
  }

  cargarSubcategorias() {
    this.http.get<Categoria[]>(`${environment.apiBaseUrl}/Subcategoria/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.subcategorias = data;}, 
      error => {
        console.error('Error al cargar las subcategorías:', error);
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
      impulsacion: '',
      unPe_Descripcion: '',
      unPe_Abreviatura: '',
      secuencia: 0,
      code_Status: 0,
      message_Status: '',
    };
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
    if (this.producto.prod_Codigo.trim() && this.producto.prod_Descripcion.trim() && this.producto.prod_DescripcionCorta.trim() && this.producto.marc_Id && this.producto.prov_Id && this.producto.subc_Id
      && this.producto.prod_PrecioUnitario != null && this.producto.prod_PrecioUnitario > 0 && this.producto.prod_Peso >= 0 && this.producto.unPe_Id)
    {
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      const productoGuardar = {
        prod_Id: 0,
        secuencia: 0,
        prod_Codigo: this.producto.prod_Codigo.trim(),
        prod_CodigoBarra: this.producto.prod_CodigoBarra || 'N/A',
        prod_Descripcion: this.producto.prod_Descripcion.trim(),
        prod_DescripcionCorta: this.producto.prod_DescripcionCorta.trim(),
        prod_Imagen: this.producto.prod_Imagen,
        cate_Id: 0,
        cate_Descripcion: '',
        prod_Peso: Number(this.producto.prod_Peso),
        unPe_Id: Number(this.producto.unPe_Id),
        subc_Id: Number(this.producto.subc_Id),
        marc_Id: Number(this.producto.marc_Id),
        prov_Id: Number(this.producto.prov_Id),
        impu_Id: this.producto.prod_PagaImpuesto ? Number(this.producto.impu_Id) : 0,
        prod_PrecioUnitario: Number(this.producto.prod_PrecioUnitario),
        prod_PagaImpuesto: this.producto.prod_PagaImpuesto ? 'S' : 'N',
        prod_EsPromo: 'N',
        prod_Impulsado: this.producto.prod_Impulsado,
        prod_Estado: true,
        usua_Creacion: environment.usua_Id,
        usua_Modificacion: 0,
        marc_Descripcion: '',
        prov_NombreEmpresa: '',
        subc_Descripcion: '',
        impu_Descripcion: '',
        impulsacion: '',
        unPe_Descripcion: '',
        unPe_Abreviatura: '',
        usuarioCreacion: '',
        usuarioModificacion: '',
      };
      console.log(productoGuardar);
      if (this.producto.prod_PagaImpuesto) {
        productoGuardar.impu_Id = Number(this.producto.impu_Id);
      }
      console.log('Datos a enviar:', productoGuardar);
      this.http.post<any>(`${environment.apiBaseUrl}/Productos/Insertar`, productoGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);

          this.mostrarAlertaExito = true;
          this.mensajeExito = `Producto creado exitosamente.`;
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.cancelar();
            this.onSave.emit(response);
          }, 1000);
        },
        error: (error) => {
          console.error('Error HTTP detectado:', error);
          console.error('Error completo:', error);
          if (error.status === 400) {
            console.error('400 Bad Request:', error.error); // posible detalle del error
          }
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el producto. Por favor, revise los datos e intente nuevamente.';
          this.mostrarAlertaExito = false;
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
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
      // Crear una URL temporal para mostrar la imagen inmediatamente
      const tempImageUrl = URL.createObjectURL(file);
      this.imagenPreview = tempImageUrl;
      
      // Mostrar indicador de carga si es necesario
      this.mostrarOverlayCarga = true;
      
      // Usar el servicio de carga de imágenes
      this.imageUploadService.uploadImageAsync(file)
        .then(imagePath => {
          // Guardar solo la ruta relativa en prod_Imagen
          this.producto.prod_Imagen = imagePath;
          // Actualizar la previsualización con la URL completa
          this.imagenPreview = imagePath.includes('https') ? imagePath : environment.apiBaseUrl + imagePath;
          console.log('Imagen subida correctamente:', this.producto.prod_Imagen);
          this.mostrarOverlayCarga = false;
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
}