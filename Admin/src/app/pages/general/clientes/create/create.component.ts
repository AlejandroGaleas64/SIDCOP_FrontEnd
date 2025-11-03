import { Component, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Cliente } from 'src/app/Modelos/general/Cliente.Model';
import { environment } from 'src/environments/environment.prod';
import { ChangeDetectorRef } from '@angular/core';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { MapaSelectorComponent } from '../mapa-selector/mapa-selector.component';
import { Aval } from 'src/app/Modelos/general/Aval.Model';
import { DireccionPorCliente } from 'src/app/Modelos/general/DireccionPorCliente.Model';
import { NgSelectModule } from '@ng-select/ng-select';
import { getUserId } from 'src/app/core/utils/user-utils';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';



@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgxMaskDirective, MapaSelectorComponent, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
  providers: [provideNgxMask()]
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Cliente>();
  @ViewChild('tabsScroll', { static: false }) tabsScroll!: ElementRef<HTMLDivElement>;
  @ViewChild(MapaSelectorComponent)
  mapaSelectorComponent!: MapaSelectorComponent;

  entrando = true;
  activeTab = 1;

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarMapa = false;

  //Arreglos de las Listas
  nacionalidades: any[] = [];
  paises: any[] = [];
  tiposDeVivienda: any[] = [];
  estadosCiviles: any[] = [];
  canales: any[] = [];
  rutas: any[] = [];
  parentescos: any[] = [];
  TodasColonias: any[] = [];
  TodasColoniasAval: any[] = [];
  colonias: any[] = [];
  imgLoaded: boolean = false;

  //Variables para el mapa
  latitudSeleccionada: number | null = null;
  longitudSeleccionada: number | null = null;

  //Estados de carga
  cargando = false;
  cargandoColonias = false;
  cargandoAval = false;
  cargandoColoniasAval = false;


  //Id del cliente obtenido al crear el nuevo cliente
  idDelCliente: number = 0;

  rutasVendedorCache: any[] = [];
String: any;

  scrollToAval(index: number) {
    const container = this.tabsScroll.nativeElement;
    const avalElements = container.querySelectorAll('.aval-tab');

    if (avalElements[index]) {
      const target = avalElements[index] as HTMLElement;
      const offsetLeft = target.offsetLeft;
      const containerWidth = container.clientWidth;

      container.scrollTo({
        left: offsetLeft - containerWidth / 4,
        behavior: 'smooth'
      });
    }
  }

  // Valida que el usuario ingrese un correo válido, aceptando cualquier dominio
  revisarCorreoValido(correo: string): boolean {
    if (!correo) return true;
    // Debe contener "@" y terminar en ".com" y aceptar cualquier dominio
    return /^[\w\.-]+@[\w\.-]+\.[cC][oO][mM]$/.test(correo.trim());
  }

  //Declarado para validar la direccion
  validarDireccion: boolean = false;
  //Validacion para que no se desplace con el tab de arriba
  tabDeArriba(no: number) {
    if (no === this.activeTab) return;

    if (this.activeTab > no) {
      this.activeTab -= 1;
      return
    }

    if (this.activeTab < no) {
      no = this.activeTab;
    }

    // Lógica para la pestaña 1 de los datos personales
    if (no === 1) {
      this.mostrarErrores = true;
      if (
        this.cliente.clie_Nacionalidad.trim() &&
        this.cliente.clie_RTN.trim() &&
        this.cliente.clie_Nombres.trim() &&
        this.cliente.clie_Apellidos.trim() &&
        this.cliente.esCv_Id &&
        this.cliente.clie_FechaNacimiento &&
        this.cliente.tiVi_Id &&
        this.cliente.clie_Telefono.trim()
      ) {
        this.mostrarErrores = false;
        this.activeTab = 2;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Por favor, complete todos los campos obligatorios de los Datos Personales.';
        setTimeout(() => {
          this.mostrarAlertaWarning = false;
          this.mensajeWarning = '';
        }, 3000);
      }
      return;
    }

    // Lógica para la pestaña 2 de los datos del negocio
    if (no === 2) {
      this.mostrarErrores = true;
      if (
        this.cliente.clie_NombreNegocio.trim() &&
        this.cliente.clie_ImagenDelNegocio.trim() &&
        this.cliente.ruta_Id &&
        this.cliente.cana_Id &&
        this.direccionesPorCliente.length > 0
      ) {
        this.mostrarErrores = false;
        this.activeTab = 3;
      } else {
        this.validarDireccion = true;
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Por favor, complete todos los campos obligatorios del negocio.';
        setTimeout(() => {
          this.mostrarAlertaWarning = false;
          this.mensajeWarning = '';
        }, 3000);
      }
      return;
    }

    // Lógica para la pestaña 3 de los datos de crédito
    if (no === 3) {
      this.mostrarErrores = true;
      if (
        (!this.cliente.clie_LimiteCredito && !this.cliente.clie_DiasCredito) ||
        (this.cliente.clie_LimiteCredito && this.cliente.clie_DiasCredito)
      ) {
        this.mostrarErrores = false;
        this.activeTab = 4;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Complete correctamente los datos de crédito.';
        setTimeout(() => {
          this.mostrarAlertaWarning = false;
          this.mensajeWarning = '';
        }, 3000);
      }
      return;
    }

    // Lógica para datos de crédito para caso que el cliente solicita crédito
    if (no === 4) {
      this.mostrarErrores = true;
      if (this.tieneDatosCredito()) {
        if (this.avales.length > 0 && this.avales.every(aval => this.esAvalValido(aval))) {
          this.mostrarErrores = false;
          this.activeTab = 5;
        } else {
          this.mostrarAlertaWarning = true;
          this.mensajeWarning = 'Por favor complete correctamente todos los registros de Aval.';
          setTimeout(() => {
            this.mostrarAlertaWarning = false;
            this.mensajeWarning = '';
          }, 3000);
        }
      } else {
        this.mostrarErrores = false;
        this.activeTab = 5;
      }
      return;
    }
  }

  //Es una funcion creada para el if 4 que es de corroborar
  //que haya un credito para que el aval sea obligatorio
  // tieneDatosCredito(): boolean {
  //   return (
  //     !!this.cliente.clie_LimiteCredito &&
  //     !!this.cliente.clie_DiasCredito
  //   );
  // }
  tieneDatosCredito(): boolean {
    const limite = Number(this.cliente?.clie_LimiteCredito ?? 0);
    const dias = Number(this.cliente?.clie_DiasCredito ?? 0);
    return limite > 0 && dias > 0;
  }

  //Verifica si el aval es valido- Si nungo campo este vacio
  esAvalValido(aval: Aval): boolean {
    let fechaValida = false;
    if (aval.aval_FechaNacimiento) {
      const fecha = typeof aval.aval_FechaNacimiento === 'string'
        ? new Date(aval.aval_FechaNacimiento)
        : aval.aval_FechaNacimiento;
      fechaValida = fecha instanceof Date && !isNaN(fecha.getTime());
    }

    return (
      typeof aval.aval_DNI === 'string' && aval.aval_DNI.trim().length > 0 &&
      !isNaN(Number(aval.pare_Id)) && Number(aval.pare_Id) > 0 &&
      typeof aval.aval_Nombres === 'string' && aval.aval_Nombres.trim().length > 0 &&
      typeof aval.aval_Apellidos === 'string' && aval.aval_Apellidos.trim().length > 0 &&
      !isNaN(Number(aval.esCv_Id)) && Number(aval.esCv_Id) > 0 &&
      typeof aval.aval_Telefono === 'string' && aval.aval_Telefono.trim().length > 0 &&
      !isNaN(Number(aval.tiVi_Id)) && Number(aval.tiVi_Id) > 0 &&
      !isNaN(Number(aval.colo_Id)) && Number(aval.colo_Id) > 0 &&
      typeof aval.aval_DireccionExacta === 'string' && aval.aval_DireccionExacta.trim().length > 0 &&
      fechaValida
    );
  }

  get avalesValidos(): boolean {
    return this.avales.length > 0 && this.avales.every(aval => this.esAvalValido(aval));
  }

  //Parametros para evaluar antes de pasar al siguiente tabulador
  tabuladores(no: number) {
    if (no == 1) {
      this.mostrarErrores = true
      if (this.cliente.clie_Nacionalidad.trim() && this.cliente.clie_Nombres.trim() &&
        this.cliente.clie_Apellidos.trim() && this.cliente.esCv_Id &&
        this.cliente.tiVi_Id &&
        this.cliente.clie_Telefono.trim()) {
        this.mostrarErrores = false;
        this.activeTab = 2;
      }
      else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Por favor, complete todos los campos obligatorios.';
        setTimeout(() => {
          this.mostrarAlertaWarning = false;
          this.mensajeWarning = '';
        }, 3000);
      }
    }

    if (no == 2) {
      this.mostrarErrores = true;
      if (
        this.cliente.clie_NombreNegocio.trim() &&
        this.cliente.clie_ImagenDelNegocio.trim() &&
        this.cliente.ruta_Id &&
        this.cliente.cana_Id &&
        this.direccionesPorCliente.length > 0
      ) {
        this.mostrarErrores = false;
        this.activeTab = 3;
      } else {
        this.validarDireccion = this.direccionesPorCliente.length === 0;
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Por favor, complete todos los campos obligatorios del negocio.';
        setTimeout(() => {
          this.mostrarAlertaWarning = false;
          this.mensajeWarning = '';
        }, 3000);
      }
    }

    if (no == 3) {
      if (this.cliente.clie_LimiteCredito && this.cliente.clie_DiasCredito) {
        this.mostrarErrores = false;
        this.activeTab = 4;
      }
      if (!this.cliente.clie_LimiteCredito && !this.cliente.clie_DiasCredito) {
        this.mostrarErrores = false;
        this.activeTab = 4;
      }
      else {
        if (this.cliente.clie_LimiteCredito) {
          if (this.cliente.clie_DiasCredito) {
            this.mostrarErrores = false;
            this.activeTab = 4;
          } else {
            this.mostrarAlertaWarning = true;
            this.mensajeWarning = 'Los Dias del Credito son obligatorios si asigno un crédito.';
            setTimeout(() => {
              this.mostrarAlertaWarning = false;
              this.mensajeWarning = '';
            }, 3000);
          }
        }
        if (this.cliente.clie_DiasCredito) {
          if (this.cliente.clie_LimiteCredito) {
            this.mostrarErrores = false;
            this.activeTab = 4;
          } else {
            this.mostrarAlertaWarning = true;
            this.mensajeWarning = 'Se asigno Dias de Credito, pero no un crédito.';
            setTimeout(() => {
              this.mostrarAlertaWarning = false;
              this.mensajeWarning = '';
            }, 3000);
          }
        }
      }
    }

    if (no == 4) {
      this.mostrarErrores = true;
      if (this.tieneDatosCredito()) {
        if (this.avales.length > 0 && this.avales.every(aval => this.esAvalValido(aval))) {
          this.mostrarErrores = false;
          this.activeTab = 5;
        } else {
          this.mostrarErrores = true;
          this.mostrarAlertaWarning = true;
          this.mensajeWarning = 'Por favor complete correctamente todos los registros de Aval.';
          setTimeout(() => {
            this.mostrarAlertaWarning = false;
            this.mensajeWarning = '';
          }, 3000);
        }
      }
      else {
        this.mostrarErrores = false;
        this.activeTab = 5;
      }
    }

    if (no == 5) {
      this.mostrarErrores = false;
    }
  }

  trackByIndex(index: number) { return index; }

  // Longitud y latitud seleccionadas
  onCoordenadasSeleccionadas(coords: { lat: number, lng: number }) {
    this.direccionPorCliente.diCl_Latitud = coords.lat;
    this.direccionPorCliente.diCl_Longitud = coords.lng;
    this.cdr.detectChanges();
  }

  coordenadaPrevia: { lat: number, lng: number } | null = null;
  abrirMapa() {
    this.mostrarMapa = true;
    setTimeout(() => {
      this.mapaSelectorComponent.inicializarMapa();
    }, 300);
  }

  cerrarMapa() {
    this.mostrarMapa = false;
    this.direccionPorCliente = {
      diCl_Id: 0,
      clie_Id: 0,
      colo_Id: 0,
      colo_Descripcion: '',
      diCl_DireccionExacta: '',
      diCl_Observaciones: '',
      diCl_Latitud: 0,
      diCl_Longitud: 0,
      muni_Descripcion: '',
      depa_Descripcion: '',
      usua_Creacion: 0,
      diCl_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      diCl_FechaModificacion: new Date()
    }
  }

  cerrarFormularioMapa(): void {
    this.mostrarMapa = false;
  }

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private imageUploadService: ImageUploadService
  ) {
    this.cargarPaises();
    this.cargarTiposDeVivienda();
    this.cargarEstadosCiviles();
    this.cargarCanales();
    this.cargarRutas();
    this.cargarParentescos();
    this.cargarColoniasCliente();
    this.cargarColoniasAval();
    this.cargarColonias();
  }

  cargarPaises() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Pais/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(
      data => this.paises = data,
    );
  }

  cargarTiposDeVivienda() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/TipoDeVivienda/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.tiposDeVivienda = data);
  }

  cargarEstadosCiviles() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/EstadosCiviles/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.estadosCiviles = data);
  }

  cargarCanales() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Canal/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.canales = data);
  }

  cargarRutas() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Rutas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.rutas = data);
  }

  cargarParentescos() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Parentesco/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.parentescos = data);
  }

  cargarColoniasCliente() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Colonia/ListarMunicipiosyDepartamentos`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.TodasColonias = data);
  }

  cargarColoniasAval() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Colonia/ListarMunicipiosyDepartamentos`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.TodasColoniasAval = data);

  }

  cargarColonias() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.colonias = data);
  }


  ngOnInit(): void {
    // cargar la cache de rutas↔días desde Vendedores una sola vez
    this.loadRutasVendedoresCache();
    this.ensureInicialAval();
  }

  private loadRutasVendedoresCache(): void {
    const url = `${environment.apiBaseUrl}/Vendedores/ListarPorRutas`;
    console.log('[Clientes] solicitando cache Vendedores/ListarPorRutas ->', url);
    this.http.get<any[]>(url, { headers: { 'x-api-key': environment.apiKey } }).subscribe({
      next: (res) => {
        console.log('[Clientes] respuesta ListarPorRutas:', res);
        // adaptarse al formato real: si viene envuelto en { data: [...] } o directamente array
        if (Array.isArray(res)) {
          this.rutasVendedorCache = res;
        } else if (res && Array.isArray((res as any).data)) {
          this.rutasVendedorCache = (res as any).data;
        } else {
          // intentar mapear si viene en otra estructura
          this.rutasVendedorCache = (res && (res as any).list) || [];
        }
      },
      error: (err) => {
        console.warn('[Clientes] error al cargar ListarPorRutas:', err);
        this.rutasVendedorCache = [];
      }
    });
  }



  obtenerDescripcionColonia(colo_Id: number): string {
    const colonia = this.colonias.find(c => c.colo_Id === colo_Id);
    return colonia?.colo_Descripcion || 'Colonia no encontrada';
  }

  //Para buscar colonias en DDL
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  busquedaColonia: string = '';
  coloniasFiltradas: any[] = [];
  filtrarColonias() {
    const term = this.busquedaColonia.trim().toLowerCase();
    if (!term) {
      this.coloniasFiltradas = this.TodasColonias;
    } else {
      this.coloniasFiltradas = this.TodasColonias.filter(colonia =>
        this.searchColonias(term, colonia)
      );
    }
  }

  direccionExactaInicial: string = '';

  onColoniaSeleccionada(colo_Id: number) {
    const coloniaSeleccionada = this.colonias.find((c: any) => c.colo_Id === colo_Id);
    if (coloniaSeleccionada) {
      this.direccionExactaInicial = coloniaSeleccionada.colo_Descripcion;
      this.direccionPorCliente.diCl_DireccionExacta = coloniaSeleccionada.colo_Descripcion;
    } else {
      this.direccionExactaInicial = '';
      this.direccionPorCliente.diCl_DireccionExacta = '';
    }
  }

  cliente: Cliente = {
    clie_Id: 0,
    clie_Codigo: '',
    clie_Nacionalidad: '',
    pais_Descripcion: '',
    clie_DNI: '',
    clie_RTN: '',
    clie_Nombres: '',
    clie_Apellidos: '',
    clie_NombreNegocio: '',
    clie_ImagenDelNegocio: '',
    clie_Telefono: '',
    clie_Correo: '',
    clie_Sexo: 'M',
    clie_FechaNacimiento: null,
    tiVi_Id: 0,
    tiVi_Descripcion: '',
    cana_Id: 0,
    cana_Descripcion: '',
    esCv_Id: 0,
    esCv_Descripcion: '',
    ruta_Id: 0,
    ruta_Descripcion: '',
    clie_DiaVisita: '',
    clie_LimiteCredito: 0.00,
    clie_DiasCredito: 0,
    clie_Saldo: 0,
    clie_Vencido: true,
    clie_Observaciones: '',
    clie_ObservacionRetiro: '',
    clie_Confirmacion: true,
    clie_Estado: true,
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    clie_FechaCreacion: new Date(),
    clie_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuaC_Nombre: '',
    usuaM_Nombre: ''
  };

  direccionesPorCliente: DireccionPorCliente[] = [];
  direccionPorCliente: DireccionPorCliente = {
    diCl_Id: 0,
    clie_Id: 0,
    colo_Id: 0,
    colo_Descripcion: '',
    diCl_DireccionExacta: '',
    diCl_Observaciones: '',
    diCl_Latitud: 0,
    diCl_Longitud: 0,
    muni_Descripcion: '',
    depa_Descripcion: '',
    usua_Creacion: 0,
    diCl_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    diCl_FechaModificacion: new Date(),
  };
  direccionEditandoIndex: number | null = null;

  avales: Aval[] = [this.nuevoAval()];
  avalActivoIndex: number = 0;
  nuevoAval(): Aval {
    return {
      aval_Id: 0,
      clie_Id: 0,
      aval_Nombres: '',
      aval_Apellidos: '',
      pare_Id: 0,
      aval_DNI: '',
      aval_Telefono: '',
      tiVi_Id: 0,
      aval_Observaciones: '',
      aval_DireccionExacta: '',
      colo_Id: 0,
      aval_FechaNacimiento: null,
      esCv_Id: 0,
      aval_Sexo: 'M',
      pare_Descripcion: '',
      esCv_Descripcion: '',
      tiVi_Descripcion: '',
      muni_Descripcion: '',
      depa_Descripcion: '',
      usua_Creacion: getUserId(),
      usuarioCreacion: '',
      aval_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      usuarioModificacion: '',
      aval_FechaModificacion: new Date()
    };
  };

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.cliente = {
      clie_Id: 0,
      clie_Codigo: '',
      clie_Nacionalidad: '',
      pais_Descripcion: '',
      clie_DNI: '',
      clie_RTN: '',
      clie_Nombres: '',
      clie_Apellidos: '',
      clie_NombreNegocio: '',
      clie_ImagenDelNegocio: '',
      clie_Telefono: '',
      clie_Correo: '',
      clie_Sexo: 'M',
      clie_FechaNacimiento: new Date(),
      tiVi_Id: 0,
      tiVi_Descripcion: '',
      cana_Id: 0,
      cana_Descripcion: '',
      esCv_Id: 0,
      esCv_Descripcion: '',
      ruta_Id: 0,
      ruta_Descripcion: '',
      clie_DiaVisita: '',
      clie_LimiteCredito: 0,
      clie_DiasCredito: 0,
      clie_Saldo: 0,
      clie_Vencido: true,
      clie_Observaciones: '',
      clie_ObservacionRetiro: '',
      clie_Confirmacion: true,
      clie_Estado: true,
      usua_Creacion: 0,
      usua_Modificacion: 0,
      secuencia: 0,
      clie_FechaCreacion: new Date(),
      clie_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuaC_Nombre: '',
      usuaM_Nombre: '',
    };
    this.direccionesPorCliente = [];
    this.avales = [];
    this.activeTab = 1;
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

  // Variables para manejo de imágenes
  uploadedFiles: string[] = [];
  isUploading = false;
  imagePreview: string = '';

  onImagenSeleccionada(event: any) {
    const file = event.target.files[0];

    if (file) {
      // Crear vista previa inmediata
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);

      this.isUploading = true;
      this.imageUploadService.uploadImageAsync(file)
        .then(imagePath => {
          this.cliente.clie_ImagenDelNegocio = imagePath;
          this.uploadedFiles = [imagePath];
          this.isUploading = false;
          // Limpiar preview ya que ahora tenemos la imagen del servidor
          this.imagePreview = '';
        })
        .catch(error => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al subir la imagen. Por favor, intente nuevamente.';
          this.isUploading = false;
          // Mantener preview en caso de error
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 3000);
        });
    }
  }

  /**
   * Construye la URL completa para mostrar la imagen
   */
  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
  }

  /**
   * Obtiene la imagen a mostrar (la subida o la por defecto)
   */
  getImageToDisplay(): string {
    // Si hay una vista previa temporal, mostrarla
    if (this.imagePreview) {
      return this.imagePreview;
    }
    // Si hay imagen guardada en el servidor, mostrarla
    if (this.cliente.clie_ImagenDelNegocio && this.cliente.clie_ImagenDelNegocio.trim()) {
      return this.getImageDisplayUrl(this.cliente.clie_ImagenDelNegocio);
    }
    // Mostrar imagen por defecto
    return 'assets/images/users/32/user-svg.svg';
  }

  /**
   * Elimina una imagen de la lista
   */
  removeImage(index: number): void {
    this.uploadedFiles.splice(index, 1);
    if (this.uploadedFiles.length === 0) {
      this.cliente.clie_ImagenDelNegocio = '';
      this.imagePreview = '';
    }
  }

  generarCodigoClientePorRuta(ruta_Id: number): void {
    const ruta = this.rutas.find(r => r.ruta_Id === +ruta_Id);
    const codigoRuta = ruta?.ruta_Codigo
      ? ruta.ruta_Codigo.replace(/^RT-/, '')
      : ruta_Id.toString().padStart(3, '0');
    this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(clientes => {
      const clientesRuta = clientes.filter(c => c.ruta_Id === +ruta_Id);
      let maxCorrelativo = 0;

      clientesRuta.forEach(c => {
        const match = c.clie_Codigo?.match(/CLIE-RT-\d{3}-(\d{6})/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxCorrelativo) maxCorrelativo = num;
        }
      });
      const siguiente = (maxCorrelativo + 1).toString().padStart(6, '0');
      this.cliente.clie_Codigo = `CLIE-RT-${codigoRuta}-${siguiente}`;
    });
  }


  //Aquí
    ensureInicialAval(): void {
    try {
      if (!Array.isArray(this.avales)) {
        this.avales = [];
      }
      if (this.avales.length === 0) {
        // usar la misma estructura que usa agregarAval() — aquí un objeto vacío por defecto
        const avalNuevo = {
          aval_Id: 0,
      clie_Id: 0,
      aval_Nombres: '',
      aval_Apellidos: '',
      pare_Id: 0,
      aval_DNI: '',
      aval_Telefono: '',
      tiVi_Id: 0,
      aval_Observaciones: '',
      aval_DireccionExacta: '',
      colo_Id: 0,
      aval_FechaNacimiento: null,
      esCv_Id: 0,
      aval_Sexo: 'M',
      pare_Descripcion: '',
      esCv_Descripcion: '',
      tiVi_Descripcion: '',
      muni_Descripcion: '',
      depa_Descripcion: '',
      usua_Creacion: getUserId(),
      usuarioCreacion: '',
      aval_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      usuarioModificacion: '',
      aval_FechaModificacion: new Date()
        };
        this.avales.push(avalNuevo);
        this.avalActivoIndex = 0;
      }
    } catch (e) {
      console.warn('ensureInicialAval error', e);
    }
  }


  guardarCliente(): void {
    this.mostrarErrores = true;

    if (this.tieneDatosCredito() && (!Array.isArray(this.avales) || this.avales.length === 0)) {
      this.mostrarErrores = true;
      this.mensajeWarning = 'Si solicita crédito, debe agregar al menos un aval.';
      this.mostrarAlertaWarning = true;
      this.activeTab = 4; // llevar al usuario a la pestaña Aval
      return;
    }

    if (this.entrando) {
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      const clienteGuardar = {
        // clie_Id: 0,
        clie_Codigo: this.cliente.clie_Codigo.trim(),
        clie_Nacionalidad: this.cliente.clie_Nacionalidad,
        pais_Descripcion: this.cliente.pais_Descripcion || '',
        clie_DNI: this.cliente.clie_DNI.trim(),
        clie_RTN: this.cliente.clie_RTN.trim(),
        clie_Nombres: this.cliente.clie_Nombres.trim(),
        clie_Apellidos: this.cliente.clie_Apellidos.trim(),
        clie_NombreNegocio: this.cliente.clie_NombreNegocio.trim(),
        clie_ImagenDelNegocio: this.cliente.clie_ImagenDelNegocio,
        clie_Telefono: this.cliente.clie_Telefono.trim(),
        clie_Correo: this.cliente.clie_Correo.trim() || '',
        clie_Sexo: this.cliente.clie_Sexo,
         clie_FechaNacimiento: this.cliente.clie_FechaNacimiento 
      ? new Date(this.cliente.clie_FechaNacimiento).toISOString().split('T')[0]
      : null,
        tiVi_Id: this.cliente.tiVi_Id,
        tiVi_Descripcion: this.cliente.tiVi_Descripcion || '',
        cana_Id: this.cliente.cana_Id,
        cana_Descripcion: this.cliente.cana_Descripcion || '',
        esCv_Id: this.cliente.esCv_Id,
        esCv_Descripcion: this.cliente.esCv_Descripcion || '',
        ruta_Id: this.cliente.ruta_Id,
        ruta_Descripcion: this.cliente.ruta_Descripcion || '',
        clie_DiaVisita: this.cliente.clie_DiaVisita.toString() || '',
        clie_LimiteCredito: this.cliente.clie_LimiteCredito || 0,
        clie_DiasCredito: this.cliente.clie_DiasCredito || 0,
        clie_Saldo: this.cliente.clie_Saldo || 0,
        clie_Vencido: false,
        clie_Observaciones: this.cliente.clie_Observaciones.trim() || '',
        clie_ObservacionRetiro: this.cliente.clie_ObservacionRetiro.trim() || '',
        clie_Confirmacion: this.cliente.clie_Confirmacion,
        clie_Estado: true,
        usua_Creacion: getUserId(),
        // usua_Modificacion: getUserId(),
        // secuencia: 0,
        clie_FechaCreacion: this.cliente.clie_FechaCreacion 
      ? new Date(this.cliente.clie_FechaCreacion).toISOString().split('T')[0]
      : null,
        // clie_FechaModificacion: this.cliente.clie_FechaModificacion
      // ? new Date(this.cliente.clie_FechaModificacion).toISOString().split('T')[0]
      // : null,
        // code_Status: 0,
        // message_Status: '',
        // usuaC_Nombre: '',
        // usuaM_Nombre: ''
      }
      const direccionGuardar = this.direccionesPorCliente.map(direccion => ({
        diCl_Id: direccion.diCl_Id,
        clie_Id: direccion.clie_Id,
        colo_Id: direccion.colo_Id,
        diCl_DireccionExacta: direccion.diCl_DireccionExacta.trim(),
        diCl_Observaciones: direccion.diCl_Observaciones.trim(),
        diCl_Latitud: direccion.diCl_Latitud,
        diCl_Longitud: direccion.diCl_Longitud,
        colo_Descripcion: direccion.colo_Descripcion,
        muni_Descripcion: direccion.muni_Descripcion,
        depa_Descripcion: direccion.depa_Descripcion,
        usua_Creacion: getUserId(),
        diCl_FechaCreacion: new Date(),
        usua_Modificacion: getUserId(),
        diCl_FechaModificacion: new Date(),
        secuencia: 0
      }));
      console.log('Datos a enviar:', clienteGuardar, direccionGuardar);
      console.log('JSON:', JSON.stringify(clienteGuardar,  null, 2));
      this.http.post<any>(`${environment.apiBaseUrl}/Cliente/Insertar`, clienteGuardar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if (response.data.code_Status === -1) {
            this.mostrarAlertaError = true;
            this.mensajeError = response.data.message_Status;
            this.activeTab = 1;
            this.cliente.clie_Codigo = '';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
              this.cancelar();
            }, 3000);
            return;
          }
          if (response.data.data) {
            this.idDelCliente = response.data.data;
            this.guardarDireccionesPorCliente(this.idDelCliente);
            this.guardarAvales(this.idDelCliente);
            this.mensajeExito = `Cliente "${this.cliente.clie_Nombres + ' ' + this.cliente.clie_Apellidos}" guardado exitosamente`;
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;
            this.onSave.emit(this.cliente);
          }
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el Cliente. Por favor, intente nuevamente.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 3000);
          console.error('Error al guardar el Cliente:', error);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor, complete todos los campos obligatorios.';
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 3000);
    }
  }

  agregarDireccion() {
    this.mostrarErrores = true;
    if (!this.direccionPorCliente.diCl_Longitud && !this.direccionPorCliente.diCl_Latitud) {
      this.mostrarErrores = true;
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor, seleccione una ubicación en el mapa.';
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 3000);
      return;
    }
    if (this.direccionPorCliente.diCl_DireccionExacta.trim() && this.direccionPorCliente.colo_Id && this.direccionPorCliente.diCl_Observaciones) {
      this.mostrarErrores = false;
      const colonia = this.TodasColonias.find(c => c.colo_Id == this.direccionPorCliente.colo_Id);
      this.direccionPorCliente.muni_Descripcion = colonia ? colonia.colo_Descripcion : '';
      this.direccionPorCliente.muni_Descripcion += ', ';
      this.direccionPorCliente.muni_Descripcion += colonia ? colonia.muni_Descripcion : '';
      this.direccionPorCliente.muni_Descripcion += ', ';
      this.direccionPorCliente.muni_Descripcion += colonia ? colonia.depa_Descripcion : '';

      if (this.direccionEditandoIndex !== null) {
        this.direccionesPorCliente[this.direccionEditandoIndex] = { ...this.direccionPorCliente };
        this.direccionEditandoIndex = null;
      } else {
        this.direccionesPorCliente.push({ ...this.direccionPorCliente });
        this.limpiarDireccionModal();
      }
      // this.limpiarDireccionModal();
      this.cerrarMapa();
      this.validarDireccion = false;
    }
    else {
      this.mostrarErrores = true;
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor, complete todos los campos obligatorios de la dirección.';
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 3000);
      return;
    }
  }

  editarDireccion(index: number) {
    this.direccionEditandoIndex = index;
    this.direccionPorCliente = { ...this.direccionesPorCliente[index] };
    this.mostrarMapa = true;
    setTimeout(() => {
      this.mapaSelectorComponent.inicializarMapa();
    }, 300);
  }

  eliminarDireccion(index: number) {
    this.direccionesPorCliente.splice(index, 1);
  }

  limpiarDireccionModal() {
    this.direccionPorCliente = {
      diCl_Id: 0,
      clie_Id: 0,
      colo_Id: 0,
      colo_Descripcion: '',
      diCl_DireccionExacta: '',
      diCl_Observaciones: '',
      diCl_Latitud: 0,
      diCl_Longitud: 0,
      muni_Descripcion: '',
      depa_Descripcion: '',
      usua_Creacion: 0,
      diCl_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      diCl_FechaModificacion: new Date(),
    };
  }

  guardarDireccionesPorCliente(clie_Id: number): void {
    for (const direccion of this.direccionesPorCliente) {
      const direccionPorClienteGuardar = {
        ...direccion,
        colo_Descripcion: direccion?.colo_Descripcion || '',
        clie_Id: clie_Id,
        usua_Creacion: getUserId(),
        diCl_FechaCreacion: new Date(),
        usua_Modificacion: getUserId(),
        diCl_FechaModificacion: new Date()
      };
      this.http.post<any>(`${environment.apiBaseUrl}/DireccionesPorCliente/Insertar`, direccionPorClienteGuardar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar la dirección del Cliente. Por favor, intente nuevamente.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 3000);
        }
      });
    }
  }

  agregarAval() {
    this.avales.push(this.nuevoAval());
    this.avalActivoIndex = this.avales.length - 1;
  }

  eliminarAval(index: number) {
    this.avales.splice(index, 1);
    if (this.avalActivoIndex >= this.avales.length) {
      this.avalActivoIndex = this.avales.length - 1;
    }
  }

  seleccionarAval(index: number) {
    this.avalActivoIndex = index;
  }

  cambiarAval(direccion: number) {
    const nuevoIndex = this.avalActivoIndex + direccion;

    if (nuevoIndex >= 0 && nuevoIndex < this.avales.length) {
      this.avalActivoIndex = nuevoIndex;
      this.scrollToAval(nuevoIndex);
    }
  }

  guardarAvales(clie_Id: number): void {
    // Solo guardar si el cliente tiene crédito y hay avales válidos
    if (this.tieneDatosCredito() && this.avales.length > 0 && this.avales.every(aval => this.esAvalValido(aval))) {
      for (const aval of this.avales) {
        const avalGuardar = {
          Aval_Id: aval.aval_Id,
          Clie_Id: clie_Id,
          Aval_Nombres: aval.aval_Nombres,
          Aval_Apellidos: aval.aval_Apellidos,
          Aval_Sexo: aval.aval_Sexo,
          Pare_Id: aval.pare_Id,
          Aval_DNI: aval.aval_DNI,
          Aval_Telefono: aval.aval_Telefono,
          TiVi_Id: aval.tiVi_Id,
          Aval_Observaciones: aval.aval_Observaciones || '',
          Aval_DireccionExacta: aval.aval_DireccionExacta,
          Colo_Id: aval.colo_Id,
          Aval_FechaNacimiento: aval.aval_FechaNacimiento,
          EsCv_Id: aval.esCv_Id,
          Pare_Descripcion: '',
          EsCv_Descripcion: '',
          Colo_Descripcion: '',
          Depa_Descripcion: '',
          TiVi_Descripcion: '',
          Usua_Creacion: getUserId(),
          Aval_FechaCreacion: aval.aval_FechaCreacion,
          Usua_Modificacion: getUserId(),
          Aval_FechaModificacion: new Date(),
          Aval_Estado: true,
        };
        this.http.post<any>(`${environment.apiBaseUrl}/Aval/Insertar`, avalGuardar, {
          headers: {
            'X-Api-Key': environment.apiKey,
            'Content-Type': 'application/json',
            'accept': '*/*'
          }
        }).subscribe({
          next: (response) => { },
          error: (error) => {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar el aval. Por favor, intente nuevamente.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 3000);
          }
        });
      }
    }
  }

  formatearLimiteCredito() {
    let valor = this.cliente.clie_LimiteCredito;

    if (valor === null || valor === undefined || isNaN(valor)) {
      this.cliente.clie_LimiteCredito = 0.00;
    } else {
      // Redondear a dos decimales correctamente
      this.cliente.clie_LimiteCredito = Math.round(valor * 100) / 100;
    }
  }

  //Buscador de direcciones en el mapa
  getInputValue(event: Event): string {
    return (event.target as HTMLInputElement)?.value || '';
  }

  buscarDireccion(query: string) {
    if (this.mapaSelectorComponent) {
      this.mapaSelectorComponent.buscarDireccion(query);
    }
  }

  //Llenar autompaticamente colonias al seleccionar un punto en el mapa
  coordenadasMapa: { lat: number; lng: number } | null = null;

  actualizarCoordenadasManual() {
    if (this.direccionPorCliente.diCl_Latitud && this.direccionPorCliente.diCl_Longitud) {
      this.coordenadasMapa = {
        lat: Number(this.direccionPorCliente.diCl_Latitud),
        lng: Number(this.direccionPorCliente.diCl_Longitud)
      };

      if (this.mapaSelectorComponent) {
        this.mapaSelectorComponent.setMarker(this.coordenadasMapa.lat, this.coordenadasMapa.lng);
      }
    }
  }


  diasSemana = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' },
    { id: 6, nombre: 'Sábado' },
    { id: 7, nombre: 'Domingo' }
  ];

  // Opciones que alimentan el ng-select de "Día de Visita"
  diasDisponibles: Array<{ id: number; nombre: string }> = [];

  rutasDisponibles: any[] = [];
  rutasTodas: any[] = [];
  rutasVendedor: { ruta_Id: number | null, diasSeleccionados: number[], veRu_Dias: string }[] = [
    { ruta_Id: null, diasSeleccionados: [], veRu_Dias: '' }
  ];
   // Verificar rutas y días
    // (Nota: estas transformaciones deben ejecutarse dentro de un método en tiempo de ejecución;
    // mover la lógica aquí para evitar declarar 'const' a nivel de clase)
    private mapRutasDesdeOriginal(original: any, rutasVendedor: any[] = []): Array<{ ruta_Id: number; ruta_Descripcion?: string; diasSeleccionados: any[] }> {
      const rutasOriginales = Array.isArray(original?.rutas) ? original.rutas : [];
      const rutasNuevas = (rutasVendedor || []).map(rv => ({
        ruta_Id: rv.ruta_Id as number,
        ruta_Descripcion: (this.rutasTodas || this.rutasDisponibles || []).find((r: any) => Number(r.ruta_Id ?? r.id) === Number(rv.ruta_Id))?.ruta_Descripcion,
        diasSeleccionados: Array.isArray(rv.diasSeleccionados) ? rv.diasSeleccionados : (rv.veRu_Dias ? String(rv.veRu_Dias).split(',').map((x: string) => Number(x)).filter(n => !isNaN(n)) : [])
      }));
      // devuelve las rutas nuevas calculadas (las originales se conservan si es necesario)
      return rutasNuevas;
    }
    
  private formatearDias = (dias: any[]): string => {
      if (!dias || !dias.length) return 'Sin días';
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return dias.map(d => {
        if (typeof d === 'object' && d !== null && 'nombre' in d) {
          return (d as any).nombre;
        }
        return diasSemana[Number(d)] || d;
      }).join(', ');
    };
    

    // ...existing code...
  /**
   * Llama al endpoint Cliente/DiasDisponibles/{rutaId} y normaliza la respuesta
   * Soporta: CSV string ("1,2"), array de números, array de objetos {id,nombre}, o { data: [...] }
   */

   private mergeVeruDiasFromPayload(payload: any): number[] {
    const addNumsFrom = (src: any, set: Set<number>) => {
      if (src == null) return;
      if (typeof src === 'number') {
        if (!isNaN(src)) set.add(Number(src));
        return;
      }
      if (typeof src === 'string') {
        // soporta CSV y multilinea
        const lines = src.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        for (const line of lines) {
          line.split(',').map(s => s.trim()).forEach(part => {
            const n = Number(part);
            if (!isNaN(n)) set.add(n);
          });
        }
        return;
      }
      if (Array.isArray(src)) {
        for (const it of src) addNumsFrom(it, set);
        return;
      }
      if (typeof src === 'object') {
        // prioridades de campos que suelen traer días
        const candidate = src.veru_Dias ?? src.veRu_Dias ?? src.dias ?? src.diasDisponibles ?? src.value ?? '';
        addNumsFrom(candidate, set);
      }
    };

    const resultSet = new Set<number>();
    if (payload == null) return [];
    // payload puede ser un objeto que contiene varias filas (ej. { data: [...] }) o un array de filas
    if (Array.isArray(payload)) {
      for (const row of payload) addNumsFrom(row, resultSet);
    } else if (typeof payload === 'object') {
      // si trae .data con array, usarlo
      if (Array.isArray((payload as any).data)) {
        for (const row of (payload as any).data) addNumsFrom(row, resultSet);
      } else {
        addNumsFrom(payload, resultSet);
      }
    } else {
      addNumsFrom(payload, resultSet);
    }

    const arr = Array.from(resultSet.values()).filter(n => !isNaN(n));
    return arr.sort((a, b) => a - b);
  }
  public fetchDiasDisponiblesCliente(veruId: number): void {
    console.log('[Clientes] fetchDiasDisponiblesCliente veruId:', veruId);
    if (!veruId) { this.diasDisponibles = []; return; }
    const url = `${environment.apiBaseUrl}/Cliente/DiasDisponibles/${veruId}`;
    this.http.get<any>(url, { headers: { 'x-api-key': environment.apiKey } }).subscribe({
      next: (res) => {
        let payload = res && res.data ? res.data : res;
        try {
          console.log('dias: ', payload);
          // string CSV -> ids
 

            const ids = this.mergeVeruDiasFromPayload(payload);
            console.log('dias con merge', ids);
             this.diasDisponibles = this.diasSemana.filter(d => ids.includes(d.id));
   
            this.cdr.detectChanges();
            return;
   
         
          
        } catch (err) {
          console.warn('[Clientes] error normalizando diasDisponibles desde API', err);
        }
        // fallback: vacío
        this.diasDisponibles = [];
 
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('[Clientes] fetchDiasDisponiblesCliente error:', err);
        // no interrumpir flujo; dejar que la lógica local intente extraer días
        this.diasDisponibles = [];
      }
    });
  }
  
}

